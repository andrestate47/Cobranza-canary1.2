import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getEcuadorDayRange } from "@/lib/date-utils"

export const dynamic = "force-dynamic"

function esDiaDePago(tipoPago: string, fechaInicio: Date, fechaEvaluar: Date): boolean {
  const inicio = new Date(fechaInicio)
  const evaluar = new Date(fechaEvaluar)
  
  // Normalizar a fechas sin hora (12:00:00 UTC) para evitar desfases de zona horaria
  const inicioUTC = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate(), 12, 0, 0)
  const evaluarUTC = Date.UTC(evaluar.getUTCFullYear(), evaluar.getUTCMonth(), evaluar.getUTCDate(), 12, 0, 0)
  
  if (evaluarUTC < inicioUTC) return false
  
  const diffTime = evaluarUTC - inicioUTC
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  const diaSemana = evaluar.getUTCDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  
  if (tipoPago === 'DIARIO') {
    return diaSemana !== 0 // Domingo no se cobra
  }
  if (tipoPago === 'LUNES_A_SABADO') {
    return diaSemana !== 0 // Domingo no se cobra
  }
  if (tipoPago === 'LUNES_A_VIERNES') {
    return diaSemana !== 0 && diaSemana !== 6 // Sábado y Domingo no se cobra
  }
  if (tipoPago === 'SEMANAL') {
    return diffDays % 7 === 0
  }
  if (tipoPago === 'CATORCENAL') {
    return diffDays % 14 === 0
  }
  if (tipoPago === 'QUINCENAL') {
    return diffDays % 15 === 0
  }
  if (tipoPago === 'MENSUAL' || tipoPago === 'FIN_DE_MES') {
    return inicio.getUTCDate() === evaluar.getUTCDate()
  }
  
  return false
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fechaParam = searchParams.get("fecha")
    const rutaIdParam = searchParams.get("rutaId")

    // Determinar ruta objetivo
    let targetRutaId: string | null = null
    if (rutaIdParam && (session.user.role === "ADMINISTRADOR" || session.user.role === "SUPERVISOR")) {
      targetRutaId = rutaIdParam
    }

    // Obtener fecha del informe
    const { inicio, fin } = getEcuadorDayRange(fechaParam)

    // Obtener datos del cobrador actual para saber su ruta por defecto
    const cobrador = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, rutaId: true }
    })

    if (!cobrador) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Si no se pasó un rutaId explícito, usar la del cobrador
    if (!targetRutaId && cobrador.rutaId) {
      targetRutaId = cobrador.rutaId
    }

    // Obtener todos los préstamos activos
    const prestamos = await prisma.prestamo.findMany({
      where: {
        estado: "ACTIVO",
        ...(targetRutaId 
            ? { cliente: { rutaId: targetRutaId } } 
            : { userId: session.user.id }
        )
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            documento: true,
            telefono: true,
            direccionCliente: true,
            direccionCobro: true,
            mapLink: true
          }
        },
        pagos: {
          orderBy: {
            fecha: "desc"
          }
        }
      }
    })

    // Procesar TODOS los préstamos activos: calcular saldos y pagos de hoy
    const procesados = prestamos
      .filter(p => new Date(p.fechaInicio) <= fin) // solo los que ya iniciaron
      .map(prestamo => {
        const totalPagado = prestamo.pagos.reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)
        const montoTotal = parseFloat(prestamo.monto.toString()) +
          (parseFloat(prestamo.monto.toString()) * parseFloat(prestamo.interes.toString()) / 100)

        const saldoPendiente = Math.round((montoTotal - totalPagado) * 100) / 100

        const cuotasPagadasRaw = parseFloat(prestamo.valorCuota.toString()) > 0
          ? totalPagado / parseFloat(prestamo.valorCuota.toString())
          : 0
        const cuotasPagadas = Math.round(cuotasPagadasRaw * 100) / 100

        // Pagos de HOY (sin importar si era día de cobro o no)
        const pagosHoy = prestamo.pagos.filter(pago => {
          const pFecha = new Date(pago.fecha)
          return pFecha >= inicio && pFecha <= fin
        })

        const pagadoHoyMonto = pagosHoy.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)
        const yaPagoHoy = pagosHoy.length > 0

        // ¿Corresponde cobrar hoy según frecuencia o mora?
        const esMora = prestamo.fechaFin < inicio
        const esHoy = esDiaDePago(prestamo.tipoPago, prestamo.fechaInicio, inicio)
        const enRutaHoy = esHoy || esMora

        const diasMora = esMora ? Math.floor((inicio.getTime() - prestamo.fechaFin.getTime()) / (1000 * 60 * 60 * 24)) : 0

        return {
          id: prestamo.id,
          monto: parseFloat(prestamo.monto.toString()),
          interes: parseFloat(prestamo.interes.toString()),
          cuotas: prestamo.cuotas,
          valorCuota: parseFloat(prestamo.valorCuota.toString()),
          fechaInicio: prestamo.fechaInicio,
          fechaFin: prestamo.fechaFin,
          estado: prestamo.estado,
          tipoPago: prestamo.tipoPago,
          cliente: prestamo.cliente,
          saldoPendiente,
          cuotasPagadas,
          yaPagoHoy,
          pagadoHoyMonto,
          diasMora: diasMora > 0 ? diasMora : 0,
          enRutaHoy
        }
      })

    // COBRADOS: cualquier préstamo activo que registró un pago hoy (sin importar si era día de cobro)
    const cobrados = procesados.filter(p => p.yaPagoHoy)

    // POR COBRAR: los que corresponden a hoy (frecuencia/mora), NO pagaron hoy, y tienen saldo
    const porCobrar = procesados.filter(p => !p.yaPagoHoy && p.enRutaHoy && p.saldoPendiente > 0)

    // Obtener orden guardado para hoy (asociado a la ruta)
    // Usamos el targetRutaId, o el userId si no hay ruta
    const ordenGuardado = await prisma.ordenRutaDia.findUnique({
      where: {
        userId_fecha: {
          userId: targetRutaId || session.user.id,
          fecha: inicio
        }
      }
    })

    let ordenArray: string[] = []
    if (ordenGuardado) {
      try {
        ordenArray = JSON.parse(ordenGuardado.orden)
      } catch (e) {
        console.error("Error al parsear orden guardado:", e)
      }
    }

    // Si el usuario es ADMIN o SUPERVISOR, traemos la lista de Rutas
    let rutas: any[] = []
    if (session.user.role === "ADMINISTRADOR" || session.user.role === "SUPERVISOR") {
      rutas = await prisma.ruta.findMany({
        where: {
          activa: true
        },
        select: {
          id: true,
          nombre: true,
          numero: true
        },
        orderBy: {
          nombre: "asc"
        }
      })
    }

    // Aplicar orden a "Por Cobrar"
    if (ordenArray.length > 0) {
      porCobrar.sort((a, b) => {
        const indexA = ordenArray.indexOf(a.id)
        const indexB = ordenArray.indexOf(b.id)
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return 0
      })
    }

    return NextResponse.json({
      porCobrar,
      cobrados,
      orden: ordenArray,
      cobradores: rutas, // Mantenemos la key 'cobradores' en el JSON para no romper el cliente, aunque ahora sean rutas
      fecha: inicio.toISOString().split("T")[0]
    })
  } catch (error) {
    console.error("Error al obtener la ruta del día:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { orden, fecha, rutaId } = body

    if (!Array.isArray(orden)) {
      return NextResponse.json({ error: "El campo 'orden' debe ser un arreglo de IDs" }, { status: 400 })
    }

    // Determinar objetivo para guardar el orden (la ruta seleccionada o el propio usuario)
    let targetId = session.user.id
    if (rutaId && (session.user.role === "ADMINISTRADOR" || session.user.role === "SUPERVISOR")) {
      targetId = rutaId
    }

    // Obtener fecha del día
    const { inicio } = getEcuadorDayRange(fecha)

    // Guardar orden
    await prisma.ordenRutaDia.upsert({
      where: {
        userId_fecha: {
          userId: targetId,
          fecha: inicio
        }
      },
      update: {
        orden: JSON.stringify(orden)
      },
      create: {
        userId: targetId,
        fecha: inicio,
        orden: JSON.stringify(orden)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al guardar el orden de la ruta:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

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
    const userIdParam = searchParams.get("userId")

    // Determinar usuario objetivo
    let targetUserId = session.user.id
    if (userIdParam && (session.user.role === "ADMINISTRADOR" || session.user.role === "SUPERVISOR")) {
      targetUserId = userIdParam
    }

    // Obtener fecha del informe
    const { inicio, fin } = getEcuadorDayRange(fechaParam)

    // Obtener datos del cobrador
    const cobrador = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, rutaId: true, name: true, firstName: true }
    })

    if (!cobrador) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener todos los préstamos activos del cobrador
    const prestamos = await prisma.prestamo.findMany({
      where: {
        userId: targetUserId,
        estado: "ACTIVO"
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

    // Filtrar los que corresponden a hoy (o están vencidos/mora) y calcular saldos
    const prestamosHoy = prestamos.filter(prestamo => {
      const fechaInicioPrestamo = new Date(prestamo.fechaInicio)
      // Debe haber iniciado ya
      if (fechaInicioPrestamo > fin) return false

      // 1. Validar si corresponde cobrar hoy
      const esHoy = esDiaDePago(prestamo.tipoPago, prestamo.fechaInicio, inicio)

      // 2. O si está en mora (ya venció y no está cancelado)
      const esMora = prestamo.fechaFin < inicio

      return esHoy || esMora
    })

    const procesados = prestamosHoy.map(prestamo => {
      const totalPagado = prestamo.pagos.reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)
      const montoTotal = parseFloat(prestamo.monto.toString()) + 
        (parseFloat(prestamo.monto.toString()) * parseFloat(prestamo.interes.toString()) / 100)
      
      const saldoPendiente = Math.round((montoTotal - totalPagado) * 100) / 100
      
      const cuotasPagadasRaw = parseFloat(prestamo.valorCuota.toString()) > 0
        ? totalPagado / parseFloat(prestamo.valorCuota.toString())
        : 0
      const cuotasPagadas = Math.round(cuotasPagadasRaw * 100) / 100

      // Buscar si tiene algún pago registrado hoy
      const pagosHoy = prestamo.pagos.filter(pago => {
        const pFecha = new Date(pago.fecha)
        return pFecha >= inicio && pFecha <= fin
      })

      const pagadoHoyMonto = pagosHoy.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)
      const yaPagoHoy = pagosHoy.length > 0

      // Calcular mora (si está vencido)
      const esMora = prestamo.fechaFin < inicio
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
        diasMora: diasMora > 0 ? diasMora : 0
      }
    })

    // Filtrar solo préstamos con saldo pendiente, o que hayan pagado hoy
    const conSaldoOPagadosHoy = procesados.filter(p => p.saldoPendiente > 0 || p.yaPagoHoy)

    // Obtener orden guardado para hoy
    const ordenGuardado = await prisma.ordenRutaDia.findUnique({
      where: {
        userId_fecha: {
          userId: targetUserId,
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

    // Dividir en Por Cobrar y Cobrados
    const porCobrar = conSaldoOPagadosHoy.filter(p => !p.yaPagoHoy)
    const cobrados = conSaldoOPagadosHoy.filter(p => p.yaPagoHoy)

    // Si el usuario es ADMIN o SUPERVISOR, también traemos la lista de cobradores
    let cobradores: any[] = []
    if (session.user.role === "ADMINISTRADOR" || session.user.role === "SUPERVISOR") {
      cobradores = await prisma.user.findMany({
        where: {
          role: "COBRADOR",
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true
        },
        orderBy: {
          firstName: "asc"
        }
      })
    }

    // Aplicar orden a "Por Cobrar"
    if (ordenArray.length > 0) {
      porCobrar.sort((a, b) => {
        const indexA = ordenArray.indexOf(a.id)
        const indexB = ordenArray.indexOf(b.id)
        
        // Si ambos están en el orden guardado
        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        // Si solo a está en el orden
        if (indexA !== -1) return -1
        // Si solo b está en el orden
        if (indexB !== -1) return 1
        // Si ninguno está, mantener orden por ID o nombre
        return 0
      })
    }

    return NextResponse.json({
      porCobrar,
      cobrados,
      orden: ordenArray,
      cobradores,
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
    const { orden, fecha, userId } = body

    if (!Array.isArray(orden)) {
      return NextResponse.json({ error: "El campo 'orden' debe ser un arreglo de IDs" }, { status: 400 })
    }

    // Determinar usuario objetivo
    let targetUserId = session.user.id
    if (userId && (session.user.role === "ADMINISTRADOR" || session.user.role === "SUPERVISOR")) {
      targetUserId = userId
    }

    // Obtener fecha del día
    const { inicio } = getEcuadorDayRange(fecha)

    // Guardar orden
    await prisma.ordenRutaDia.upsert({
      where: {
        userId_fecha: {
          userId: targetUserId,
          fecha: inicio
        }
      },
      update: {
        orden: JSON.stringify(orden)
      },
      create: {
        userId: targetUserId,
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

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getEcuadorDayRange, esDiaDePago, getDiasMoraSinDomingos } from "@/lib/date-utils"

export const dynamic = "force-dynamic"


function getCuotasEsperadas(tipoPago: string, fechaInicio: Date, fechaEvaluar: Date): number {
  const inicio = new Date(fechaInicio)
  const evaluar = new Date(fechaEvaluar)
  
  const inicioUTC = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate(), 12, 0, 0)
  const evaluarUTC = Date.UTC(evaluar.getUTCFullYear(), evaluar.getUTCMonth(), evaluar.getUTCDate(), 12, 0, 0)
  
  if (evaluarUTC < inicioUTC) return 0
  
  let expected = 0
  let currentUTC = inicioUTC
  
  // Contamos cuántos días de cobro válidos hay desde el inicio hasta la fecha a evaluar
  while (currentUTC <= evaluarUTC) {
    const d = new Date(currentUTC)
    if (esDiaDePago(tipoPago, inicio, d)) {
      expected++
    }
    currentUTC += 1000 * 60 * 60 * 24
  }
  return expected
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
    const isAdminOrSupervisor = session.user.role === "ADMINISTRADOR" || session.user.role === "SUPERVISOR"
    let prestamos: any[] = []

    if (targetRutaId || !isAdminOrSupervisor) {
      prestamos = await prisma.prestamo.findMany({
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
          }
        }
      })
    }

    const prestamoIds = prestamos.map(p => p.id)

    // Agrupar los pagos para obtener el total pagado por préstamo
    const sumasPagos = prestamoIds.length > 0 ? await prisma.pago.groupBy({
      by: ["prestamoId"],
      _sum: { monto: true, devolucionSeguro: true },
      where: { prestamoId: { in: prestamoIds } }
    }) : []

    const pagoTotalesMap = new Map()
    sumasPagos.forEach(s => {
      pagoTotalesMap.set(s.prestamoId, Number(s._sum.monto || 0) + Number(s._sum.devolucionSeguro || 0))
    })

    // Obtener SOLO los pagos de "hoy" (entre inicio y fin) para saber si pagaron
    const pagosHoyRaw = prestamoIds.length > 0 ? await prisma.pago.findMany({
      where: {
        prestamoId: { in: prestamoIds },
        fecha: {
          gte: inicio,
          lte: fin
        }
      },
      select: {
        prestamoId: true,
        monto: true
      }
    }) : []

    const pagosHoyMap = new Map()
    pagosHoyRaw.forEach(p => {
      const arr = pagosHoyMap.get(p.prestamoId) || []
      arr.push(p)
      pagosHoyMap.set(p.prestamoId, arr)
    })

    // Procesar TODOS los préstamos activos: calcular saldos y pagos de hoy
    const procesados = prestamos
      .filter(p => new Date(p.fechaInicio) <= fin) // solo los que ya iniciaron
      .map(prestamo => {
        const totalPagado = pagoTotalesMap.get(prestamo.id) || 0
        const montoTotal = parseFloat(prestamo.monto.toString()) +
          (parseFloat(prestamo.monto.toString()) * parseFloat(prestamo.interes.toString()) / 100)

        const saldoPendiente = Math.round((montoTotal - totalPagado) * 100) / 100

        const cuotasPagadasRaw = parseFloat(prestamo.valorCuota.toString()) > 0
          ? totalPagado / parseFloat(prestamo.valorCuota.toString())
          : 0
        const cuotasPagadas = Math.round(cuotasPagadasRaw * 100) / 100

        // Pagos de HOY (sin importar si era día de cobro o no)
        const pagosHoy = pagosHoyMap.get(prestamo.id) || []

        const pagadoHoyMonto = pagosHoy.reduce((sum: number, p: any) => sum + parseFloat(p.monto.toString()), 0)
        const yaPagoHoy = pagosHoy.length > 0

        // ¿Corresponde cobrar hoy según frecuencia o mora?
        const esMora = prestamo.fechaFin < inicio
        const esHoy = esDiaDePago(prestamo.tipoPago, prestamo.fechaInicio, inicio)
        
        // Calcular si está adelantado
        const cuotasEsperadas = getCuotasEsperadas(prestamo.tipoPago, prestamo.fechaInicio, inicio)
        const estaAlDiaOAdelantado = cuotasPagadasRaw >= cuotasEsperadas

        // Si el préstamo inicia hoy o en el futuro (en el día lógico evaluado), no se debe cobrar hoy (empieza mañana o en su próximo día de cobro)
        const esDiaDeInicio = new Date(prestamo.fechaInicio).getTime() >= inicio.getTime() && new Date(prestamo.fechaInicio).getTime() <= fin.getTime()

        // Si está adelantado (ya cubrió sus cuotas hasta hoy inclusive) o es el día de inicio, no lo ponemos en la ruta
        const enRutaHoy = !estaAlDiaOAdelantado && (esHoy || esMora) && !esDiaDeInicio

        // Dias de mora:
        let diasMora = 0
        if (!estaAlDiaOAdelantado) {
          if (esMora) {
            // Si el préstamo ya venció (fechaFin < inicio), contamos los días hábiles (sin domingos) desde fechaFin hasta inicio (hoy)
            diasMora = getDiasMoraSinDomingos(prestamo.fechaFin, inicio, prestamo.tipoPago)
          } else {
            // Si está activo, es la diferencia de cuotas esperadas hasta ayer (ya vencidas) menos las pagadas
            const fechaAyer = new Date(inicio.getTime() - 24 * 60 * 60 * 1000)
            const cuotasEsperadasAyer = getCuotasEsperadas(prestamo.tipoPago, prestamo.fechaInicio, fechaAyer)
            diasMora = Math.max(0, Math.floor(cuotasEsperadasAyer - cuotasPagadasRaw))
          }
        }

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
    let ordenArray: string[] = []
    if (targetRutaId || !isAdminOrSupervisor) {
      const ordenGuardado = await prisma.ordenRutaDia.findUnique({
        where: {
          userId_fecha: {
            userId: targetRutaId || session.user.id,
            fecha: inicio
          }
        }
      })

      if (ordenGuardado) {
        try {
          ordenArray = JSON.parse(ordenGuardado.orden)
        } catch (e) {
          console.error("Error al parsear orden guardado:", e)
        }
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
    const isAdminOrSupervisor = session.user.role === "ADMINISTRADOR" || session.user.role === "SUPERVISOR"
    if (rutaId && isAdminOrSupervisor) {
      targetId = rutaId
    } else if (isAdminOrSupervisor && !rutaId) {
      // Si es admin o supervisor y no hay rutaId, no guardamos orden porque no tiene ruta propia
      return NextResponse.json({ success: true })
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


import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"
import { getEcuadorDayRange } from "@/lib/date-utils"

export const dynamic = "force-dynamic"

// GET /api/caja-chica/todos - Obtener cobradores y movimientos (solo admin/supervisor)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(request.url)
    const fechaParam = url.searchParams.get("fecha")

    // Solo admin y supervisor pueden ver todos los movimientos
    if (!["ADMINISTRADOR", "SUPERVISOR"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      )
    }

    // Obtener todos los cobradores y trabajadores con rutas o roles de cobro
    const cobradoresRaw = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ["COBRADOR", "SUPERVISOR"] } },
          { numeroRuta: { not: null } },
          { rutaId: { not: null } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        numeroRuta: true,
        rutaId: true,
        role: true,
        isActive: true,
        ruta: {
          select: {
            id: true,
            numero: true,
            nombre: true,
          }
        }
      },
      orderBy: [
        { numeroRuta: 'asc' },
        { firstName: 'asc' },
        { name: 'asc' }
      ]
    })

    const cobradores = cobradoresRaw.map((c) => {
      const nombreCompleto = `${c.firstName || c.name || ""}${c.lastName ? ` ${c.lastName}` : ""}`.trim() || c.id
      const ruta = c.numeroRuta || (c.ruta ? (c.ruta.numero ? `${c.ruta.numero}` : c.ruta.nombre) : null)
      return {
        id: c.id,
        nombre: nombreCompleto,
        numeroRuta: ruta,
      }
    })

    const fechaInicioParam = url.searchParams.get("fechaInicio")
    const fechaFinParam = url.searchParams.get("fechaFin")

    // Obtener movimientos para el historial (filtrado por fecha o ultimos 50)
    let dateFilter: any = {}
    let limit = 50
    let maxFechaSaldo: Date | undefined = undefined

    if (fechaInicioParam || fechaFinParam) {
      const inicio = fechaInicioParam ? getEcuadorDayRange(fechaInicioParam).inicio : undefined
      const fin = fechaFinParam ? getEcuadorDayRange(fechaFinParam).fin : undefined
      dateFilter = {
        fecha: {
          ...(inicio ? { gte: inicio } : {}),
          ...(fin ? { lte: fin } : {}),
        }
      }
      maxFechaSaldo = fin
      limit = 500
    } else if (fechaParam) {
      const { inicio, fin } = getEcuadorDayRange(fechaParam)
      dateFilter = {
        fecha: {
          gte: inicio,
          lte: fin,
        }
      }
      maxFechaSaldo = fin
      limit = 500 // Más límite si se busca un día específico
    }

    // Rango de fechas para el resumen diario / dividendos por ruta
    const rangeFecha = dateFilter.fecha || getEcuadorDayRange(fechaParam || undefined)
    const fechaInicioRange = rangeFecha.gte || getEcuadorDayRange(fechaParam || undefined).inicio
    const fechaFinRange = rangeFecha.lte || getEcuadorDayRange(fechaParam || undefined).fin

    // Consultar préstamos, pagos y gastos para el cálculo financiero de Caja Central y Dividendos
    const [allPrestamos, allPagos, allGastos] = await Promise.all([
      prisma.prestamo.findMany({
        where: maxFechaSaldo ? { createdAt: { lte: maxFechaSaldo } } : undefined,
        select: { id: true, userId: true, monto: true, interes: true, createdAt: true, tipoCredito: true, estado: true }
      }),
      prisma.pago.findMany({
        where: maxFechaSaldo ? { fecha: { lte: maxFechaSaldo } } : undefined,
        include: {
          prestamo: {
            select: { id: true, monto: true, interes: true, userId: true }
          }
        }
      }),
      prisma.gasto.findMany({
        where: maxFechaSaldo ? { fecha: { lte: maxFechaSaldo } } : undefined,
        select: { id: true, userId: true, monto: true, fecha: true }
      })
    ])

    // Calculate totals and balances (up to specified maxFechaSaldo or all time)
    const allTimeMovements = await prisma.movimientoCajaChica.findMany({
      where: maxFechaSaldo ? { fecha: { lte: maxFechaSaldo } } : undefined,
      select: { tipo: true, monto: true, cobradorId: true, fecha: true }
    })
    
    let totalApertura = 0
    let totalEntregas = 0
    let totalDevoluciones = 0
    let totalEgresosGenerales = 0
    let totalGastosCobradores = 0

    const saldosCobradores: Record<string, number> = {}

    allTimeMovements.forEach(m => {
      const montoNum = m.monto.toNumber()
      const tipo = m.tipo

      // Totales Globales Admin
      if (tipo === "APERTURA_CAJA") totalApertura += montoNum
      else if (tipo === "ENTREGA" || tipo === "ENTREGADO") totalEntregas += montoNum
      else if (tipo === "DEVOLUCION" || tipo === "DEVUELTO") totalDevoluciones += montoNum
      else if (tipo === "EGRESO_GENERAL") totalEgresosGenerales += montoNum
      else if (tipo === "GASTO" || tipo === "GASTADO" || tipo === "PAGO_SUELDO") totalGastosCobradores += montoNum

      // Saldo de cada cobrador
      if (m.cobradorId) {
        if (!saldosCobradores[m.cobradorId]) {
          saldosCobradores[m.cobradorId] = 0
        }
        if (tipo === "ENTREGA" || tipo === "ENTREGADO" || tipo === "INGRESO" || tipo === "APERTURA_CAJA") {
          saldosCobradores[m.cobradorId] += montoNum
        } else if (tipo === "DEVOLUCION" || tipo === "DEVUELTO" || tipo === "GASTO" || tipo === "GASTADO" || tipo === "PAGO_SUELDO" || tipo === "EGRESO") {
          saldosCobradores[m.cobradorId] -= montoNum
        } else if (tipo === "AJUSTE") {
          saldosCobradores[m.cobradorId] += montoNum
        }
      }
    })

    // Totales de Capital Invertido, Cobros, Préstamos y Gastos
    const capitalInvertidoTotal = allPrestamos.reduce((sum, p) => sum + p.monto.toNumber(), 0)
    const capitalInvertidoActivo = allPrestamos
      .filter(p => p.estado === "ACTIVO")
      .reduce((sum, p) => sum + p.monto.toNumber(), 0)

    const totalCobradoGlobal = allPagos.reduce((sum, p) => sum + p.monto.toNumber(), 0)
    const totalPrestadoGlobal = capitalInvertidoTotal
    const totalGastosDirectosGlobal = allGastos.reduce((sum, g) => sum + g.monto.toNumber(), 0)
    const totalGastosGlobal = totalGastosDirectosGlobal + totalGastosCobradores

    // Saldo Dinámico de la Caja Central:
    // Monto Invertido Base (usado como Saldo Inicial si no hay Apertura manual) + Cobros + Devoluciones - Gastos - Egresos Generales - Entregas
    const saldoInicialCaja = totalApertura > 0 ? totalApertura : capitalInvertidoTotal
    const saldoCajaCentral = saldoInicialCaja
      + totalCobradoGlobal
      + totalDevoluciones
      - totalGastosGlobal
      - totalEgresosGenerales
      - totalEntregas

    // Agrupar métricas por ruta / cobrador para la fecha del filtro (o día actual)
    const cobradoresConSaldo = cobradores.map((cobrador) => {
      // Filtrar pagos del día/rango para esta ruta
      const pagosRuta = allPagos.filter(p => p.userId === cobrador.id && p.fecha >= fechaInicioRange && p.fecha <= fechaFinRange)
      const cobradoDia = pagosRuta.reduce((sum, p) => sum + p.monto.toNumber(), 0)

      // Interés cobrado (dividendo real generado por la ruta)
      let dividendoInteresDia = 0
      pagosRuta.forEach(p => {
        const prestamo = p.prestamo
        if (prestamo) {
          const montoOriginal = prestamo.monto.toNumber()
          const tasaInteres = prestamo.interes.toNumber() / 100
          const montoConInteres = montoOriginal * (1 + tasaInteres)
          if (montoConInteres > 0) {
            const porcentajeInteres = (montoConInteres - montoOriginal) / montoConInteres
            dividendoInteresDia += p.monto.toNumber() * porcentajeInteres
          }
        }
      })

      // Filtrar préstamos nuevos del día/rango para esta ruta
      const prestamosRuta = allPrestamos.filter(p => p.userId === cobrador.id && p.createdAt >= fechaInicioRange && p.createdAt <= fechaFinRange)
      const prestadoDia = prestamosRuta.reduce((sum, p) => sum + p.monto.toNumber(), 0)

      // Gastos del día/rango
      const gastosRutaDirectos = allGastos.filter(g => g.userId === cobrador.id && g.fecha >= fechaInicioRange && g.fecha <= fechaFinRange)
      const totalGastosDirectosDia = gastosRutaDirectos.reduce((sum, g) => sum + g.monto.toNumber(), 0)
      
      const movsGastosRuta = allTimeMovements.filter(m => m.cobradorId === cobrador.id && ["GASTO", "GASTADO", "PAGO_SUELDO"].includes(m.tipo) && m.fecha >= fechaInicioRange && m.fecha <= fechaFinRange)
      const totalGastosMovsDia = movsGastosRuta.reduce((sum, m) => sum + m.monto.toNumber(), 0)
      
      const gastosDia = totalGastosDirectosDia + totalGastosMovsDia

      // Flujo neto del día (Cobrado - Prestado - Gastos)
      const flujoNetoDia = cobradoDia - prestadoDia - gastosDia

      return {
        id: cobrador.id,
        nombre: cobrador.nombre,
        numeroRuta: cobrador.numeroRuta,
        saldoActual: saldosCobradores[cobrador.id] || 0,
        cobradoDia,
        prestadoDia,
        gastosDia,
        flujoNetoDia,
        dividendoDia: Number(dividendoInteresDia.toFixed(2)),
      }
    })

    const totalDividendosDia = cobradoresConSaldo.reduce((sum, c) => sum + c.dividendoDia, 0)

    const totalesGlobales = {
      totalApertura: totalApertura > 0 ? totalApertura : Number(capitalInvertidoTotal.toFixed(2)),
      capitalInvertidoTotal: Number(capitalInvertidoTotal.toFixed(2)),
      capitalInvertidoActivo: Number(capitalInvertidoActivo.toFixed(2)),
      totalCobradoGlobal: Number(totalCobradoGlobal.toFixed(2)),
      totalPrestadoGlobal: Number(totalPrestadoGlobal.toFixed(2)),
      totalGastosGlobal: Number(totalGastosGlobal.toFixed(2)),
      saldoCajaCentral: Number(saldoCajaCentral.toFixed(2)),
      totalDividendosDia: Number(totalDividendosDia.toFixed(2)),
      totalEntregas,
      totalDevoluciones,
      totalEgresosGenerales,
      totalGastosCobradores
    }

    const todosMovimientos = await prisma.movimientoCajaChica.findMany({
      where: dateFilter,
      orderBy: {
        fecha: "desc",
      },
      take: limit,
      include: {
        cobrador: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
          },
        },
        asignadoPor: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    })

    const movimientosFormateados = todosMovimientos.map((mov) => ({
      id: mov.id,
      tipo: mov.tipo,
      monto: mov.monto.toNumber(),
      descripcion: mov.descripcion,
      observaciones: mov.observaciones,
      fecha: mov.fecha.toISOString(),
      estado: mov.estado,
      cobradorId: mov.cobradorId,
      saldoAnterior: mov.saldoAnterior.toNumber(),
      saldoNuevo: mov.saldoNuevo.toNumber(),
      cobrador: mov.cobrador ? 
        `${mov.cobrador.firstName || mov.cobrador.name || ""} ${mov.cobrador.lastName || ""}`.trim() :
        mov.tipo === "EGRESO_GENERAL" ? "Egreso General" : "Monto Inicial de Caja",
      asignadoPorId: mov.asignadoPorId,
      asignadoPor: mov.asignadoPor ?
        `${mov.asignadoPor.firstName || mov.asignadoPor.name || ""} ${mov.asignadoPor.lastName || ""}`.trim() :
        null,
    }))

    return NextResponse.json({
      success: true,
      cobradores: cobradoresConSaldo,
      movimientosRecientes: movimientosFormateados,
      totalesGlobales,
    })
  } catch (error) {
    console.error("Error al obtener todos los movimientos:", error)
    return NextResponse.json(
      { error: "Error al obtener movimientos" },
      { status: 500 }
    )
  }
}


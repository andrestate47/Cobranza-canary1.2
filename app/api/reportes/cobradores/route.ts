import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getEcuadorDayRange, getEcuadorRange, esDiaDePago } from "@/lib/date-utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fechaParam = searchParams.get("fecha")
    const fechaInicioParam = searchParams.get("fechaInicio")
    const fechaFinParam = searchParams.get("fechaFin")
    const targetCobradorId = searchParams.get("cobradorId")

    // Rango de fecha (por defecto HOY en Ecuador)
    let range: { inicio: Date; fin: Date; fechaFormateada?: string }
    if (fechaInicioParam && fechaFinParam) {
      range = getEcuadorRange(fechaInicioParam, fechaFinParam)
    } else {
      range = getEcuadorDayRange(fechaParam)
    }

    const { inicio: fechaInicio, fin: fechaFin } = range

    // Determinar cobradores a consultar
    const userRole = session.user.role
    const isCobrador = userRole === "COBRADOR"

    const whereCobrador: any = {
      OR: [
        { role: { in: ["COBRADOR", "SUPERVISOR"] } },
        { numeroRuta: { not: null } },
        { rutaId: { not: null } }
      ]
    }

    if (isCobrador) {
      whereCobrador.id = session.user.id
    } else if (targetCobradorId && targetCobradorId !== "all") {
      whereCobrador.id = targetCobradorId
    }

    const cobradoresRaw = await prisma.user.findMany({
      where: whereCobrador,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        numeroRuta: true,
        rutaId: true,
        ruta: {
          select: { numero: true, nombre: true }
        }
      },
      orderBy: [
        { numeroRuta: "asc" },
        { firstName: "asc" },
        { name: "asc" }
      ]
    })

    const cobradoresIds = cobradoresRaw.map(c => c.id)

    // Consultas paralelas para obtener métricas exactas
    const [allPrestamosRango, allPrestamosActivos, allPagosRango, allGastosRango, allMovimientosRango, allVisitasRango] = await Promise.all([
      // 1. Préstamos creados en el rango
      prisma.prestamo.findMany({
        where: {
          userId: { in: cobradoresIds },
          createdAt: { gte: fechaInicio, lte: fechaFin }
        },
        select: {
          id: true,
          userId: true,
          monto: true,
          interes: true,
          renovadoDeId: true,
          datosRefinanciamiento: true,
          observaciones: true,
          clienteId: true
        }
      }),
      // 2. Todos los préstamos activos/vencidos para saldo pendiente y clientes con mora
      prisma.prestamo.findMany({
        where: {
          userId: { in: cobradoresIds },
          estado: { in: ["ACTIVO", "VENCIDO"] }
        },
        select: {
          id: true,
          userId: true,
          clienteId: true,
          monto: true,
          interes: true,
          valorCuota: true,
          tipoPago: true,
          fechaInicio: true,
          fechaFin: true,
          moraCredito: true,
          pagos: {
            select: { monto: true }
          }
        }
      }),
      // 3. Pagos realizados en el rango
      prisma.pago.findMany({
        where: {
          userId: { in: cobradoresIds },
          fecha: { gte: fechaInicio, lte: fechaFin }
        },
        select: {
          id: true,
          userId: true,
          monto: true,
          observaciones: true,
          prestamo: {
            select: { clienteId: true }
          }
        }
      }),
      // 4. Gastos realizados en el rango
      prisma.gasto.findMany({
        where: {
          userId: { in: cobradoresIds },
          fecha: { gte: fechaInicio, lte: fechaFin }
        },
        select: {
          id: true,
          userId: true,
          monto: true,
          concepto: true
        }
      }),
      // 5. Movimientos de caja entregas en el rango
      prisma.movimientoCajaChica.findMany({
        where: {
          cobradorId: { in: cobradoresIds },
          fecha: { gte: fechaInicio, lte: fechaFin },
          tipo: { in: ["ENTREGA", "ENTREGADO", "APERTURA_CAJA"] }
        },
        select: {
          id: true,
          cobradorId: true,
          monto: true
        }
      }),
      // 6. Visitas registradas en el rango
      prisma.visitaCliente.findMany({
        where: {
          userId: { in: cobradoresIds },
          fecha: { gte: fechaInicio, lte: fechaFin }
        },
        select: {
          id: true,
          userId: true,
          clienteId: true
        }
      })
    ])

    const hoyDate = new Date()

    // Procesar reporte individual por cobrador
    const reportes = cobradoresRaw.map(cobrador => {
      const cId = cobrador.id
      const nombreCompleto = `${cobrador.firstName || cobrador.name || ""}${cobrador.lastName ? ` ${cobrador.lastName}` : ""}`.trim() || cId
      const ruta = cobrador.numeroRuta || (cobrador.ruta ? (cobrador.ruta.numero ? `${cobrador.ruta.numero}` : cobrador.ruta.nombre) : null)

      // Préstamos creados en el día/rango
      const prestamosCobrador = allPrestamosRango.filter(p => p.userId === cId)
      
      let prestamosNuevosCount = 0
      let prestamosNuevosMonto = 0
      let refinanciamientoCount = 0
      let refinanciamientoMonto = 0
      let renovacionesCount = 0
      let renovacionesMonto = 0

      prestamosCobrador.forEach(p => {
        const m = parseFloat(p.monto.toString())
        const esRefinancia = p.datosRefinanciamiento != null || p.observaciones?.toUpperCase().includes("REFINANCIA")
        const esRenovacion = p.renovadoDeId != null || p.observaciones?.toUpperCase().includes("RENOVA")

        if (esRefinancia) {
          refinanciamientoCount++
          refinanciamientoMonto += m
        } else if (esRenovacion) {
          renovacionesCount++
          renovacionesMonto += m
        } else {
          prestamosNuevosCount++
          prestamosNuevosMonto += m
        }
      })

      // Gastos cobrador
      const gastosCobradorList = allGastosRango.filter(g => g.userId === cId)
      const gastosCobradorMonto = gastosCobradorList.reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0)

      // Cobrado hoy (pagos reales)
      const pagosCobradorList = allPagosRango.filter(p => 
        p.userId === cId && 
        !p.observaciones?.startsWith("Liquidación por refinanciamiento") && 
        !p.observaciones?.startsWith("Liquidación por renovacion") && 
        !p.observaciones?.startsWith("Liquidación por renovación")
      )
      const cobradoHoyMonto = pagosCobradorList.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)

      // Entrega hoy (efectivo entregado/aperturado)
      const entregasCobradorList = allMovimientosRango.filter(m => m.cobradorId === cId)
      const entregaHoyMonto = entregasCobradorList.reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)

      // Préstamos activos del cobrador
      const prestamosActivosCobrador = allPrestamosActivos.filter(p => p.userId === cId)

      let saldoPendienteTotal = 0
      const clientesConMoraSet = new Set<string>()
      const clientesConPrestamosActivosSet = new Set<string>()
      const clientesVisitadosSet = new Set<string>()

      // Clientes visitados por pagos o por visita registrada
      pagosCobradorList.forEach(p => {
        if (p.prestamo?.clienteId) clientesVisitadosSet.add(p.prestamo.clienteId)
      })
      allVisitasRango.filter(v => v.userId === cId).forEach(v => {
        clientesVisitadosSet.add(v.clienteId)
      })

      let cobrosPendientesCount = 0
      let cobrosPendientesMonto = 0
      const clientesPorVisitarSet = new Set<string>()

      prestamosActivosCobrador.forEach(p => {
        const montoBase = parseFloat(p.monto.toString())
        const tasaInt = parseFloat(p.interes.toString()) / 100
        const totalConInt = montoBase * (1 + tasaInt)
        const totalPagado = p.pagos.reduce((s, pg) => s + parseFloat(pg.monto.toString()), 0)
        const saldoRestante = Math.max(0, totalConInt - totalPagado)

        if (saldoRestante > 0.01) {
          saldoPendienteTotal += saldoRestante
          clientesConPrestamosActivosSet.add(p.clienteId)

          // Evaluar si tiene mora
          const tieneMoraFlag = parseFloat(p.moraCredito.toString()) > 0 || (new Date(p.fechaFin) < hoyDate && saldoRestante > 1)
          if (tieneMoraFlag) {
            clientesConMoraSet.add(p.clienteId)
          }

          // Evaluar si corresponde cobro hoy
          const leTocaCobrarHoy = esDiaDePago(p.tipoPago, p.fechaInicio, fechaInicio)
          if (leTocaCobrarHoy) {
            const clienteYaVisito = clientesVisitadosSet.has(p.clienteId)
            if (!clienteYaVisito) {
              cobrosPendientesCount++
              cobrosPendientesMonto += Math.min(saldoRestante, parseFloat(p.valorCuota.toString()))
              clientesPorVisitarSet.add(p.clienteId)
            }
          }
        }
      })

      return {
        cobradorId: cId,
        cobradorNombre: nombreCompleto,
        numeroRuta: ruta,
        prestamos: {
          count: prestamosNuevosCount,
          monto: Number(prestamosNuevosMonto.toFixed(2))
        },
        refinanciamiento: {
          count: refinanciamientoCount,
          monto: Number(refinanciamientoMonto.toFixed(2))
        },
        renovaciones: {
          count: renovacionesCount,
          monto: Number(renovacionesMonto.toFixed(2))
        },
        gastosCobrador: Number(gastosCobradorMonto.toFixed(2)),
        cobrosPendientes: {
          count: cobrosPendientesCount,
          monto: Number(cobrosPendientesMonto.toFixed(2))
        },
        clientesVisitados: clientesVisitadosSet.size,
        clientesPorVisitar: clientesPorVisitarSet.size,
        clientesConMora: clientesConMoraSet.size,
        saldoPendientePorCobrar: Number(saldoPendienteTotal.toFixed(2)),
        cobradoHoy: Number(cobradoHoyMonto.toFixed(2)),
        entregaHoy: Number(entregaHoyMonto.toFixed(2))
      }
    })

    // Totales globales agregados
    const resumenGlobal = reportes.reduce((acc, r) => {
      acc.totalPrestamos.count += r.prestamos.count
      acc.totalPrestamos.monto += r.prestamos.monto
      acc.totalRefinanciamiento.count += r.refinanciamiento.count
      acc.totalRefinanciamiento.monto += r.refinanciamiento.monto
      acc.totalRenovaciones.count += r.renovaciones.count
      acc.totalRenovaciones.monto += r.renovaciones.monto
      acc.totalGastosCobrador += r.gastosCobrador
      acc.totalCobrosPendientes.count += r.cobrosPendientes.count
      acc.totalCobrosPendientes.monto += r.cobrosPendientes.monto
      acc.totalClientesVisitados += r.clientesVisitados
      acc.totalClientesPorVisitar += r.clientesPorVisitar
      acc.totalClientesConMora += r.clientesConMora
      acc.totalSaldoPendientePorCobrar += r.saldoPendientePorCobrar
      acc.totalCobradoHoy += r.cobradoHoy
      acc.totalEntregaHoy += r.entregaHoy
      return acc
    }, {
      totalPrestamos: { count: 0, monto: 0 },
      totalRefinanciamiento: { count: 0, monto: 0 },
      totalRenovaciones: { count: 0, monto: 0 },
      totalGastosCobrador: 0,
      totalCobrosPendientes: { count: 0, monto: 0 },
      totalClientesVisitados: 0,
      totalClientesPorVisitar: 0,
      totalClientesConMora: 0,
      totalSaldoPendientePorCobrar: 0,
      totalCobradoHoy: 0,
      totalEntregaHoy: 0
    })

    // Redondear totales globales
    resumenGlobal.totalPrestamos.monto = Number(resumenGlobal.totalPrestamos.monto.toFixed(2))
    resumenGlobal.totalRefinanciamiento.monto = Number(resumenGlobal.totalRefinanciamiento.monto.toFixed(2))
    resumenGlobal.totalRenovaciones.monto = Number(resumenGlobal.totalRenovaciones.monto.toFixed(2))
    resumenGlobal.totalGastosCobrador = Number(resumenGlobal.totalGastosCobrador.toFixed(2))
    resumenGlobal.totalCobrosPendientes.monto = Number(resumenGlobal.totalCobrosPendientes.monto.toFixed(2))
    resumenGlobal.totalSaldoPendientePorCobrar = Number(resumenGlobal.totalSaldoPendientePorCobrar.toFixed(2))
    resumenGlobal.totalCobradoHoy = Number(resumenGlobal.totalCobradoHoy.toFixed(2))
    resumenGlobal.totalEntregaHoy = Number(resumenGlobal.totalEntregaHoy.toFixed(2))

    const cobradoresLista = cobradoresRaw.map(c => ({
      id: c.id,
      nombre: `${c.firstName || c.name || ""}${c.lastName ? ` ${c.lastName}` : ""}`.trim() || c.id,
      numeroRuta: c.numeroRuta || (c.ruta ? (c.ruta.numero ? `${c.ruta.numero}` : c.ruta.nombre) : null)
    }))

    return NextResponse.json({
      fecha: range.fechaFormateada || fechaParam,
      cobradores: cobradoresLista,
      reportes,
      resumenGlobal
    })
  } catch (error) {
    console.error("Error al generar reporte de cobradores:", error)
    return NextResponse.json(
      { error: "Error al generar reporte de cobradores" },
      { status: 500 }
    )
  }
}

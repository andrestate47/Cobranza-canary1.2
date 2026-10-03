
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"
import { getEcuadorDayRange } from "@/lib/date-utils"
import { hasPermission } from "@/lib/permissions"

// GET /api/caja-chica - Obtener saldo, métricas globales y movimientos del cobrador actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(request.url)
    const fechaParam = url.searchParams.get("fecha")
    const fechaInicioParam = url.searchParams.get("fechaInicio")
    const fechaFinParam = url.searchParams.get("fechaFin")
    const userId = session.user.id

    // Obtener TODOS los movimientos, pagos, préstamos y gastos del cobrador para balances históricos
    const [allMovimientos, allPagos, allPrestamos, allGastos] = await Promise.all([
      prisma.movimientoCajaChica.findMany({
        where: { cobradorId: userId },
        include: {
          cobrador: {
            select: { firstName: true, lastName: true, name: true }
          },
          asignadoPor: {
            select: { firstName: true, lastName: true, name: true }
          }
        },
        orderBy: { fecha: "desc" }
      }),
      prisma.pago.findMany({
        where: { userId: userId },
        include: {
          prestamo: {
            select: {
              id: true,
              monto: true,
              interes: true,
              cliente: { select: { nombre: true, apellido: true } }
            }
          }
        },
        orderBy: { fecha: "desc" }
      }),
      prisma.prestamo.findMany({
        where: { userId: userId },
        include: {
          cliente: { select: { nombre: true, apellido: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.gasto.findMany({
        where: { userId: userId },
        orderBy: { fecha: "desc" }
      })
    ])

    // 1. Capital Ingresado (Entregas, Ingresos manuales, Aperturas)
    let capitalIngresado = 0
    let totalGastadoMovs = 0
    let totalDevuelto = 0

    allMovimientos.forEach((mov) => {
      const mNum = mov.monto.toNumber()
      const esGastoVinculado = mov.observaciones && (mov.observaciones.includes("[GASTO:") || mov.observaciones.startsWith("Gasto:"))
      if (["ENTREGADO", "ENTREGA", "INGRESO", "APERTURA_CAJA"].includes(mov.tipo)) {
        capitalIngresado += mNum
      } else if (["GASTADO", "GASTO", "EGRESO", "EGRESO_GENERAL", "PAGO_SUELDO"].includes(mov.tipo) && !esGastoVinculado) {
        totalGastadoMovs += mNum
      } else if (["DEVUELTO", "DEVOLUCION"].includes(mov.tipo)) {
        totalDevuelto += mNum
      }
    })

    const totalGastosDirectos = allGastos.reduce((sum, g) => sum + g.monto.toNumber(), 0)
    const totalRetirado = totalGastadoMovs + totalGastosDirectos + totalDevuelto

    // 2. Total Cobrado de clientes
    const totalCobrado = allPagos.reduce((sum, p) => sum + p.monto.toNumber(), 0)

    // 3. Total Prestado a clientes
    const totalPrestado = allPrestamos.reduce((sum, pr) => sum + pr.monto.toNumber(), 0)

    // 4. Desglose de Capital Recuperado e Interés Ganado
    let capitalRecuperado = 0
    let interesGanado = 0

    allPagos.forEach(p => {
      const prestamo = p.prestamo
      if (prestamo) {
        const montoOriginal = prestamo.monto.toNumber()
        const tasaInteres = prestamo.interes.toNumber() / 100
        const montoConInteres = montoOriginal * (1 + tasaInteres)
        if (montoConInteres > 0) {
          const pctInt = (montoConInteres - montoOriginal) / montoConInteres
          const interesMonto = p.monto.toNumber() * pctInt
          const capitalMonto = p.monto.toNumber() * (1 - pctInt)
          interesGanado += interesMonto
          capitalRecuperado += capitalMonto
        } else {
          capitalRecuperado += p.monto.toNumber()
        }
      } else {
        capitalRecuperado += p.monto.toNumber()
      }
    })

    // 5. Saldo disponible en caja en manos del cobrador:
    // Saldo = Capital Ingresado + Total Cobrado - Total Prestado - Total Retirado
    const saldoDisponible = capitalIngresado + totalCobrado - totalPrestado - totalRetirado
    const balanceCobradoMenosPrestado = totalCobrado - totalPrestado

    // Filtro por fecha para el historial de movimientos
    let dateFilter: any = {}
    let limit = 200

    if (fechaInicioParam || fechaFinParam) {
      const inicio = fechaInicioParam ? getEcuadorDayRange(fechaInicioParam).inicio : undefined
      const fin = fechaFinParam ? getEcuadorDayRange(fechaFinParam).fin : undefined
      dateFilter = {
        gte: inicio,
        lte: fin,
      }
      limit = 500
    } else if (fechaParam) {
      const { inicio, fin } = getEcuadorDayRange(fechaParam)
      dateFilter = {
        gte: inicio,
        lte: fin,
      }
      limit = 500
    }

    // Filtrar movimientos por fecha para la línea de tiempo
    const movsFiltrados = dateFilter.gte || dateFilter.lte ? allMovimientos.filter(m => {
      if (dateFilter.gte && m.fecha < dateFilter.gte) return false
      if (dateFilter.lte && m.fecha > dateFilter.lte) return false
      return true
    }) : allMovimientos

    const pagosFiltrados = dateFilter.gte || dateFilter.lte ? allPagos.filter(p => {
      if (dateFilter.gte && p.fecha < dateFilter.gte) return false
      if (dateFilter.lte && p.fecha > dateFilter.lte) return false
      return true
    }) : allPagos

    const prestamosFiltrados = dateFilter.gte || dateFilter.lte ? allPrestamos.filter(pr => {
      if (dateFilter.gte && pr.createdAt < dateFilter.gte) return false
      if (dateFilter.lte && pr.createdAt > dateFilter.lte) return false
      return true
    }) : allPrestamos

    const gastosFiltrados = dateFilter.gte || dateFilter.lte ? allGastos.filter(g => {
      if (dateFilter.gte && g.fecha < dateFilter.gte) return false
      if (dateFilter.lte && g.fecha > dateFilter.lte) return false
      return true
    }) : allGastos

    // Mapear movimientos de caja chica
    const movsFormateados = movsFiltrados.map((mov) => {
      const esGasto = mov.tipo === "GASTO" || mov.tipo === "GASTADO" || (mov.observaciones && mov.observaciones.includes("[GASTO:"))
      return {
        id: mov.id,
        tipo: mov.tipo,
        monto: mov.monto.toNumber(),
        descripcion: mov.descripcion || mov.observaciones,
        observaciones: mov.observaciones,
        fecha: mov.fecha.toISOString(),
        estado: mov.estado,
        cobradorId: mov.cobradorId,
        saldoAnterior: mov.saldoAnterior.toNumber(),
        saldoNuevo: mov.saldoNuevo.toNumber(),
        cobrador: esGasto ? (mov.descripcion || "Gasto") : (mov.cobrador ? `${mov.cobrador.firstName || mov.cobrador.name || ""} ${mov.cobrador.lastName || ""}`.trim() : "Cobrador"),
        nombre: esGasto ? (mov.descripcion || "Gasto") : (mov.cobrador ? `${mov.cobrador.firstName || mov.cobrador.name || ""} ${mov.cobrador.lastName || ""}`.trim() : "Cobrador"),
        subtipo: esGasto ? "Gasto registrado" : undefined,
        asignadoPorId: mov.asignadoPorId,
        asignadoPor: mov.asignadoPor ? 
          `${mov.asignadoPor.firstName || mov.asignadoPor.name || ""} ${mov.asignadoPor.lastName || ""}`.trim() :
          null,
      }
    })

    // Mapear cobros (pagos de clientes)
    const pagosFormateados = pagosFiltrados.map(p => {
      const prestamo = p.prestamo
      let capitalMonto = p.monto.toNumber()
      let interesMonto = 0
      if (prestamo) {
        const montoOriginal = prestamo.monto.toNumber()
        const tasaInteres = prestamo.interes.toNumber() / 100
        const montoConInteres = montoOriginal * (1 + tasaInteres)
        if (montoConInteres > 0) {
          const pctInt = (montoConInteres - montoOriginal) / montoConInteres
          interesMonto = p.monto.toNumber() * pctInt
          capitalMonto = p.monto.toNumber() * (1 - pctInt)
        }
      }

      const clienteNombre = prestamo?.cliente ? `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`.trim() : "Cliente"
      return {
        id: `pago-${p.id}`,
        tipo: "COBRO",
        monto: p.monto.toNumber(),
        capital: Number(capitalMonto.toFixed(2)),
        interes: Number(interesMonto.toFixed(2)),
        descripcion: `Pago recibido de ${clienteNombre}`,
        observaciones: p.observaciones,
        fecha: p.fecha.toISOString(),
        estado: "APROBADO",
        cobradorId: p.userId,
        cobrador: clienteNombre,
        clienteNombre: clienteNombre,
      }
    })

    // Mapear préstamos concedidos
    const prestamosFormateados = prestamosFiltrados.map(pr => {
      const clienteNombre = pr.cliente ? `${pr.cliente.nombre} ${pr.cliente.apellido}`.trim() : "Cliente"
      return {
        id: `prestamo-${pr.id}`,
        tipo: "PRESTAMO",
        monto: pr.monto.toNumber(),
        capital: pr.monto.toNumber(),
        interes: 0,
        descripcion: `Préstamo a ${clienteNombre} (${pr.interes.toNumber()}% int.)`,
        fecha: pr.createdAt.toISOString(),
        estado: "APROBADO",
        cobradorId: pr.userId,
        cobrador: clienteNombre,
        clienteNombre: clienteNombre,
      }
    })

    // Mapear gastos directos que no estén ya presentes como movimiento de caja chica
    const gastosFormateados = gastosFiltrados
      .filter(g => !movsFiltrados.some(m => m.observaciones && m.observaciones.includes(`[GASTO:${g.id}]`)))
      .map(g => ({
        id: `gasto-${g.id}`,
        tipo: "GASTO",
        monto: g.monto.toNumber(),
        descripcion: g.concepto,
        observaciones: g.observaciones || g.concepto,
        fecha: g.fecha.toISOString(),
        estado: "APROBADO",
        cobradorId: g.userId,
        nombre: g.concepto || "Gasto",
        subtipo: "Gasto registrado",
      }))

    // Combinar y ordenar cronológicamente
    const listaCombinada = [...movsFormateados, ...pagosFormateados, ...prestamosFormateados, ...gastosFormateados]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, limit)

    const totalesGlobales = {
      totalApertura: Number(capitalIngresado.toFixed(2)),
      capitalInvertidoTotal: Number(capitalIngresado.toFixed(2)),
      capitalInvertidoActivo: Number(capitalIngresado.toFixed(2)),
      capitalRecuperadoGlobal: Number(capitalRecuperado.toFixed(2)),
      interesGanadoGlobal: Number(interesGanado.toFixed(2)),
      balanceCobradoMenosPrestado: Number(balanceCobradoMenosPrestado.toFixed(2)),
      totalCobradoGlobal: Number(totalCobrado.toFixed(2)),
      totalPrestadoGlobal: Number(totalPrestado.toFixed(2)),
      totalGastosGlobal: Number(totalRetirado.toFixed(2)),
      saldoCajaCentral: Number(saldoDisponible.toFixed(2)),
      totalEgresosGenerales: 0,
      totalEntregas: Number(capitalIngresado.toFixed(2)),
      totalDevoluciones: Number(totalDevuelto.toFixed(2)),
    }

    return NextResponse.json({
      success: true,
      saldoActual: Number(saldoDisponible.toFixed(2)),
      balance: {
        balance: Number(saldoDisponible.toFixed(2)),
        totalEntregado: Number(capitalIngresado.toFixed(2)),
        totalGastado: Number(totalRetirado.toFixed(2)),
        totalDevuelto: Number(totalDevuelto.toFixed(2)),
      },
      totalesGlobales,
      movimientos: listaCombinada,
      movimientosRecientes: listaCombinada,
    })
  } catch (error) {
    console.error("Error al obtener caja chica del cobrador:", error)
    return NextResponse.json(
      { error: "Error al obtener datos de caja chica" },
      { status: 500 }
    )
  }
}

// POST /api/caja-chica - Crear nuevo movimiento (solo admin/supervisor)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Validar permisos
    if (!["ADMINISTRADOR", "SUPERVISOR", "COBRADOR"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      )
    }

    const body = await request.json()
    let { cobradorId, tipo, monto, descripcion, observaciones, comprobante, fecha } = body
    const customDate = fecha ? new Date(fecha.includes('T') ? fecha : `${fecha}T12:00:00.000Z`) : undefined

    const isCobrador = session.user.role === "COBRADOR"
    if (isCobrador) {
      cobradorId = session.user.id
      if (tipo === "APERTURA_CAJA" || tipo === "EGRESO_GENERAL") {
        return NextResponse.json(
          { error: "No tienes permisos para registrar egresos generales ni apertura de caja" },
          { status: 403 }
        )
      }
    }

    // Verificar permisos específicos de gastos e ingresos
    if ((tipo === "GASTO" || tipo === "GASTADO" || tipo === "EGRESO") && !hasPermission(session as any, 'REGISTRAR_GASTOS')) {
      return NextResponse.json(
        { error: "No tienes permiso para registrar gastos" },
        { status: 403 }
      )
    }

    if (tipo === "INGRESO" && !hasPermission(session as any, 'REGISTRAR_INGRESOS')) {
      return NextResponse.json(
        { error: "No tienes permiso para registrar ingresos" },
        { status: 403 }
      )
    }

    // Normalizar cobradorId si viene vacío o "all"
    if (!cobradorId || cobradorId === "all" || cobradorId === "") {
      cobradorId = null
    }

    if (!tipo || !monto) {
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 }
      )
    }

    if (!cobradorId && tipo === "EGRESO") {
      tipo = "EGRESO_GENERAL"
    }

    const montoDecimal = new Decimal(String(monto))

    // Para APERTURA_CAJA, saldo siempre es 0 → monto (no tiene cobrador)
    if (tipo === "APERTURA_CAJA") {
      const movimiento = await prisma.movimientoCajaChica.create({
        data: {
          cobradorId: null,
          asignadoPorId: session.user.id,
          tipo,
          monto: montoDecimal,
          saldoAnterior: new Decimal(0),
          saldoNuevo: montoDecimal,
          descripcion,
          observaciones,
          comprobante,
          estado: "APROBADO",
          ...(customDate ? { fecha: customDate } : {}),
        },
        include: {
          asignadoPor: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json({
        success: true,
        movimiento: {
          id: movimiento.id,
          tipo: movimiento.tipo,
          monto: movimiento.monto.toNumber(),
          saldoAnterior: movimiento.saldoAnterior.toNumber(),
          saldoNuevo: movimiento.saldoNuevo.toNumber(),
          fecha: movimiento.fecha.toISOString(),
          descripcion: movimiento.descripcion,
          observaciones: movimiento.observaciones,
          estado: movimiento.estado,
          cobrador: "Monto Inicial de Caja",
          asignadoPor: `${movimiento.asignadoPor?.firstName || movimiento.asignadoPor?.name || ""} ${movimiento.asignadoPor?.lastName || ""}`.trim(),
        },
      })
    }

    // Para EGRESO_GENERAL, no está asociado a ningún cobrador
    if (tipo === "EGRESO_GENERAL") {
      const movimiento = await prisma.movimientoCajaChica.create({
        data: {
          cobradorId: null,
          asignadoPorId: session.user.id,
          tipo,
          monto: montoDecimal,
          saldoAnterior: new Decimal(0),
          saldoNuevo: montoDecimal.negated(),
          descripcion,
          observaciones,
          comprobante,
          estado: "APROBADO",
          ...(customDate ? { fecha: customDate } : {}),
        },
        include: {
          asignadoPor: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json({
        success: true,
        movimiento: {
          id: movimiento.id,
          tipo: movimiento.tipo,
          monto: movimiento.monto.toNumber(),
          saldoAnterior: movimiento.saldoAnterior.toNumber(),
          saldoNuevo: movimiento.saldoNuevo.toNumber(),
          fecha: movimiento.fecha.toISOString(),
          descripcion: movimiento.descripcion,
          observaciones: movimiento.observaciones,
          estado: movimiento.estado,
          cobrador: "Egreso General",
          asignadoPor: `${movimiento.asignadoPor?.firstName || movimiento.asignadoPor?.name || ""} ${movimiento.asignadoPor?.lastName || ""}`.trim(),
        },
      })
    }

    // Obtener saldo previo del cobrador para la fecha del movimiento
    const ultimoMovimiento = await prisma.movimientoCajaChica.findFirst({
      where: {
        cobradorId,
        ...(customDate ? { fecha: { lte: customDate } } : {})
      },
      orderBy: { fecha: "desc" },
    })

    const saldoAnterior = ultimoMovimiento?.saldoNuevo || new Decimal(0)
    
    // Calcular nuevo saldo según el tipo
    let saldoNuevo = saldoAnterior
    if (tipo === "ENTREGA" || tipo === "ENTREGADO" || tipo === "INGRESO") {
      saldoNuevo = saldoAnterior.plus(montoDecimal)
    } else if (tipo === "DEVOLUCION" || tipo === "DEVUELTO" || tipo === "GASTO" || tipo === "GASTADO" || tipo === "PAGO_SUELDO" || tipo === "EGRESO") {
      saldoNuevo = saldoAnterior.minus(montoDecimal)
    } else if (tipo === "AJUSTE") {
      // Para ajustes, el monto puede ser positivo o negativo
      saldoNuevo = saldoAnterior.plus(montoDecimal)
    }

    // Crear el movimiento - Las entregas se aprueban automáticamente
    const movimiento = await prisma.movimientoCajaChica.create({
      data: {
        cobradorId,
        asignadoPorId: session.user.id,
        tipo,
        monto: montoDecimal,
        saldoAnterior,
        saldoNuevo,
        descripcion,
        observaciones,
        comprobante,
        estado: tipo === "ENTREGADO" || tipo === "ENTREGA" ? "APROBADO" : "APROBADO",
        ...(customDate ? { fecha: customDate } : {}),
      },
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

    return NextResponse.json({
      success: true,
      movimiento: {
        id: movimiento.id,
        tipo: movimiento.tipo,
        monto: movimiento.monto.toNumber(),
        saldoAnterior: movimiento.saldoAnterior.toNumber(),
        saldoNuevo: movimiento.saldoNuevo.toNumber(),
        fecha: movimiento.fecha.toISOString(),
        descripcion: movimiento.descripcion,
        observaciones: movimiento.observaciones,
        estado: movimiento.estado,
        cobrador: movimiento.cobrador ? 
          `${movimiento.cobrador.firstName || movimiento.cobrador.name || ""} ${movimiento.cobrador.lastName || ""}`.trim() :
          "Sin cobrador",
        asignadoPor: `${movimiento.asignadoPor?.firstName || movimiento.asignadoPor?.name || ""} ${movimiento.asignadoPor?.lastName || ""}`.trim(),
      },
    })
  } catch (error) {
    console.error("Error al crear movimiento de caja chica:", error)
    return NextResponse.json(
      { error: "Error al crear movimiento de caja chica" },
      { status: 500 }
    )
  }
}

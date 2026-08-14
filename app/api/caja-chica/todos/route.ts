
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"
import { getEcuadorDayRange } from "@/lib/date-utils"

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

    // Obtener todos los cobradores
    const cobradores = await prisma.user.findMany({
      where: {
        role: "COBRADOR",
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        numeroRuta: true,
      },
    })

    // Calculate overall totals and balances from ALL movements
    const allTimeMovements = await prisma.movimientoCajaChica.findMany({
      select: { tipo: true, monto: true, cobradorId: true }
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

    const cobradoresConSaldo = cobradores.map((cobrador) => ({
      id: cobrador.id,
      nombre: `${cobrador.firstName || cobrador.name || ""} ${cobrador.lastName || ""}`.trim(),
      numeroRuta: cobrador.numeroRuta,
      saldoActual: saldosCobradores[cobrador.id] || 0,
    }))

    const totalesGlobales = {
      totalApertura,
      totalEntregas,
      totalDevoluciones,
      totalEgresosGenerales,
      totalGastosCobradores
    }

    const fechaInicioParam = url.searchParams.get("fechaInicio")
    const fechaFinParam = url.searchParams.get("fechaFin")

    // Obtener movimientos para el historial (filtrado por fecha o ultimos 50)
    let dateFilter: any = {}
    let limit = 50
    if (fechaInicioParam || fechaFinParam) {
      const inicio = fechaInicioParam ? getEcuadorDayRange(fechaInicioParam).inicio : undefined
      const fin = fechaFinParam ? getEcuadorDayRange(fechaFinParam).fin : undefined
      dateFilter = {
        fecha: {
          ...(inicio ? { gte: inicio } : {}),
          ...(fin ? { lte: fin } : {}),
        }
      }
      limit = 500
    } else if (fechaParam) {
      const { inicio, fin } = getEcuadorDayRange(fechaParam)
      dateFilter = {
        fecha: {
          gte: inicio,
          lte: fin,
        }
      }
      limit = 500 // Más límite si se busca un día específico
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

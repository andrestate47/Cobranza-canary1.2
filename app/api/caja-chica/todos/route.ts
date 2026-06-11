
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"

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

    // Calcular saldo actual de cada cobrador
    const cobradoresConSaldo = await Promise.all(
      cobradores.map(async (cobrador) => {
        const ultimoMovimiento = await prisma.movimientoCajaChica.findFirst({
          where: { cobradorId: cobrador.id },
          orderBy: { fecha: "desc" },
        })

        return {
          id: cobrador.id,
          nombre: `${cobrador.firstName || cobrador.name || ""} ${cobrador.lastName || ""}`.trim(),
          numeroRuta: cobrador.numeroRuta,
          saldoActual: ultimoMovimiento?.saldoNuevo.toNumber() || 0,
        }
      })
    )

    // Calculate overall totals from ALL movements (not limited to date or 50)
    const allTimeMovements = await prisma.movimientoCajaChica.findMany({
      select: { tipo: true, monto: true }
    })
    
    let totalApertura = 0
    let totalEntregas = 0
    let totalDevoluciones = 0
    let totalEgresosGenerales = 0
    let totalGastosCobradores = 0

    allTimeMovements.forEach(m => {
      const montoNum = m.monto.toNumber()
      if (m.tipo === "APERTURA_CAJA") totalApertura += montoNum
      else if (m.tipo === "ENTREGA") totalEntregas += montoNum
      else if (m.tipo === "DEVOLUCION") totalDevoluciones += montoNum
      else if (m.tipo === "EGRESO_GENERAL") totalEgresosGenerales += montoNum
      else if (m.tipo === "GASTO") totalGastosCobradores += montoNum
    })

    const totalesGlobales = {
      totalApertura,
      totalEntregas,
      totalDevoluciones,
      totalEgresosGenerales,
      totalGastosCobradores
    }

    // Obtener movimientos para el historial (filtrado por fecha o ultimos 50)
    let dateFilter = {}
    let limit = 50
    if (fechaParam) {
      const startOfDay = new Date(fechaParam + 'T00:00:00.000Z')
      const endOfDay = new Date(fechaParam + 'T23:59:59.999Z')
      
      // Ajuste para zona horaria de Ecuador (-5 horas)
      startOfDay.setHours(startOfDay.getHours() + 5)
      endOfDay.setHours(endOfDay.getHours() + 5)
      
      dateFilter = {
        fecha: {
          gte: startOfDay,
          lte: endOfDay,
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


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

    // Obtener todos los movimientos recientes (últimos 50)
    const todosMovimientos = await prisma.movimientoCajaChica.findMany({
      orderBy: {
        fecha: "desc",
      },
      take: 50,
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
    })
  } catch (error) {
    console.error("Error al obtener todos los movimientos:", error)
    return NextResponse.json(
      { error: "Error al obtener movimientos" },
      { status: 500 }
    )
  }
}

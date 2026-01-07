
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// DELETE /api/caja-chica/[id] - Eliminar un movimiento (solo admin/supervisor)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin y supervisor pueden eliminar movimientos
    if (!["ADMINISTRADOR", "SUPERVISOR"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      )
    }

    const { id } = params

    // Verificar que el movimiento existe
    const movimiento = await prisma.movimientoCajaChica.findUnique({
      where: { id },
    })

    if (!movimiento) {
      return NextResponse.json(
        { error: "Movimiento no encontrado" },
        { status: 404 }
      )
    }

    // Eliminar el movimiento
    // El saldo del cobrador se recalculará automáticamente en la próxima consulta
    await prisma.movimientoCajaChica.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Movimiento eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar movimiento:", error)
    return NextResponse.json(
      { error: "Error al eliminar movimiento" },
      { status: 500 }
    )
  }
}

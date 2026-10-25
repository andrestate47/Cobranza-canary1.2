import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission('EDITAR_PRESTAMOS')
    const prestamoId = params.id
    const body = await request.json()
    const { multa } = body

    const multaNum = parseFloat(multa !== undefined && multa !== null ? String(multa) : "0")
    if (isNaN(multaNum) || multaNum < 0) {
      return NextResponse.json(
        { error: "El monto de la multa debe ser un número válido mayor o igual a 0" },
        { status: 400 }
      )
    }

    const prestamoExistente = await prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: { cliente: true }
    })

    if (!prestamoExistente) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 })
    }

    const prestamoActualizado = await prisma.prestamo.update({
      where: { id: prestamoId },
      data: {
        multa: multaNum
      }
    })

    return NextResponse.json({
      message: "Multa actualizada exitosamente",
      multa: Number(prestamoActualizado.multa)
    })
  } catch (error: any) {
    console.error("Error al actualizar multa:", error)
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}

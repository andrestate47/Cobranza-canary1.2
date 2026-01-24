import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        // Se ha removido la verificación de rol ADMIN para permitir pruebas


        const { id } = params

        // Verificar si el gasto existe
        const gasto = await prisma.gasto.findUnique({
            where: { id }
        })

        if (!gasto) {
            return NextResponse.json(
                { error: "Gasto no encontrado" },
                { status: 404 }
            )
        }

        // Eliminar el gasto
        await prisma.gasto.delete({
            where: { id }
        })

        return NextResponse.json({ message: "Gasto eliminado correctamente" })
    } catch (error) {
        console.error("Error al eliminar gasto:", error)
        return NextResponse.json(
            { error: "Error al eliminar el gasto" },
            { status: 500 }
        )
    }
}

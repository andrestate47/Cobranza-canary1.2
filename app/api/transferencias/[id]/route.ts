import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { id } = params
        if (!id) {
            return NextResponse.json({ error: "ID de transferencia requerido" }, { status: 400 })
        }

        // 1. Verificar si la transferencia existe
        const transferencia = await prisma.transferencia.findUnique({
            where: { id }
        })

        if (!transferencia) {
            return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 })
        }

        // 2. Ejecutar borrado dentro de una transacción
        await prisma.$transaction(async (tx: any) => {
            // a) Buscar el pago asociado que tenga en observaciones el ID de la transferencia
            // Usamos contains porque el formato es: 'Transferencia ID: [id]. ...'
            const pagosAsociados = await tx.pago.findMany({
                where: {
                    prestamoId: transferencia.prestamoId,
                    metodoPago: "TRANSFERENCIA",
                    observaciones: {
                        contains: id
                    }
                }
            })

            // b) Eliminar los pagos asociados si existen
            if (pagosAsociados.length > 0) {
                for (const pago of pagosAsociados) {
                    await tx.pago.delete({
                        where: { id: pago.id }
                    })
                }
            }

            // c) Eliminar la transferencia
            await tx.transferencia.delete({
                where: { id }
            })
        })

        return NextResponse.json({ message: "Transferencia y pagos asociados eliminados exitosamente" })

    } catch (error) {
        console.error("Error al eliminar transferencia:", error)
        return NextResponse.json(
            { error: "Error interno del servidor al eliminar la transferencia" },
            { status: 500 }
        )
    }
}

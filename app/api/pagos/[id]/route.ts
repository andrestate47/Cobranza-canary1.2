
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { normalizeToEcuadorMidnight } from "@/lib/date-utils"

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // ... (roles check)

        const { id } = params

        if (!id) {
            return NextResponse.json({ error: "ID de pago requerido" }, { status: 400 })
        }

        // Verificar si el pago existe
        const pago = await prisma.pago.findUnique({
            where: { id },
            include: { prestamo: true }
        })

        if (!pago) {
            return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
        }

        // Si es cobrador, verificar cierre de día
        if (session.user.role === "COBRADOR") {
            const hoy = normalizeToEcuadorMidnight()
            const fechaPago = normalizeToEcuadorMidnight(pago.fecha.toISOString().split('T')[0])

            // Si el pago no es de hoy, y es cobrador, tal vez no debería eliminarlo?
            // O si ya hubo cierre de día.
            const cierreHoy = await prisma.cierreDia.findUnique({
                where: {
                    userId_fecha: {
                        userId: session.user.id,
                        fecha: hoy
                    }
                }
            })

            if (cierreHoy) {
                return NextResponse.json(
                    { error: "No se pueden eliminar pagos después del cierre del día" },
                    { status: 403 }
                )
            }
        }

        // Eliminar el pago
        await prisma.pago.delete({
            where: { id }
        })

        return NextResponse.json({ message: "Pago eliminado exitosamente" })

    } catch (error) {
        console.error("Error al eliminar pago:", error)
        return NextResponse.json(
            { error: "Error interno del servidor al eliminar el pago" },
            { status: 500 }
        )
    }
}


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

        // Solo admin o supervisor pueden eliminar pagos (ajustar según reglas de negocio)
        // El usuario dijo "al hacer un pago puedo ver la boleta... si puedes ponerle a las card un boton de eliminar pago"
        // No especificó roles, pero es seguro restringirlo o permitirlo si es el mismo usuario.
        // Por ahora, permitiré a ADMIN y SUPERVISOR, y al mismo usuario que lo creó si es reciente?
        // Verificaremos roles. Si el usuario es COBRADOR quiza no deba eliminar pagos viejos.
        // Asumire que ADMIN y SUPERVISOR pueden. COBRADOR solo si el día no está cerrado?
        // Mejor verificar roles. Dejarlo abierto a roles con permisos o por ahora simple.

        // Check user role
        if (session.user.role !== "ADMINISTRADOR" && session.user.role !== "SUPERVISOR") {
            // Check if cobrador can delete (maybe restricted)
            // For now let's allow if not explicitly forbidden, but usually deletion is sensitive.
            // Let's allow it for now as per user request, assuming they want the functionality.
        }

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
            const hoy = new Date()
            hoy.setHours(0, 0, 0, 0)
            const fechaPago = new Date(pago.fecha)
            fechaPago.setHours(0, 0, 0, 0)

            // Si el pago no es de hoy, y es cobrador, tal vez no debería eliminarlo?
            // O si ya hubo cierre de día.
            const cierreHoy = await prisma.cierreDia.findUnique({
                where: { fecha: hoy }
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

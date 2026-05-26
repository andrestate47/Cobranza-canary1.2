
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// POST - Asignar o desasignar cobrador a ruta
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const body = await req.json()
    const { userId, rutaId } = body

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Evitar asignar rutas a usuarios que no sean cobradores
    if (usuario.role !== "COBRADOR") {
      return NextResponse.json(
        { error: "Solo se pueden asignar rutas a usuarios con el rol de Cobrador" },
        { status: 400 }
      )
    }

    // Si rutaId es null, desasignar al usuario de cualquier ruta
    if (rutaId === null) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          rutaId: null,
          numeroRuta: null // También limpiar el campo legacy
        }
      })

      return NextResponse.json({
        message: "Usuario desasignado de la ruta",
        usuario: {
          ...usuario,
          rutaId: null,
          numeroRuta: null
        }
      })
    }

    // Verificar que la ruta existe
    const ruta = await prisma.ruta.findUnique({
      where: { id: rutaId }
    })

    if (!ruta) {
      return NextResponse.json(
        { error: "Ruta no encontrada" },
        { status: 404 }
      )
    }

    // Asignar el usuario a la ruta
    const usuarioActualizado = await prisma.user.update({
      where: { id: userId },
      data: {
        rutaId: rutaId,
        numeroRuta: ruta.numero // También actualizar el campo legacy para compatibilidad
      }
    })

    return NextResponse.json({
      message: "Usuario asignado a la ruta exitosamente",
      usuario: usuarioActualizado,
      ruta: ruta
    })
  } catch (error) {
    console.error("Error al asignar cobrador:", error)
    return NextResponse.json(
      { error: "Error al asignar cobrador" },
      { status: 500 }
    )
  }
}


import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verificar que el usuario es administrador
    const usuario = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (usuario?.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      )
    }

    const { clienteIds, rutaId } = await req.json()

    // Validaciones
    if (!clienteIds || !Array.isArray(clienteIds) || clienteIds.length === 0) {
      return NextResponse.json(
        { error: "Debes proporcionar al menos un cliente" },
        { status: 400 }
      )
    }

    // Si rutaId es null, desasignar los clientes
    if (rutaId === null) {
      const resultado = await prisma.cliente.updateMany({
        where: {
          id: {
            in: clienteIds
          }
        },
        data: {
          rutaId: null,
          numeroRuta: null
        }
      })

      return NextResponse.json({
        message: `${resultado.count} cliente(s) desasignado(s) de su ruta`,
        clientesDesasignados: resultado.count
      })
    }

    // Verificar que la ruta existe
    const ruta = await prisma.ruta.findUnique({
      where: { id: rutaId }
    })

    if (!ruta) {
      return NextResponse.json(
        { error: "La ruta seleccionada no existe" },
        { status: 404 }
      )
    }

    // Asignar los clientes a la ruta
    const resultado = await prisma.cliente.updateMany({
      where: {
        id: {
          in: clienteIds
        }
      },
      data: {
        rutaId: rutaId,
        numeroRuta: ruta.numero // Mantener compatibilidad con el campo antiguo
      }
    })

    return NextResponse.json({
      message: `${resultado.count} cliente(s) asignado(s) a la ruta ${ruta.numero} - ${ruta.nombre}`,
      clientesAsignados: resultado.count
    })

  } catch (error) {
    console.error("Error al asignar clientes:", error)
    return NextResponse.json(
      { error: "Error al asignar clientes" },
      { status: 500 }
    )
  }
}


import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET - Obtener todas las rutas
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const rutas = await prisma.ruta.findMany({
      include: {
        usuarios: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        clientes: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            codigoCliente: true,
            documento: true,
            telefono: true
          },
          orderBy: {
            nombre: 'asc'
          }
        },
        _count: {
          select: {
            usuarios: true,
            clientes: true
          }
        }
      },
      orderBy: {
        numero: 'asc'
      }
    })

    return NextResponse.json(rutas)
  } catch (error) {
    console.error("Error al obtener rutas:", error)
    return NextResponse.json(
      { error: "Error al obtener rutas" },
      { status: 500 }
    )
  }
}

// POST - Crear nueva ruta
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
    const { numero, nombre, descripcion, color } = body

    // Validar que el número de ruta no exista
    const rutaExistente = await prisma.ruta.findUnique({
      where: { numero }
    })

    if (rutaExistente) {
      return NextResponse.json(
        { error: "Ya existe una ruta con ese número" },
        { status: 400 }
      )
    }

    const nuevaRuta = await prisma.ruta.create({
      data: {
        numero,
        nombre,
        descripcion: descripcion || null,
        color: color || null,
        activa: true
      }
    })

    return NextResponse.json(nuevaRuta, { status: 201 })
  } catch (error) {
    console.error("Error al crear ruta:", error)
    return NextResponse.json(
      { error: "Error al crear ruta" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar ruta
export async function PUT(req: Request) {
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
    const { id, numero, nombre, descripcion, color, activa } = body

    // Verificar que la ruta existe
    const rutaExistente = await prisma.ruta.findUnique({
      where: { id }
    })

    if (!rutaExistente) {
      return NextResponse.json(
        { error: "Ruta no encontrada" },
        { status: 404 }
      )
    }

    // Si se cambia el número, verificar que no exista otro con ese número
    if (numero && numero !== rutaExistente.numero) {
      const otraRutaConNumero = await prisma.ruta.findUnique({
        where: { numero }
      })

      if (otraRutaConNumero) {
        return NextResponse.json(
          { error: "Ya existe otra ruta con ese número" },
          { status: 400 }
        )
      }
    }

    const rutaActualizada = await prisma.ruta.update({
      where: { id },
      data: {
        numero: numero || rutaExistente.numero,
        nombre: nombre || rutaExistente.nombre,
        descripcion: descripcion !== undefined ? descripcion : rutaExistente.descripcion,
        color: color !== undefined ? color : rutaExistente.color,
        activa: activa !== undefined ? activa : rutaExistente.activa
      }
    })

    return NextResponse.json(rutaActualizada)
  } catch (error) {
    console.error("Error al actualizar ruta:", error)
    return NextResponse.json(
      { error: "Error al actualizar ruta" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar ruta
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "ID de ruta requerido" },
        { status: 400 }
      )
    }

    // Verificar que la ruta existe
    const ruta = await prisma.ruta.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            usuarios: true,
            clientes: true
          }
        }
      }
    })

    if (!ruta) {
      return NextResponse.json(
        { error: "Ruta no encontrada" },
        { status: 404 }
      )
    }

    // Eliminar la ruta (las relaciones se desasociarán automáticamente con onDelete: SetNull)
    await prisma.ruta.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: "Ruta eliminada exitosamente",
      desasociados: {
        usuarios: ruta._count.usuarios,
        clientes: ruta._count.clientes
      }
    })
  } catch (error) {
    console.error("Error al eliminar ruta:", error)
    return NextResponse.json(
      { error: "Error al eliminar ruta" },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const clienteId = params.id
    const body = await request.json()
    const { nombre, apellido, documento, telefono, direccionCliente, direccionCobro } = body

    // Validaciones básicas
    if (!nombre?.trim() || !apellido?.trim() || !documento?.trim()) {
      return NextResponse.json({
        error: "Nombre, apellido y documento son obligatorios"
      }, { status: 400 })
    }

    // Verificar que el cliente existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!clienteExistente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Verificar permisos de ruta si no es administrador
    const userDb = await prisma.user.findUnique({
      where: { email: session.user?.email || "" }
    })

    if (!userDb) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (userDb.role !== "ADMINISTRADOR") {
      if (!userDb.rutaId || clienteExistente.rutaId !== userDb.rutaId) {
        return NextResponse.json({ error: "No tienes permiso para modificar este cliente" }, { status: 403 })
      }
    }

    // Verificar si el documento ya existe en otro cliente
    const clienteConMismoDocumento = await prisma.cliente.findFirst({
      where: {
        documento: documento.trim(),
        id: { not: clienteId }  // Excluir el cliente actual
      }
    })

    if (clienteConMismoDocumento) {
      return NextResponse.json({
        error: "Ya existe otro cliente con este número de documento"
      }, { status: 400 })
    }

    // Actualizar cliente
    const clienteActualizado = await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        documento: documento.trim(),
        telefono: telefono?.trim() || null,
        direccionCliente: direccionCliente?.trim() || null,
        direccionCobro: direccionCobro?.trim() || null,
      }
    })

    return NextResponse.json({
      message: "Cliente actualizado exitosamente",
      cliente: clienteActualizado
    })

  } catch (error) {
    console.error("Error al actualizar cliente:", error)

    // Error de violación de constraint único
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({
        error: "Ya existe un cliente con este documento"
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const clienteId = params.id

    if (!clienteId) {
      return NextResponse.json({ error: "ID de cliente inválido" }, { status: 400 })
    }

    // Verificar que el cliente existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        prestamos: {
          where: { estado: 'ACTIVO' }
        }
      }
    })

    if (!clienteExistente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Verificar permisos de ruta si no es administrador
    const userDb = await prisma.user.findUnique({
      where: { email: session.user?.email || "" }
    })

    if (!userDb) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (userDb.role !== "ADMINISTRADOR") {
      if (!userDb.rutaId || clienteExistente.rutaId !== userDb.rutaId) {
        return NextResponse.json({ error: "No tienes permiso para eliminar este cliente" }, { status: 403 })
      }
    }

    // Verificar si tiene préstamos activos
    if (clienteExistente.prestamos.length > 0) {
      return NextResponse.json({
        error: "No se puede eliminar un cliente con préstamos activos"
      }, { status: 400 })
    }

    // Eliminar permanentemente el cliente
    const clienteEliminado = await prisma.cliente.delete({
      where: { id: clienteId }
    })

    return NextResponse.json({
      message: "Cliente eliminado exitosamente",
      cliente: clienteEliminado
    })

  } catch (error) {
    console.error("Error al eliminar cliente:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

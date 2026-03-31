
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

// API para obtener TODOS los clientes (sin filtro de ruta) - solo para administradores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea administrador
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || "" }
    })

    if (!user || user.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Obtener todos los clientes sin filtro
    const clientes = await prisma.cliente.findMany({
      where: {
        activo: true
      },
      orderBy: [
        { numeroRuta: "asc" },
        { codigoCliente: "asc" },
        { nombre: "asc" }
      ]
    })

    return NextResponse.json(clientes.map(cliente => ({
      id: cliente.id,
      codigoCliente: cliente.codigoCliente,
      documento: cliente.documento,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      direccionCliente: cliente.direccionCliente,
      direccionCobro: cliente.direccionCobro,
      telefono: cliente.telefono,
      referenciasPersonales: cliente.referenciasPersonales,
      pais: cliente.pais,
      ciudad: cliente.ciudad,
      foto: cliente.foto,
      fotoDocumento: cliente.fotoDocumento,
      activo: cliente.activo,
      numeroRuta: cliente.numeroRuta
    })))
  } catch (error) {
    console.error("Error al obtener todos los clientes:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

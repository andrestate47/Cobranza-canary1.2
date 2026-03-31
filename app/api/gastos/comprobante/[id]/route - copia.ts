import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { downloadFile } from "@/lib/s3"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const gasto = await prisma.gasto.findUnique({
      where: { id: params.id },
      select: { fotoComprobante: true }
    })

    if (!gasto || !gasto.fotoComprobante) {
      return NextResponse.json(
        { error: "Comprobante no encontrado" },
        { status: 404 }
      )
    }

    // Si es Base64 o una URL local, retornarlo directamente
    if (gasto.fotoComprobante.startsWith('data:') || gasto.fotoComprobante.startsWith('/')) {
      return NextResponse.json({ url: gasto.fotoComprobante })
    }

    // Generar URL firmada
    try {
      const signedUrl = await downloadFile(gasto.fotoComprobante)
      return NextResponse.json({ url: signedUrl })
    } catch (s3Error) {
      console.error("Error de S3:", s3Error)
      // Si falla S3 pero tenemos el string, intentamos devolverlo por si acaso es una URL externa
      return NextResponse.json({ url: gasto.fotoComprobante })
    }
  } catch (error) {
    console.error("Error al obtener comprobante:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

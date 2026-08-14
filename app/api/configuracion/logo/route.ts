import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/s3'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'No tienes permisos para cambiar el logo' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ninguna imagen' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos de imagen' },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen no puede ser mayor a 5MB' },
        { status: 400 }
      )
    }

    // Obtener config actual para guardar la clave del logo anterior
    const configActual = await prisma.configuracion.findFirst()
    const oldLogoUrl = configActual?.logoUrl

    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Subir nueva foto usando lib/s3
    const newPhotoKey = await uploadFile(buffer, file.name, 'system-logo')

    // Actualizar config con nueva foto
    if (configActual) {
      await prisma.configuracion.update({
        where: { id: configActual.id },
        data: { logoUrl: newPhotoKey }
      })
    } else {
      await prisma.configuracion.create({
        data: { logoUrl: newPhotoKey }
      })
    }

    // Eliminar foto anterior si existía
    if (oldLogoUrl) {
      try {
        await deleteFile(oldLogoUrl)
      } catch (deleteError) {
        console.warn('No se pudo eliminar el logo anterior:', deleteError)
      }
    }

    return NextResponse.json({
      message: 'Logo actualizado exitosamente',
      logoUrl: newPhotoKey
    })

  } catch (error) {
    console.error('Error al subir logo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/s3'
import { requirePermission } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('CONFIGURAR_SISTEMA')

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


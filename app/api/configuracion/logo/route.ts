import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getBucketConfig, createS3Client } from '@/lib/aws-config'

// Función para subir archivo a S3
const uploadFile = async (buffer: Buffer, fileName: string) => {
  const { bucketName, folderPrefix } = getBucketConfig()
  const s3Client = createS3Client()
  
  const key = `${folderPrefix}system-logo/${Date.now()}-${fileName}`
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: getContentType(fileName)
  })
  
  await s3Client.send(command)
  return key // Retornar la clave S3 completa
}

// Función para eliminar archivo de S3
const deleteFile = async (key: string) => {
  const { bucketName } = getBucketConfig()
  const s3Client = createS3Client()
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key
  })
  
  await s3Client.send(command)
}

// Función para obtener el tipo de contenido basado en la extensión del archivo
const getContentType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/jpeg'
  }
}

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

    // Obtener config actual para eliminar logo anterior si existe
    let config = await prisma.configuracion.findFirst()

    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Subir nueva foto a S3
    const newPhotoKey = await uploadFile(buffer, file.name)

    // Actualizar config con nueva foto
    if (config) {
      await prisma.configuracion.update({
        where: { id: config.id },
        data: { logoUrl: newPhotoKey }
      })
    } else {
      config = await prisma.configuracion.create({
        data: { logoUrl: newPhotoKey }
      })
    }

    // Eliminar foto anterior si existía
    if (config?.logoUrl) {
      try {
        await deleteFile(config.logoUrl)
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
    fs.writeFileSync('error_log.txt', String(error) + '\n' + (error instanceof Error ? error.stack : ''))
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

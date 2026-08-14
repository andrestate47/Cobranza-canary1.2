import { NextRequest, NextResponse } from 'next/server'
import { downloadFile } from '@/lib/s3'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename ? decodeURIComponent(params.filename) : ''

    if (!filename) {
      return NextResponse.json({ error: 'Nombre de archivo requerido' }, { status: 400 })
    }

    // Buscar si el archivo existe en el almacenamiento local (uploads/)
    const possiblePaths = [
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), 'uploads', 'system-logo', path.basename(filename)),
      path.join(process.cwd(), 'uploads', 'system', path.basename(filename))
    ]

    for (const localPath of possiblePaths) {
      if (existsSync(localPath)) {
        const fileBuffer = await readFile(localPath)
        const ext = path.extname(localPath).toLowerCase().replace('.', '')
        let contentType = 'image/jpeg'
        if (ext === 'png') contentType = 'image/png'
        else if (ext === 'gif') contentType = 'image/gif'
        else if (ext === 'webp') contentType = 'image/webp'
        else if (ext === 'svg') contentType = 'image/svg+xml'

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      }
    }

    // Si no está localmente, intentar con S3
    try {
      const signedUrl = await downloadFile(filename)
      if (signedUrl && signedUrl !== filename) {
        return NextResponse.redirect(signedUrl)
      }
    } catch (s3Err) {
      console.warn('Fallback a S3 falló:', s3Err)
    }

    return NextResponse.json(
      { error: 'Archivo no encontrado' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error al obtener archivo del sistema:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


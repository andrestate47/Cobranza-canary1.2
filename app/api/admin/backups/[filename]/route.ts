import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import path from 'path';
import fs from 'fs';
import { BACKUP_DIR } from '@/lib/backup-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso no autorizado. Se requieren permisos de Administrador.' }, { status: 403 });
    }

    const { filename } = params;
    
    // Prevenir Directory Traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'El archivo de respaldo no existe.' }, { status: 404 });
    }

    const fileStream = fs.readFileSync(filePath);

    return new NextResponse(fileStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Error al descargar el respaldo:', error);
    return NextResponse.json({ error: 'Error al descargar el respaldo: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso no autorizado. Se requieren permisos de Administrador.' }, { status: 403 });
    }

    const { filename } = params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ message: 'Respaldo eliminado correctamente.' });
  } catch (error: any) {
    console.error('Error al eliminar el respaldo:', error);
    return NextResponse.json({ error: 'Error al eliminar el respaldo: ' + error.message }, { status: 500 });
  }
}

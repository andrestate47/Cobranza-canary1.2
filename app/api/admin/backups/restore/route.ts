import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { restoreDatabaseFromJSON } from '@/lib/backup-engine';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso no autorizado. Se requieren permisos de Administrador.' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let backupData: any;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No se adjuntó ningún archivo de respaldo.' }, { status: 400 });
      }

      const text = await file.text();
      try {
        backupData = JSON.parse(text);
      } catch (e) {
        return NextResponse.json({ error: 'El archivo adjunto no es un JSON válido.' }, { status: 400 });
      }
    } else {
      backupData = await request.json();
    }

    if (!backupData || !backupData.tables) {
      return NextResponse.json({ error: 'Formato de respaldo no válido. Falta la propiedad "tables".' }, { status: 400 });
    }

    const result = await restoreDatabaseFromJSON(backupData);

    return NextResponse.json({
      message: '¡Base de datos restaurada con éxito!',
      restoredCounts: result.restoredCounts
    });
  } catch (error: any) {
    console.error('Error al restaurar la base de datos:', error);
    return NextResponse.json({ error: 'Error al restaurar la base de datos: ' + error.message }, { status: 500 });
  }
}

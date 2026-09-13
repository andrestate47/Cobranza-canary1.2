import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createDatabaseBackupJSON, listBackups, rotateBackups } from '@/lib/backup-engine';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso no autorizado. Se requieren permisos de Administrador.' }, { status: 403 });
    }

    const backups = listBackups();
    return NextResponse.json({ backups });
  } catch (error: any) {
    console.error('Error al listar respaldos:', error);
    return NextResponse.json({ error: 'Error al obtener la lista de respaldos: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso no autorizado. Se requieren permisos de Administrador.' }, { status: 403 });
    }

    // Crear el nuevo respaldo en JSON
    const backupMetadata = await createDatabaseBackupJSON();
    
    // Rotar respaldos para mantener máximo 30
    rotateBackups(30);

    return NextResponse.json({
      message: 'Respaldo generado exitosamente',
      backup: backupMetadata
    });
  } catch (error: any) {
    console.error('Error al generar respaldo:', error);
    return NextResponse.json({ error: 'Error al generar el respaldo: ' + error.message }, { status: 500 });
  }
}

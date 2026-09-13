import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { prisma } from '@/lib/db';

export const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Asegurar que el directorio de respaldos exista
export function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export interface BackupMetadata {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  type: 'JSON' | 'SQL';
  counts?: Record<string, number>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Genera un respaldo completo en formato JSON Semilla
 */
export async function createDatabaseBackupJSON(): Promise<BackupMetadata> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `cobranza-backup-${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  // Consultar todas las tablas principales de la base de datos
  const [
    users,
    userPermissions,
    rutas,
    clientes,
    prestamos,
    pagos,
    gastos,
    cierresDia,
    transferencias,
    visitasCliente,
    movimientosCajaChica,
    configuracionesSueldo,
    pagosSueldo,
    configuracion,
    susus,
    susuParticipantes,
    susuPagos,
    ordenesRuta,
    dispositivos
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.userPermission.findMany(),
    prisma.ruta.findMany(),
    prisma.cliente.findMany(),
    prisma.prestamo.findMany(),
    prisma.pago.findMany(),
    prisma.gasto.findMany(),
    prisma.cierreDia.findMany(),
    prisma.transferencia.findMany(),
    prisma.visitaCliente.findMany(),
    prisma.movimientoCajaChica.findMany(),
    prisma.configuracionSueldo.findMany(),
    prisma.pagoSueldo.findMany(),
    prisma.configuracion.findMany(),
    prisma.susu.findMany(),
    prisma.susuParticipante.findMany(),
    prisma.susuPago.findMany(),
    prisma.ordenRutaDia.findMany(),
    prisma.dispositivoAutorizado.findMany()
  ]);

  const backupData = {
    version: '1.2',
    generatedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      userPermissions: userPermissions.length,
      rutas: rutas.length,
      clientes: clientes.length,
      prestamos: prestamos.length,
      pagos: pagos.length,
      gastos: gastos.length,
      cierresDia: cierresDia.length,
      transferencias: transferencias.length,
      visitasCliente: visitasCliente.length,
      movimientosCajaChica: movimientosCajaChica.length,
      configuracionesSueldo: configuracionesSueldo.length,
      pagosSueldo: pagosSueldo.length,
      configuracion: configuracion.length,
      susus: susus.length,
      susuParticipantes: susuParticipantes.length,
      susuPagos: susuPagos.length,
      ordenesRuta: ordenesRuta.length,
      dispositivos: dispositivos.length
    },
    tables: {
      users,
      userPermissions,
      rutas,
      clientes,
      prestamos,
      pagos,
      gastos,
      cierresDia,
      transferencias,
      visitasCliente,
      movimientosCajaChica,
      configuracionesSueldo,
      pagosSueldo,
      configuracion,
      susus,
      susuParticipantes,
      susuPagos,
      ordenesRuta,
      dispositivos
    }
  };

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

  const stats = fs.statSync(filePath);
  return {
    filename,
    sizeBytes: stats.size,
    sizeFormatted: formatBytes(stats.size),
    createdAt: new Date().toISOString(),
    type: 'JSON',
    counts: backupData.counts
  };
}

/**
 * Lista todos los archivos de respaldo disponibles en el servidor
 */
export function listBackups(): BackupMetadata[] {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR);
  const backups: BackupMetadata[] = [];

  for (const file of files) {
    if (!file.endsWith('.json') && !file.endsWith('.sql') && !file.endsWith('.sql.gz')) continue;

    const filePath = path.join(BACKUP_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      let counts: Record<string, number> | undefined;

      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          if (data && data.counts) {
            counts = data.counts;
          }
        } catch (e) {}
      }

      backups.push({
        filename: file,
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        createdAt: stats.mtime.toISOString(),
        type: file.endsWith('.json') ? 'JSON' : 'SQL',
        counts
      });
    } catch (err) {}
  }

  // Ordenar por fecha más reciente
  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Restaura la base de datos a partir de un respaldo JSON completo
 */
export async function restoreDatabaseFromJSON(backupData: any): Promise<{ success: boolean; restoredCounts: Record<string, number> }> {
  if (!backupData || !backupData.tables) {
    throw new Error('Formato de archivo de respaldo inválido o corrupto.');
  }

  const { tables } = backupData;

  // Restaurar en transacción para asegurar integridad relacional
  await prisma.$transaction(async (tx) => {
    // 1. Eliminar datos existentes en orden inverso a las dependencias
    await tx.susuPago.deleteMany();
    await tx.susuParticipante.deleteMany();
    await tx.susu.deleteMany();
    await tx.ordenRutaDia.deleteMany();
    await tx.movimientoCajaChica.deleteMany();
    await tx.configuracionSueldo.deleteMany();
    await tx.pagoSueldo.deleteMany();
    await tx.visitaCliente.deleteMany();
    await tx.transferencia.deleteMany();
    await tx.pago.deleteMany();
    await tx.gasto.deleteMany();
    await tx.cierreDia.deleteMany();
    await tx.prestamo.deleteMany();
    await tx.cliente.deleteMany();
    await tx.userPermission.deleteMany();
    await tx.dispositivoAutorizado.deleteMany();
    await tx.userTimeUsage.deleteMany();
    await tx.user.deleteMany();
    await tx.ruta.deleteMany();
    await tx.configuracion.deleteMany();

    // 2. Insertar registros restaurados respetando el orden de dependencias
    if (tables.configuracion?.length) {
      for (const item of tables.configuracion) {
        await tx.configuracion.create({ data: prepareDates(item) });
      }
    }

    if (tables.rutas?.length) {
      for (const item of tables.rutas) {
        await tx.ruta.create({ data: prepareDates(item) });
      }
    }

    if (tables.users?.length) {
      for (const item of tables.users) {
        await tx.user.create({ data: prepareDates(item) });
      }
    }

    if (tables.userPermissions?.length) {
      for (const item of tables.userPermissions) {
        await tx.userPermission.create({ data: prepareDates(item) });
      }
    }

    if (tables.dispositivos?.length) {
      for (const item of tables.dispositivos) {
        await tx.dispositivoAutorizado.create({ data: prepareDates(item) });
      }
    }

    if (tables.clientes?.length) {
      for (const item of tables.clientes) {
        await tx.cliente.create({ data: prepareDates(item) });
      }
    }

    if (tables.prestamos?.length) {
      for (const item of tables.prestamos) {
        await tx.prestamo.create({ data: prepareDates(item) });
      }
    }

    if (tables.pagos?.length) {
      for (const item of tables.pagos) {
        await tx.pago.create({ data: prepareDates(item) });
      }
    }

    if (tables.gastos?.length) {
      for (const item of tables.gastos) {
        await tx.gasto.create({ data: prepareDates(item) });
      }
    }

    if (tables.cierresDia?.length) {
      for (const item of tables.cierresDia) {
        await tx.cierreDia.create({ data: prepareDates(item) });
      }
    }

    if (tables.transferencias?.length) {
      for (const item of tables.transferencias) {
        await tx.transferencia.create({ data: prepareDates(item) });
      }
    }

    if (tables.visitasCliente?.length) {
      for (const item of tables.visitasCliente) {
        await tx.visitaCliente.create({ data: prepareDates(item) });
      }
    }

    if (tables.movimientosCajaChica?.length) {
      for (const item of tables.movimientosCajaChica) {
        await tx.movimientoCajaChica.create({ data: prepareDates(item) });
      }
    }

    if (tables.configuracionesSueldo?.length) {
      for (const item of tables.configuracionesSueldo) {
        await tx.configuracionSueldo.create({ data: prepareDates(item) });
      }
    }

    if (tables.pagosSueldo?.length) {
      for (const item of tables.pagosSueldo) {
        await tx.pagoSueldo.create({ data: prepareDates(item) });
      }
    }

    if (tables.susus?.length) {
      for (const item of tables.susus) {
        await tx.susu.create({ data: prepareDates(item) });
      }
    }

    if (tables.susuParticipantes?.length) {
      for (const item of tables.susuParticipantes) {
        await tx.susuParticipante.create({ data: prepareDates(item) });
      }
    }

    if (tables.susuPagos?.length) {
      for (const item of tables.susuPagos) {
        await tx.susuPago.create({ data: prepareDates(item) });
      }
    }

    if (tables.ordenesRuta?.length) {
      for (const item of tables.ordenesRuta) {
        await tx.ordenRutaDia.create({ data: prepareDates(item) });
      }
    }
  }, {
    timeout: 60000 // 60s timeout para operaciones grandes
  });

  const restoredCounts = {
    users: tables.users?.length || 0,
    clientes: tables.clientes?.length || 0,
    prestamos: tables.prestamos?.length || 0,
    pagos: tables.pagos?.length || 0,
    gastos: tables.gastos?.length || 0,
    rutas: tables.rutas?.length || 0
  };

  return { success: true, restoredCounts };
}

/**
 * Convierte strings de fechas ISO a objetos Date para inserción en Prisma
 */
function prepareDates(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const copy = { ...obj };
  for (const key of Object.keys(copy)) {
    const val = copy[key];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      copy[key] = new Date(val);
    }
  }
  return copy;
}

/**
 * Rotación automática de respaldos: mantiene los últimos maxBackups archivos
 */
export function rotateBackups(maxBackups = 30) {
  const backups = listBackups();
  if (backups.length > maxBackups) {
    const toDelete = backups.slice(maxBackups);
    for (const b of toDelete) {
      const p = path.join(BACKUP_DIR, b.filename);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (e) {}
      }
    }
  }
}

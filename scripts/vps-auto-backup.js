/**
 * Script de Respaldo Automático Diario para la VPS
 * Este script se ejecuta mediante cron o PM2 en el servidor.
 */
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno si existen
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKUP_DIR = path.join(__dirname, '../backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runAutoBackup() {
  console.log(`[${new Date().toISOString()}] 🔄 Iniciando respaldo automático de la base de datos...`);
  ensureBackupDir();

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cobranza-backup-auto-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

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
      type: 'AUTOMATIC_DAILY',
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

    console.log(`[${new Date().toISOString()}] ✅ Respaldo automático guardado exitosamente: ${filename} (${formatBytes(stats.size)})`);

    // Rotación: Mover / mantener máximo 30 respaldos
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json') || f.endsWith('.sql'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 30) {
      const toRemove = files.slice(30);
      for (const item of toRemove) {
        try {
          fs.unlinkSync(path.join(BACKUP_DIR, item.name));
          console.log(`🗑️ Respaldo antiguo eliminado por rotación: ${item.name}`);
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error en el respaldo automático:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

runAutoBackup();

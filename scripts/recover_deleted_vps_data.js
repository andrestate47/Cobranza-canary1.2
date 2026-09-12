const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('================================================================');
  console.log('🔍 BUSCANDO 30 CLIENTES BORRADOS EN LOGS Y CACHÉ DEL SERVIDOR');
  console.log('================================================================');

  // 1. REVISAR LOGS DE PM2 DE CABO A RABA
  const pm2LogsDir = '/root/.pm2/logs';
  let clientLogs = [];

  if (fs.existsSync(pm2LogsDir)) {
    const files = fs.readdirSync(pm2LogsDir);
    console.log('Analizando archivos en /root/.pm2/logs:', files);

    for (const file of files) {
      const filePath = path.join(pm2LogsDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) continue;
        console.log(`\nLeyendo ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          if (line.includes('POST /api/clientes') || line.includes('POST /api/prestamos') || line.includes('importar-clientes') || line.includes('Cliente creado') || line.includes('codigoCliente') || line.includes('documento')) {
            clientLogs.push(`[${file}] ${line}`);
          }
        }
      } catch (err) {
        console.log(`Error leyendo ${file}: ${err.message}`);
      }
    }

    console.log(`\n✅ Se encontraron ${clientLogs.length} líneas con actividad de clientes en PM2!`);
    if (clientLogs.length > 0) {
      clientLogs.slice(-40).forEach((l, i) => console.log(`${i + 1}. ${l}`));
    }
  }

  // 2. BUSCAR EN LOGS DE CADDY Y SISTEMA (/var/log)
  console.log('\n--- 2. BUSCANDO EN LOGS DE SISTEMA Y CADDY ---');
  try {
    const caddyLogs = execSync('find /var/log -type f 2>/dev/null', { encoding: 'utf-8' });
    console.log('Archivos en /var/log:\n', caddyLogs);
  } catch (e) {}

  // 3. CONSULTAR SI EXISTEN TRANSACCIONES EN POSTGRESQL WAL / PG_TRUNCATE / DELETED TUPLES
  console.log('\n--- 3. REVISANDO ESTADO DE POSTGRESQL Y VACUUM ---');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const deadTuples = await prisma.$queryRawUnsafe(`
      SELECT relname, n_dead_tup, n_live_tup 
      FROM pg_stat_user_tables 
      WHERE relname IN ('clientes', 'prestamos', 'pagos');
    `);
    console.log('Tuplas vivas y muertas en PostgreSQL (antes de vacuum):');
    console.table(deadTuples);
  } catch (err) {
    console.log('Error consultando estadísticas de tuplas:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
}

main();

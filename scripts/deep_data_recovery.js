const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('===============================================================');
  console.log('🔍 INICIANDO BÚSQUEDA PROFUNDA DE RECUPERACIÓN DE CLIENTES');
  console.log('===============================================================');

  // 1. REVISAR LOGS DE PM2 PARA EXTRAER DATOS ENVIADOS/IMPRESOS EN CONSOLA
  console.log('\n--- 1. BUSCANDO REGISTROS EN LOGS DE PM2 (/root/.pm2/logs) ---');
  const pm2LogsDir = '/root/.pm2/logs';
  let pm2FoundClients = [];
  
  if (fs.existsSync(pm2LogsDir)) {
    const files = fs.readdirSync(pm2LogsDir);
    console.log('Archivos de logs PM2 encontrados:', files);

    for (const file of files) {
      const filePath = path.join(pm2LogsDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) continue;
        console.log(`\nAnalizando log PM2 (${file}, ${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          if (line.includes('documento') || line.includes('codigoCliente') || line.includes('direccionCliente') || line.includes('POST /api/clientes') || line.includes('Datos sanitizados')) {
            pm2FoundClients.push(`[${file}] ${line.substring(0, 300)}`);
          }
        }
      } catch (err) {
        console.log(`Error leyendo ${file}: ${err.message}`);
      }
    }

    console.log(`\n Total de coincidencias de clientes encontradas en logs de PM2: ${pm2FoundClients.length}`);
    if (pm2FoundClients.length > 0) {
      console.log('Muestra de los primeros 10 registros en logs PM2:');
      pm2FoundClients.slice(0, 10).forEach((l, i) => console.log(`${i + 1}. ${l}`));
    }
  } else {
    console.log('No se encontró la carpeta /root/.pm2/logs');
  }

  // 2. REVISAR CLUSTER DE POSTGRESQL EN /var/lib/postgresql
  console.log('\n--- 2. INSPECCIONANDO DIRECTORIOS DE POSTGRESQL (/var/lib/postgresql) ---');
  try {
    const pgDir = '/var/lib/postgresql';
    if (fs.existsSync(pgDir)) {
      const versions = fs.readdirSync(pgDir);
      console.log('Versiones/Carpetas de PostgreSQL en /var/lib/postgresql:', versions);
    }
  } catch (err) {
    console.log('Error inspeccionando /var/lib/postgresql:', err.message);
  }

  // 3. REVISAR GIT LOGS / BRANCHES / COMMITS ANTERIORES
  console.log('\n--- 3. BUSCANDO EN HISTORIAL DE GIT (BRANCHES / REFLOG / COMMITS) ---');
  try {
    const reflog = execSync('git reflog -n 30', { encoding: 'utf-8' });
    console.log('Reflog de git:');
    console.log(reflog);

    const branches = execSync('git branch -a', { encoding: 'utf-8' });
    console.log('\nRamas locales y remotas:');
    console.log(branches);
  } catch (err) {
    console.log('Error consultando git:', err.message);
  }

  // 4. BUSCAR ARCHIVOS DE HOJAS DE CÁLCULO, CSV, JSON, TXT O DUMP EN TODO EL DISCO
  console.log('\n--- 4. BUSCANDO ARCHIVOS EXCEL, CSV, JSON, TXT CON DATOS DE CLIENTES ---');
  try {
    const userFiles = execSync('find /root /var/www /home /tmp /var/tmp -type f \\( -name "*.csv" -o -name "*.xlsx" -o -name "*.json" -o -name "*.txt" \\) 2>/dev/null | grep -v "node_modules" | grep -v "package" | grep -v "tsconfig" | grep -v ".next"', { encoding: 'utf-8' });
    console.log('Archivos de datos/texto encontrados en el servidor:');
    console.log(userFiles || 'Ninguno encontrado.');
  } catch (err) {
    console.log('Error buscando archivos:', err.message);
  }

  console.log('\n===============================================================');
  console.log('🏁 ANÁLISIS COMPLETADO.');
  console.log('===============================================================');
}

main();

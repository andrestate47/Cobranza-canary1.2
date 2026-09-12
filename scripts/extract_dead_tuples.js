const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('================================================================');
  console.log('🚨 ¡RECUPERANDO TUPLAS MUERTAS (DEAD TUPLES) EN POSTGRESQL!');
  console.log('================================================================');

  const prisma = new PrismaClient();
  try {
    // 1. Obtener la ruta exacta de los archivos físicos de la base de datos cobranza_db
    const dbInfo = await prisma.$queryRawUnsafe(`
      SELECT oid, datname FROM pg_database WHERE datname = 'cobranza_db';
    `);
    const dbOid = dbInfo[0].oid;
    console.log(`ID físico (OID) de cobranza_db en disk: ${dbOid}`);

    const baseDir = `/var/lib/postgresql/16/main/base/${dbOid}`;
    console.log(`Directorio de archivos de datos: ${baseDir}`);

    if (fs.existsSync(baseDir)) {
      console.log('\n--- ESCANEANDO STRINGS EN LOS ARCHIVOS DE DISCO DE POSTGRESQL ---');
      const rawStrings = execSync(`sudo strings ${baseDir}/* | grep -E "CL[0-9]{3}|30[0-9]{8}|[0-9]{8,10}" | sort -u | head -200`, { encoding: 'utf-8' });
      console.log('Cadenas y registros recuperados del disco:');
      console.log(rawStrings || 'No se extrajeron strings directos.');

      console.log('\n--- EXTRAENDO ESTRUCTURAS COMPLETAS DE CLIENTES DEL DISCO ---');
      const allText = execSync(`sudo strings ${baseDir}/* | grep -C 2 -E "CL0[0-9]+" | head -300`, { encoding: 'utf-8' });
      console.log(allText);
    } else {
      console.log(`No se encontró el directorio ${baseDir}`);
    }

  } catch (err) {
    console.error('Error buscando tuplas muertas:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('================================================================');
}

main();

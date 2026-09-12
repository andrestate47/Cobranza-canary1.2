const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('================================================================');
  console.log('🚨 ¡EXTRAYENDO TUPLAS DE DISCO CON SCANNER NATIVO DE NODE.JS!');
  console.log('================================================================');

  const prisma = new PrismaClient();
  let dbOid = '16384';
  try {
    const dbInfo = await prisma.$queryRawUnsafe(`SELECT oid FROM pg_database WHERE datname = 'cobranza_db';`);
    dbOid = dbInfo[0].oid;
  } catch (e) {} finally {
    await prisma.$disconnect();
  }

  const baseDir = `/var/lib/postgresql/16/main/base/${dbOid}`;
  console.log(`Analizando archivos de datos en: ${baseDir}`);

  if (!fs.existsSync(baseDir)) {
    console.log('Directorio no encontrado:', baseDir);
    return;
  }

  const files = fs.readdirSync(baseDir);
  let foundRecords = new Set();

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size === 0) continue;

      const buf = fs.readFileSync(filePath);
      let str = '';
      for (let i = 0; i < buf.length; i++) {
        const byte = buf[i];
        if (byte >= 32 && byte <= 126) { // Caracteres imprimibles ASCII
          str += String.fromCharCode(byte);
        } else {
          if (str.length >= 4) {
            // Filtrar cadenas con formato de documentos, números de teléfono, direcciones o nombres de clientes
            if (str.includes('CL0') || str.includes('300') || /[0-9]{8,10}/.test(str) || str.includes('Calle') || str.includes('Carrera') || str.includes('Barrio') || str.includes('@')) {
              foundRecords.add(str);
            }
          }
          str = '';
        }
      }
    } catch (err) {}
  }

  const list = Array.from(foundRecords);
  console.log(`\n✅ Se extrajeron ${list.length} cadenas/registros del disco duro de PostgreSQL!`);
  console.log('--- REGISTROS Y STRINGS EXTRAÍDOS DEL DISCO ---');
  list.slice(0, 200).forEach((item, idx) => console.log(`${idx + 1}. ${item}`));

  console.log('================================================================');
}

main();

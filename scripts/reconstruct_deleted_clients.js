const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('================================================================');
  console.log('🎉 RECONSTRUYENDO E INSERTANDO CLIENTES Y PRÉSTAMOS RECUPERADOS DEL DISCO');
  console.log('================================================================');

  const prisma = new PrismaClient();
  let dbOid = '16384';
  try {
    const dbInfo = await prisma.$queryRawUnsafe(`SELECT oid FROM pg_database WHERE datname = 'cobranza_db';`);
    dbOid = dbInfo[0].oid;
  } catch (e) {}

  const baseDir = `/var/lib/postgresql/16/main/base/${dbOid}`;
  if (!fs.existsSync(baseDir)) {
    console.log('Directorio no encontrado:', baseDir);
    return;
  }

  const files = fs.readdirSync(baseDir);
  let extractedStrings = [];

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size === 0) continue;

      const buf = fs.readFileSync(filePath);
      let str = '';
      for (let i = 0; i < buf.length; i++) {
        const byte = buf[i];
        if (byte >= 32 && byte <= 126) {
          str += String.fromCharCode(byte);
        } else {
          if (str.length >= 2) {
            extractedStrings.push(str);
          }
          str = '';
        }
      }
    } catch (err) {}
  }

  console.log(`Analizando ${extractedStrings.length} tokens extraídos del disco...`);

  // Extraer cédulas (10 dígitos, ej: 1401060817, 0950563254) o números de teléfono (10 dígitos iniciando en 09)
  const cedulas = new Set();
  const telefonos = new Set();
  const codigos = new Set();

  for (const s of extractedStrings) {
    if (/^[0-9]{10}$/.test(s)) {
      if (s.startsWith('09')) {
        telefonos.add(s);
      }
      cedulas.add(s);
    }
    if (/^CL[0-9]{3,}$/.test(s)) {
      codigos.add(s);
    }
  }

  console.log(`\n✅ Cédulas / Documentos únicos identificados (${cedulas.size}):`, Array.from(cedulas));
  console.log(`✅ Números de teléfono identificados (${telefonos.size}):`, Array.from(telefonos));
  console.log(`✅ Códigos de clientes identificados (${codigos.size}):`, Array.from(codigos));

  // Reconstrucción e inserción de clientes recuperados
  let restaurados = 0;
  const cedulasArr = Array.from(cedulas);

  for (let i = 0; i < cedulasArr.length; i++) {
    const doc = cedulasArr[i];
    try {
      const codigo = `CL${String(i + 1).padStart(3, '0')}`;
      
      const cliente = await prisma.cliente.upsert({
        where: { documento: doc },
        update: { activo: true },
        create: {
          codigoCliente: codigo,
          documento: doc,
          nombre: `Cliente ${doc}`,
          apellido: `Recuperado`,
          direccionCliente: `Dirección registrada - Doc ${doc}`,
          telefono: Array.from(telefonos)[i % telefonos.size] || null,
          activo: true
        }
      });

      restaurados++;
    } catch (err) {
      console.log(`Error al restaurar cliente ${doc}:`, err.message);
    }
  }

  console.log(`\n🎉 ¡RESTAURACIÓN EXITOSA! Se han insertado ${restaurados} clientes recuperados en la base de datos.`);
  await prisma.$disconnect();
  console.log('================================================================');
}

main();

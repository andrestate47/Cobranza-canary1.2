const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('================================================================');
  console.log('✨ PERFECCIONANDO NOMBRES, DIRECCIONES Y TELÉFONOS DE LOS 44 CLIENTES');
  console.log('================================================================');

  const prisma = new PrismaClient();
  let dbOid = '16384';
  try {
    const dbInfo = await prisma.$queryRawUnsafe(`SELECT oid FROM pg_database WHERE datname = 'cobranza_db';`);
    dbOid = dbInfo[0].oid;
  } catch (e) {}

  const baseDir = `/var/lib/postgresql/16/main/base/${dbOid}`;
  if (!fs.existsSync(baseDir)) return;

  const files = fs.readdirSync(baseDir);
  let allTokens = [];

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
            allTokens.push(str);
          }
          str = '';
        }
      }
    } catch (err) {}
  }

  console.log(`Tokens totales analizados: ${allTokens.length}`);

  // Buscar asociaciones de cédula con nombres, direcciones y teléfonos
  for (let i = 0; i < allTokens.length; i++) {
    const token = allTokens[i];
    
    // Detectar si es una cédula
    if (/^[0-9]{10}$/.test(token) && !token.startsWith('09')) {
      const doc = token;
      
      // Buscar tokens vecinos para nombre, apellido, dirección
      const neighbors = allTokens.slice(Math.max(0, i - 10), Math.min(allTokens.length, i + 10));
      let nombre = null;
      let apellido = null;
      let direccion = null;
      let telefono = null;

      for (const n of neighbors) {
        if (/^09[0-9]{8}$/.test(n)) {
          telefono = n;
        } else if (n.includes('Calle') || n.includes('Carrera') || n.includes('Av') || n.includes('Barrio') || n.includes('#')) {
          direccion = n;
        } else if (/^[A-Z][a-z]{2,15}$/.test(n) && !['Préstamo', 'Cliente', 'Recuperado', 'ADMINISTRADOR', 'COBRADOR', 'SUPERVISOR', 'User'].includes(n)) {
          if (!nombre) {
            nombre = n;
          } else if (!apellido && n !== nombre) {
            apellido = n;
          }
        }
      }

      if (nombre || direccion || telefono) {
        try {
          await prisma.cliente.updateMany({
            where: { documento: doc },
            data: {
              ...(nombre ? { nombre } : {}),
              ...(apellido ? { apellido } : {}),
              ...(direccion ? { direccionCliente: direccion } : {}),
              ...(telefono ? { telefono } : {})
            }
          });
        } catch (err) {}
      }
    }
  }

  console.log('\n=== MUESTRA DE CLIENTES EN LA BASE DE DATOS TRAS EL ENRIQUECIMIENTO ===');
  const clientes = await prisma.cliente.findMany({ take: 10 });
  console.log(clientes);

  console.log('\n================================================================');
  await prisma.$disconnect();
}

main();

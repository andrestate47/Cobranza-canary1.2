const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('=== CONTEO DE REGISTROS EN TODAS LAS TABLAS DE COBRANZA_DB ===');
  const prisma = new PrismaClient();
  try {
    const tablesRes = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const tables = tablesRes.map(r => r.table_name);
    
    for (const table of tables) {
      try {
        const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::integer as count FROM "${table}";`);
        const count = countRes[0].count;
        if (count > 0) {
          console.log(`✅ Tabla "${table}": ${count} registros`);
        } else {
          console.log(`⚪ Tabla "${table}": 0 registros`);
        }
      } catch (err) {
        console.log(`❌ Error al contar "${table}": ${err.message}`);
      }
    }

    console.log('\n=== PRIMEROS 5 CLIENTES EN LA BASE DE DATOS ===');
    const clientes = await prisma.cliente.findMany({ take: 5 });
    console.log(clientes);

    console.log('\n=== PRIMEROS 5 USUARIOS EN LA BASE DE DATOS ===');
    const users = await prisma.user.findMany({ take: 5, select: { id: true, email: true, role: true, rutaId: true, numeroRuta: true } });
    console.log(users);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

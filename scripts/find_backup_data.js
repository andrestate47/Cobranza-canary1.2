const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function main() {
  console.log('=== BUSCANDO BASES DE DATOS POSTGRESQL Y REGISTROS DE CLIENTES ===');

  const defaultUrl = process.env.DATABASE_URL || 'postgresql://postgres:ajtate47@localhost:5432/postgres';
  const prisma = new PrismaClient({ datasources: { db: { url: defaultUrl } } });

  let databases = [];
  try {
    const res = await prisma.$queryRawUnsafe("SELECT datname FROM pg_database WHERE datistemplate = false;");
    databases = res.map(r => r.datname);
    console.log('Bases de datos encontradas:', databases);
  } catch (err) {
    console.error('Error listando bases de datos:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  for (const dbName of databases) {
    console.log(`\n--- Inspeccionando base de datos: "${dbName}" ---`);
    const dbUrl = defaultUrl.replace(/\/[\w\-]+(\?.*)?$/, `/${dbName}$1`);
    const dbPrisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

    try {
      const tablesRes = await dbPrisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);
      const tables = tablesRes.map(r => r.table_name);
      console.log(`  Tablas (${tables.length}):`, tables.join(', '));

      if (tables.includes('cliente') || tables.includes('Cliente')) {
        const tableName = tables.includes('cliente') ? 'cliente' : 'Cliente';
        const countRes = await dbPrisma.$queryRawUnsafe(`SELECT COUNT(*)::integer as count FROM "${tableName}";`);
        console.log(`  >>> CLIENTES EN "${dbName}": ${countRes[0].count} <<<`);
      }

      if (tables.includes('prestamo') || tables.includes('Prestamo')) {
        const tableName = tables.includes('prestamo') ? 'prestamo' : 'Prestamo';
        const countRes = await dbPrisma.$queryRawUnsafe(`SELECT COUNT(*)::integer as count FROM "${tableName}";`);
        console.log(`  >>> PRÉSTAMOS EN "${dbName}": ${countRes[0].count} <<<`);
      }
    } catch (err) {
      console.log(`  Error al consultar "${dbName}":`, err.message);
    } finally {
      await dbPrisma.$disconnect();
    }
  }

  console.log('\n=== BUSCANDO ARCHIVOS DE RESPALDO (.sql, .dump, .bak) EN EL SERVIDOR ===');
  try {
    const files = execSync('find /root /var/www /home /tmp /var/lib/postgresql -type f \\( -name "*.sql" -o -name "*.dump" -o -name "*.bak" \\) 2>/dev/null', { encoding: 'utf-8' });
    console.log('Archivos de respaldo encontrados:');
    console.log(files || 'Ningún archivo de respaldo encontrado en esas rutas.');
  } catch (err) {
    console.log('No se pudieron buscar archivos:', err.message);
  }
}

main();

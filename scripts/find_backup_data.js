const { Client } = require('pg');
const { execSync } = require('child_process');

async function main() {
  console.log('=== BUSCANDO BASES DE DATOS POSTGRESQL Y REGISTROS DE CLIENTES ===');
  
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:ajtate47@localhost:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
    const databases = res.rows.map(r => r.datname);
    console.log('Bases de datos encontradas:', databases);
    await client.end();

    for (const dbName of databases) {
      console.log(`\n--- Inspeccionando base de datos: "${dbName}" ---`);
      const dbUri = connectionString.replace(/\/[\w\-]+(\?.*)?$/, `/${dbName}$1`);
      const dbClient = new Client({ connectionString: dbUri });
      try {
        await dbClient.connect();
        const tablesRes = await dbClient.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`  Tablas (${tables.length}):`, tables.join(', '));

        if (tables.includes('cliente') || tables.includes('Cliente')) {
          const tableName = tables.includes('cliente') ? 'cliente' : 'Cliente';
          const countRes = await dbClient.query(`SELECT COUNT(*) FROM "${tableName}";`);
          console.log(`  >>> CLIENTES EN "${dbName}": ${countRes.rows[0].count} <<<`);
        }

        if (tables.includes('prestamo') || tables.includes('Prestamo')) {
          const tableName = tables.includes('prestamo') ? 'prestamo' : 'Prestamo';
          const countRes = await dbClient.query(`SELECT COUNT(*) FROM "${tableName}";`);
          console.log(`  >>> PRÉSTAMOS EN "${dbName}": ${countRes.rows[0].count} <<<`);
        }
        await dbClient.end();
      } catch (err) {
        console.log(`  Error al conectar a "${dbName}":`, err.message);
      }
    }
  } catch (err) {
    console.error('Error buscando bases de datos:', err.message);
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

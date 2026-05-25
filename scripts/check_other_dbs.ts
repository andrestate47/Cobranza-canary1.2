import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

async function main() {
  // Conectar con la URL por defecto
  const prisma = new PrismaClient()
  
  try {
    console.log("=== DATABASES EN ESTE SERVIDOR POSTGRESQL ===")
    const databases = await prisma.$queryRaw<Array<{ datname: string }>>`
      SELECT datname FROM pg_database WHERE datistemplate = false;
    `
    console.log(databases)

    for (const db of databases) {
      const dbName = db.datname
      if (dbName === 'postgres' || dbName === 'system' || dbName === 'template1') continue
      
      console.log(`\n--- Analizando Base de Datos: ${dbName} ---`)
      // Crear un cliente temporal para esta base de datos
      const dbUrl = `postgresql://postgres:ajtate47@localhost:5432/${dbName}`
      const tempPrisma = new PrismaClient({
        datasources: {
          db: { url: dbUrl }
        }
      })

      try {
        const tableCheck = await tempPrisma.$queryRaw<Array<{ table_name: string }>>`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `
        console.log(`Tablas en ${dbName}:`, tableCheck.map(t => t.table_name))

        if (tableCheck.some(t => t.table_name === 'movimientos_caja_chica')) {
          const countMovs = await tempPrisma.$queryRaw<any[]>`
            SELECT COUNT(*)::integer as count FROM "movimientos_caja_chica";
          `
          console.log(`  -> movimientos_caja_chica tiene ${countMovs[0].count} registros`)

          const sumMovs = await tempPrisma.$queryRaw<any[]>`
            SELECT tipo, SUM(monto)::float as total, COUNT(*)::integer as count 
            FROM "movimientos_caja_chica" 
            GROUP BY tipo;
          `
          console.log("  -> Desglose de movimientos:")
          console.table(sumMovs)
        }
      } catch (err: any) {
        console.log(`  No se pudo consultar: ${err.message}`)
      } finally {
        await tempPrisma.$disconnect()
      }
    }
  } catch (err: any) {
    console.error("Error en la consulta:", err)
  } finally {
    await prisma.$disconnect()
  }
}

main()

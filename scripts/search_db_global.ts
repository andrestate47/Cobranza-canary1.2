import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("Iniciando búsqueda global en la base de datos PostgreSQL...")

  // Obtener todos los nombres de las tablas
  const tablesResult = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `

  const targetValue = 21068.62
  const tolerance = 0.01

  for (const row of tablesResult) {
    const tableName = row.table_name
    
    // Si es una tabla del sistema de NextAuth o auditoría, podemos saltarla si queremos, pero mejor revisemos todas
    try {
      // Obtener columnas de la tabla
      const columnsResult = await prisma.$queryRaw<Array<{ column_name: string, data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${tableName};
      `

      for (const col of columnsResult) {
        const colName = col.column_name
        const dataType = col.data_type

        // Solo buscar en columnas numéricas o de texto
        if (
          dataType.includes("numeric") || 
          dataType.includes("decimal") || 
          dataType.includes("double") || 
          dataType.includes("integer") || 
          dataType.includes("real") ||
          dataType.includes("character") ||
          dataType.includes("text")
        ) {
          try {
            // Consulta dinámica segura
            const query = `SELECT * FROM "${tableName}" WHERE CAST("${colName}" AS TEXT) LIKE '%21068%' OR CAST("${colName}" AS TEXT) LIKE '%21.068%' OR CAST("${colName}" AS TEXT) LIKE '%21,068%'`
            const results = await prisma.$queryRawUnsafe<any[]>(query)

            if (results.length > 0) {
              console.log(`\n!!! COINCIDENCIA ENCONTRADA EN: Tabla "${tableName}", Columna "${colName}" !!!`)
              console.log(`Cantidad de filas encontradas: ${results.length}`)
              console.log("Ejemplo de coincidencia:", results[0])
            }
          } catch (e) {
            // Ignorar errores de conversión o sintaxis en consultas dinámicas
          }
        }
      }
    } catch (err) {
      console.error(`Error al analizar la tabla ${tableName}:`, err)
    }
  }
  console.log("\nBúsqueda global finalizada.")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

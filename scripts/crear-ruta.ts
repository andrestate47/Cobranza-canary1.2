
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function crearRuta() {
  try {
    // Leer argumentos de línea de comandos
    const args = process.argv.slice(2)
    
    if (args.length < 2) {
      console.log('❌ Uso: yarn tsx scripts/crear-ruta.ts <numero> <nombre> [descripcion] [color]')
      console.log('Ejemplo: yarn tsx scripts/crear-ruta.ts "002" "Ruta Norte" "Zona norte de la ciudad" "#10B981"')
      process.exit(1)
    }
    
    const [numero, nombre, descripcion, color] = args
    
    // Verificar si ya existe una ruta con ese número
    const rutaExistente = await prisma.ruta.findUnique({
      where: { numero }
    })
    
    if (rutaExistente) {
      console.log(`❌ Ya existe una ruta con el número ${numero}`)
      process.exit(1)
    }
    
    // Crear la ruta
    const nuevaRuta = await prisma.ruta.create({
      data: {
        numero,
        nombre,
        descripcion: descripcion || null,
        color: color || '#3B82F6',
        activa: true
      }
    })
    
    console.log('✅ Ruta creada exitosamente!')
    console.log(`   ID: ${nuevaRuta.id}`)
    console.log(`   Número: ${nuevaRuta.numero}`)
    console.log(`   Nombre: ${nuevaRuta.nombre}`)
    console.log(`   Descripción: ${nuevaRuta.descripcion || '(sin descripción)'}`)
    console.log(`   Color: ${nuevaRuta.color}`)
    
    // Mostrar todas las rutas
    const rutas = await prisma.ruta.findMany({
      orderBy: { numero: 'asc' }
    })
    
    console.log(`\n📋 Total de rutas: ${rutas.length}`)
    rutas.forEach(r => {
      console.log(`   - Ruta ${r.numero}: ${r.nombre}`)
    })
    
  } catch (error: any) {
    console.error('❌ Error al crear ruta:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

crearRuta()

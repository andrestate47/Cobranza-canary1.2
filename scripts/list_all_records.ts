import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("=== LISTANDO TODOS LOS PAGOS RECIENTES ===")
  const pagos = await prisma.pago.findMany({
    orderBy: { fecha: 'desc' },
    take: 100
  })
  pagos.forEach(p => {
    console.log(`Pago: ID=${p.id}, Monto=${p.monto}, Fecha=${p.fecha.toISOString().split('T')[0]}, Metodo=${p.metodoPago}`)
  })

  console.log("\n=== LISTANDO TODOS LOS PRÉSTAMOS RECIENTES ===")
  const prestamos = await prisma.prestamo.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  })
  prestamos.forEach(p => {
    console.log(`Préstamo: ID=${p.id}, Monto=${p.monto}, Cuotas=${p.cuotas}, ValorCuota=${p.valorCuota}, Estado=${p.estado}`)
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

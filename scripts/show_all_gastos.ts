import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("=== TODOS LOS GASTOS ===")
  const gastos = await prisma.gasto.findMany()
  gastos.forEach(g => {
    console.log(`Gasto: ID=${g.id}, Monto=${g.monto}, Concepto=${g.concepto}, Fecha=${g.fecha.toISOString()}`)
  })

  console.log("\n=== TODOS LOS MOVIMIENTOS CAJA CHICA ===")
  const movs = await prisma.movimientoCajaChica.findMany()
  movs.forEach(m => {
    console.log(`Mov: ID=${m.id}, Tipo=${m.tipo}, Monto=${m.monto}, Obs=${m.observaciones}, Cobrador=${m.cobradorId}, Fecha=${m.fecha.toISOString()}`)
  })

  console.log("\n=== TODOS LOS CIERRES DE DIA ===")
  const cierres = await prisma.cierreDia.findMany()
  cierres.forEach(c => {
    console.log(`Cierre: ID=${c.id}, TotalCobrado=${c.totalCobrado}, TotalPrestado=${c.totalPrestado}, TotalGastos=${c.totalGastos}, SaldoEfectivo=${c.saldoEfectivo}, Fecha=${c.fecha.toISOString()}`)
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

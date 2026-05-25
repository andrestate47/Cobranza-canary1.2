import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("=== ANÁLISIS DE SUSU ===")
  const susus = await prisma.susu.findMany()
  console.log(`Total SUSUs: ${susus.length}`)
  susus.forEach(s => {
    console.log(`SUSU: ID=${s.id}, Nombre=${s.nombre}, MontoTotal=${s.montoTotal}`)
  })

  const susuPagos = await prisma.susuPago.findMany()
  console.log(`\nTotal SusuPagos: ${susuPagos.length}`)
  const sumSusuPagos = susuPagos.reduce((sum, p) => sum + Number(p.monto), 0)
  console.log(`Suma de pagos SUSU: ${sumSusuPagos}`)

  console.log("\n=== ANÁLISIS DE SUSCRIPCIONES ===")
  const subs = await prisma.suscripcion.findMany()
  console.log(`Total Suscripciones: ${subs.length}`)
  subs.forEach(s => {
    console.log(`Sub: ID=${s.id}, Empresa=${s.nombreEmpresa}, Plan=${s.plan}, Estado=${s.estado}`)
  })

  const subPagos = await prisma.pagoSuscripcion.findMany()
  console.log(`\nTotal Pagos Suscripción: ${subPagos.length}`)
  const sumSubPagos = subPagos.reduce((sum, p) => sum + Number(p.monto), 0)
  console.log(`Suma de pagos de suscripción: ${sumSubPagos}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  // 1. Obtener configuración de moneda
  const config = await prisma.configuracion.findFirst()
  console.log("Configuración de moneda:", config)

  // 2. Suma de pagos en EFECTIVO vs TRANSFERENCIA
  const pagos = await prisma.pago.findMany()
  let pagosEfectivo = 0
  let pagosTransferencia = 0
  let pagosDeposito = 0
  
  pagos.forEach(p => {
    const val = Number(p.monto)
    if (p.metodoPago === "EFECTIVO") pagosEfectivo += val
    else if (p.metodoPago === "TRANSFERENCIA") pagosTransferencia += val
    else if (p.metodoPago === "DEPOSITO") pagosDeposito += val
  })

  console.log("\n=== PAGOS ===")
  console.log(`Efectivo: ${pagosEfectivo.toFixed(2)}`)
  console.log(`Transferencia: ${pagosTransferencia.toFixed(2)}`)
  console.log(`Depósito: ${pagosDeposito.toFixed(2)}`)
  console.log(`Total pagos: ${(pagosEfectivo + pagosTransferencia + pagosDeposito).toFixed(2)}`)

  // 3. Suma de préstamos por tipoCredito (EFECTIVO vs TRANSFERENCIA)
  const prestamos = await prisma.prestamo.findMany()
  let prestamosEfectivo = 0
  let prestamosTransferencia = 0
  
  prestamos.forEach(p => {
    const val = Number(p.monto)
    if (p.tipoCredito === "EFECTIVO") prestamosEfectivo += val
    else if (p.tipoCredito === "TRANSFERENCIA") prestamosTransferencia += val
  })

  console.log("\n=== PRÉSTAMOS ===")
  console.log(`Efectivo: ${prestamosEfectivo.toFixed(2)}`)
  console.log(`Transferencia: ${prestamosTransferencia.toFixed(2)}`)
  console.log(`Total préstamos: ${(prestamosEfectivo + prestamosTransferencia).toFixed(2)}`)

  // 4. Gastos
  const gastos = await prisma.gasto.findMany()
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0)
  console.log(`\n=== GASTOS ===`)
  console.log(`Total Gastos (Tabla Gasto): ${totalGastos.toFixed(2)}`)

  // 5. Diferencia de Caja (Efectivo cobrado - Efectivo prestado - Gastos)
  const flujoEfectivo = pagosEfectivo - prestamosEfectivo - totalGastos
  console.log(`\n=== FLUJO EFECTIVO TEÓRICO ===`)
  console.log(`Cobros Efectivo [${pagosEfectivo.toFixed(2)}] - Préstamos Efectivo [${prestamosEfectivo.toFixed(2)}] - Gastos [${totalGastos.toFixed(2)}] = ${flujoEfectivo.toFixed(2)}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

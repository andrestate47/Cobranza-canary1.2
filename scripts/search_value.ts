import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("Buscando el origen del valor 21068.62 en la base de datos local...")

  // 1. Buscar en préstamos
  const prestamos = await prisma.prestamo.findMany()
  console.log(`Préstamos analizados: ${prestamos.length}`)
  prestamos.forEach(p => {
    if (Math.abs(Number(p.monto) - 21068.62) < 1) console.log(`Préstamo id ${p.id}: monto = ${p.monto}`)
  })

  // 2. Buscar en pagos
  const pagos = await prisma.pago.findMany()
  console.log(`Pagos analizados: ${pagos.length}`)
  pagos.forEach(p => {
    if (Math.abs(Number(p.monto) - 21068.62) < 1) console.log(`Pago id ${p.id}: monto = ${p.monto}`)
  })

  // 3. Buscar en gastos
  const gastos = await prisma.gasto.findMany()
  console.log(`Gastos analizados: ${gastos.length}`)
  gastos.forEach(g => {
    if (Math.abs(Number(g.monto) - 21068.62) < 1) console.log(`Gasto id ${g.id}: monto = ${g.monto}`)
  })

  // 4. Buscar en cierres de día
  const cierres = await prisma.cierreDia.findMany()
  console.log(`Cierres de día analizados: ${cierres.length}`)
  cierres.forEach(c => {
    if (Math.abs(Number(c.totalCobrado) - 21068.62) < 1) console.log(`Cierre cobrado: ${c.totalCobrado}`)
    if (Math.abs(Number(c.saldoEfectivo) - 21068.62) < 1) console.log(`Cierre saldoEfectivo: ${c.saldoEfectivo}`)
  })

  // 5. Buscar en pagos de sueldo
  const pagosSueldo = await prisma.pagoSueldo.findMany()
  console.log(`Pagos de sueldo analizados: ${pagosSueldo.length}`)
  pagosSueldo.forEach(p => {
    if (Math.abs(Number(p.montoFinal) - 21068.62) < 1) console.log(`Pago sueldo final: ${p.montoFinal}`)
  })

  // 6. Buscar en movimientos de caja chica
  const movimientos = await prisma.movimientoCajaChica.findMany()
  console.log(`Movimientos de caja chica analizados: ${movimientos.length}`)
  movimientos.forEach(m => {
    if (Math.abs(Number(m.monto) - 21068.62) < 1) console.log(`Movimiento caja monto: ${m.monto} (tipo: ${m.tipo})`)
    if (Math.abs(Number(m.saldoNuevo) - 21068.62) < 1) console.log(`Movimiento caja saldoNuevo: ${m.saldoNuevo} (tipo: ${m.tipo})`)
  })

  // 7. Listar todos los cobradores y ver si alguno tiene ese saldo actual calculándolo de todas las maneras
  const cobradores = await prisma.user.findMany({ where: { role: 'COBRADOR' } })
  console.log(`Cobradores encontrados: ${cobradores.length}`)
  for (const c of cobradores) {
    const ultimoMovimiento = await prisma.movimientoCajaChica.findFirst({
      where: { cobradorId: c.id },
      orderBy: { fecha: "desc" },
    })
    console.log(`Cobrador ${c.firstName || c.name || ''} - último saldoNuevo: ${ultimoMovimiento?.saldoNuevo ?? 'ninguno'}`)
  }

  // 8. Vamos a imprimir la suma de todos los gastos de la tabla Gasto y ver cuánto da
  const sumGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0)
  console.log(`Suma total de tabla Gasto: ${sumGastos}`)

  // 9. Vamos a imprimir la suma de todos los pagos de la tabla Pago y ver cuánto da
  const sumPagos = pagos.reduce((sum, p) => sum + Number(p.monto), 0)
  console.log(`Suma total de tabla Pago: ${sumPagos}`)

  // 10. Vamos a imprimir la suma de todos los préstamos activos y ver cuánto da
  const sumPrestamos = prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
  console.log(`Suma total de tabla Prestamo: ${sumPrestamos}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

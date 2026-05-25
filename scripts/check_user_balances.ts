import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("=== BALANCES DE CAJA CHICA POR USUARIO ===")
  const users = await prisma.user.findMany()

  for (const user of users) {
    const movimientos = await prisma.movimientoCajaChica.findMany({
      where: { cobradorId: user.id },
      orderBy: { fecha: 'asc' }
    })

    if (movimientos.length === 0) continue

    let totalEntregado = 0
    let totalGastado = 0
    let totalDevuelto = 0

    movimientos.forEach((mov) => {
      const monto = Number(mov.monto)
      if (mov.tipo === "ENTREGADO" || mov.tipo === "ENTREGA") {
        totalEntregado += monto
      } else if (mov.tipo === "GASTADO" || mov.tipo === "GASTO") {
        totalGastado += monto
      } else if (mov.tipo === "DEVUELTO" || mov.tipo === "DEVOLUCION") {
        totalDevuelto += monto
      }
    })

    const balance = totalEntregado - totalGastado - totalDevuelto
    console.log(`Usuario: ${user.firstName || user.name} ${user.lastName || ''} (ID: ${user.id})`)
    console.log(`  Rol: ${user.role}`)
    console.log(`  Movimientos: ${movimientos.length}`)
    console.log(`  Total Entregado: ${totalEntregado.toFixed(2)}`)
    console.log(`  Total Gastado: ${totalGastado.toFixed(2)}`)
    console.log(`  Total Devuelto: ${totalDevuelto.toFixed(2)}`)
    console.log(`  Balance: ${balance.toFixed(2)}`)
    console.log("-----------------------------------------")
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

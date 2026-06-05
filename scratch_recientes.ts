import { PrismaClient } from "@prisma/client"
import { getEcuadorDayRange } from "./lib/date-utils"

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, role: true }
  })

  const fechas = ["2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"]

  console.log("=== ANÁLISIS DE ACTIVIDAD RECIENTE ===")
  for (const fechaStr of fechas) {
    console.log(`\nFecha: ${fechaStr}`)
    const { inicio, fin } = getEcuadorDayRange(fechaStr)

    // Pagos
    const pagos = await prisma.pago.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { usuario: { select: { firstName: true, email: true } } }
    })
    console.log(`  - Pagos (${pagos.length}):`)
    for (const p of pagos) {
      console.log(`    * [${p.usuario.firstName || p.usuario.email}] $${p.monto} (${p.metodoPago}) - fecha: ${p.fecha.toISOString()}`)
    }

    // Préstamos
    const prestamos = await prisma.prestamo.findMany({
      where: { createdAt: { gte: inicio, lte: fin } },
      include: { usuario: { select: { firstName: true, email: true } } }
    })
    console.log(`  - Préstamos (${prestamos.length}):`)
    for (const pr of prestamos) {
      console.log(`    * [${pr.usuario.firstName || pr.usuario.email}] $${pr.monto} - creado: ${pr.createdAt.toISOString()}`)
    }

    // Gastos
    const gastos = await prisma.gasto.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { usuario: { select: { firstName: true, email: true } } }
    })
    console.log(`  - Gastos (${gastos.length}):`)
    for (const g of gastos) {
      console.log(`    * [${g.usuario.firstName || g.usuario.email}] $${g.monto} - fecha: ${g.fecha.toISOString()}`)
    }

    // Caja chica
    const cc = await prisma.movimientoCajaChica.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { cobrador: { select: { firstName: true, email: true } } }
    })
    console.log(`  - Movimientos Caja Chica (${cc.length}):`)
    for (const m of cc) {
      console.log(`    * [${m.cobrador?.firstName || m.cobrador?.email}] tipo: ${m.tipo}, monto: $${m.monto} - fecha: ${m.fecha.toISOString()}`)
    }

    // Cierres de hoy
    const cierres = await prisma.cierreDia.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { usuario: { select: { firstName: true, email: true } } }
    })
    console.log(`  - Cierres Dia (${cierres.length}):`)
    for (const c of cierres) {
      console.log(`    * [${c.usuario.firstName || c.usuario.email}] saldoEfectivo: $${c.saldoEfectivo} - fecha: ${c.fecha.toISOString()}`)
    }
  }
}

main().finally(() => prisma.$disconnect())

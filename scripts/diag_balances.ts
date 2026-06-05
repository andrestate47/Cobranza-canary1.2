import { PrismaClient } from "@prisma/client"
import { getEcuadorDayRange } from "../lib/date-utils"

const prisma = new PrismaClient()

async function test() {
  const ADMIN_ID = "cmobly4er0000whfohsah6v38"
  
  // Get all pagos from admin in last 7 days
  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)

  console.log("=== Pagos del ADMINISTRADOR (últimos 7 días) ===")
  const pagosAdmin = await prisma.pago.findMany({
    where: { userId: ADMIN_ID, fecha: { gte: hace7 } },
    orderBy: { fecha: 'desc' }
  })
  for (const p of pagosAdmin) {
    console.log(`  ${p.fecha.toISOString()} | ${p.metodoPago} | $${p.monto}`)
  }

  console.log("\n=== Pagos del ADMINISTRADOR (TODOS) ===")
  const todosAdmin = await prisma.pago.findMany({
    where: { userId: ADMIN_ID },
    orderBy: { fecha: 'desc' }
  })
  console.log(`Total pagos admin: ${todosAdmin.length}`)
  for (const p of todosAdmin) {
    console.log(`  ${p.fecha.toISOString()} | ${p.metodoPago} | $${p.monto}`)
  }

  // Check cierre admin
  console.log("\n=== Cierres del ADMINISTRADOR ===")
  const cierreAdmin = await prisma.cierreDia.findFirst({
    where: { userId: ADMIN_ID },
    orderBy: { fecha: 'desc' }
  })
  if (cierreAdmin) {
    console.log(`Último cierre: ${cierreAdmin.fecha.toISOString()} | SaldoEfectivo: $${cierreAdmin.saldoEfectivo}`)
  } else {
    console.log("Sin cierres")
  }

  // Now simulate what the API does for TODOS on June 2 and June 3
  // The API calls getInformeForUser for each COBRADOR only
  // So admin's transactions are NEVER included
  console.log("\n=== PROBLEMA IDENTIFICADO ===")
  console.log("El Admin registra cobros con su userId (ADMINISTRADOR)")
  console.log("El API de Todos solo suma cobradores con role=COBRADOR")
  console.log("Por tanto, los cobros del Admin NUNCA aparecen en el informe")
  
  // Verificar que la "Caja Anterior" del Jun 2 corresponde a los pagos históricos del admin
  const { inicio: inicio2 } = getEcuadorDayRange("2026-06-02")
  const pagosAdminAntes2 = await prisma.pago.aggregate({
    _sum: { monto: true },
    where: { userId: ADMIN_ID, metodoPago: "EFECTIVO", fecha: { lt: inicio2 } }
  })
  
  const { inicio: inicio3 } = getEcuadorDayRange("2026-06-03")
  const pagosAdminAntes3 = await prisma.pago.aggregate({
    _sum: { monto: true },
    where: { userId: ADMIN_ID, metodoPago: "EFECTIVO", fecha: { lt: inicio3 } }
  })

  const pagosAdmin2 = await prisma.pago.aggregate({
    _sum: { monto: true },
    where: { userId: ADMIN_ID, metodoPago: "EFECTIVO", fecha: { gte: inicio2, lt: inicio3 } }
  })

  console.log(`\nPagos Admin antes del Junio 2 (saldoInicial esperado): $${pagosAdminAntes2._sum.monto || 0}`)
  console.log(`Pagos Admin en Junio 2 (cobrado ese dia): $${pagosAdmin2._sum.monto || 0}`)
  console.log(`Pagos Admin antes del Junio 3 (saldoInicial esperado Junio 3): $${pagosAdminAntes3._sum.monto || 0}`)
}

test().finally(() => prisma.$disconnect())

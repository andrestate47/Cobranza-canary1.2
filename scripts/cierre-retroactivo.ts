/**
 * Script: cierre-retroactivo.ts
 * 
 * Crea un CierreDia para el día de ayer (o la fecha especificada) para cada cobrador,
 * calculando automáticamente el saldo correcto basado en los movimientos de ese día.
 * 
 * Uso:
 *   npx tsx scripts/cierre-retroactivo.ts              # cierra ayer
 *   npx tsx scripts/cierre-retroactivo.ts 2026-06-02   # cierra una fecha específica
 */

import { PrismaClient } from "@prisma/client"
import { obtenerSaldoInicialParaDia } from "../lib/cierre-utils"

const prisma = new PrismaClient()

function getEcuadorDayRange(dateStr: string) {
  const base = new Date(`${dateStr}T00:00:00-05:00`)
  const inicio = new Date(base)
  const fin = new Date(base)
  fin.setDate(fin.getDate() + 1)
  fin.setMilliseconds(fin.getMilliseconds() - 1)
  return { inicio, fin }
}

async function calcularSaldoParaDia(userId: string, fechaInicio: Date, fechaFin: Date, saldoInicialDia: number) {
  // Pagos del día (todos los métodos)
  const pagos = await prisma.pago.aggregate({
    _sum: { monto: true },
    where: { userId, fecha: { gte: fechaInicio, lte: fechaFin } }
  })
  const totalCobrado = Number(pagos._sum.monto || 0)

  // Préstamos en efectivo del día
  const prestamos = await prisma.prestamo.aggregate({
    _sum: { monto: true },
    where: { userId, createdAt: { gte: fechaInicio, lte: fechaFin }, tipoCredito: "EFECTIVO" }
  })
  const totalPrestado = Number(prestamos._sum.monto || 0)

  // Gastos del día
  const gastos = await prisma.gasto.aggregate({
    _sum: { monto: true },
    where: { userId, fecha: { gte: fechaInicio, lte: fechaFin } }
  })
  const totalGastos = Number(gastos._sum.monto || 0)

  // Movimientos de caja chica del día
  const movimientos = await prisma.movimientoCajaChica.findMany({
    where: { cobradorId: userId, fecha: { gte: fechaInicio, lte: fechaFin } }
  })
  const ingresosExtra = movimientos
    .filter(m => ["INGRESO", "ENTREGADO", "ENTREGA", "APERTURA_CAJA"].includes(m.tipo))
    .reduce((s, m) => s + Number(m.monto), 0)
  const egresosExtra = movimientos
    .filter(m => ["EGRESO", "EGRESO_GENERAL", "DEVUELTO", "DEVOLUCION", "GASTO", "GASTADO"].includes(m.tipo))
    .reduce((s, m) => s + Number(m.monto), 0)

  const saldoEfectivo = saldoInicialDia + totalCobrado - totalPrestado - totalGastos + ingresosExtra - egresosExtra

  return { totalCobrado, totalPrestado, totalGastos, saldoEfectivo }
}

async function main() {
  // Fecha a cerrar (ayer por defecto)
  const fechaArg = process.argv[2]
  let fechaCierre: string

  if (fechaArg) {
    fechaCierre = fechaArg
  } else {
    // Calcular ayer en hora Ecuador (UTC-5)
    const ahora = new Date()
    const ecuadorMs = ahora.getTime() - (5 * 60 * 60 * 1000)
    const ayer = new Date(ecuadorMs)
    ayer.setDate(ayer.getDate() - 1)
    fechaCierre = ayer.toISOString().split('T')[0]
  }

  console.log(`\n🗓️  Ejecutando cierre retroactivo para: ${fechaCierre}`)
  console.log("=".repeat(60))

  const { inicio: fechaInicio, fin: fechaFin } = getEcuadorDayRange(fechaCierre)
  // Normalizar fecha de cierre a medianoche Ecuador (para que coincida con el índice único)
  const fechaCierreNorm = new Date(`${fechaCierre}T05:00:00.000Z`)

  // Obtener todos los cobradores activos
  const cobradores = await prisma.user.findMany({
    where: { role: "COBRADOR", isActive: true },
    select: { id: true, firstName: true, lastName: true, name: true }
  })

  console.log(`\nCobradores activos encontrados: ${cobradores.length}`)

  let totalCreados = 0
  let totalOmitidos = 0

  for (const cobrador of cobradores) {
    const nombre = cobrador.firstName
      ? `${cobrador.firstName} ${cobrador.lastName}`
      : cobrador.name || cobrador.id

    // Verificar si ya existe cierre para este cobrador en esta fecha
    const cierreExistente = await prisma.cierreDia.findUnique({
      where: { userId_fecha: { userId: cobrador.id, fecha: fechaCierreNorm } }
    })

    if (cierreExistente) {
      console.log(`\n⚠️  ${nombre}: Ya tiene cierre (Saldo: $${cierreExistente.saldoEfectivo}) — omitido`)
      totalOmitidos++
      continue
    }

    // Obtener saldo inicial de forma centralizada (acumulando días intermedios no cerrados)
    const { saldoInicial: saldoInicialDia } = await obtenerSaldoInicialParaDia(cobrador.id, fechaInicio)

    // Calcular los totales del día
    const { totalCobrado, totalPrestado, totalGastos, saldoEfectivo } =
      await calcularSaldoParaDia(cobrador.id, fechaInicio, fechaFin, saldoInicialDia)

    // Si no tuvo actividad, no crear cierre (saldo $0 y sin movimientos)
    if (totalCobrado === 0 && totalPrestado === 0 && totalGastos === 0 && saldoEfectivo === 0) {
      console.log(`\n⏭️  ${nombre}: Sin actividad en ${fechaCierre} — omitido`)
      totalOmitidos++
      continue
    }

    // Crear el cierre
    const cierre = await prisma.cierreDia.create({
      data: {
        fecha: fechaCierreNorm,
        userId: cobrador.id,
        totalCobrado,
        totalPrestado,
        totalGastos,
        saldoEfectivo,
        observaciones: `Cierre retroactivo generado automáticamente`
      }
    })

    console.log(`\n✅ ${nombre}:`)
    console.log(`   Caja Anterior:  $${saldoInicialDia.toFixed(2)}`)
    console.log(`   Cobrado:        $${totalCobrado.toFixed(2)}`)
    console.log(`   Prestado:       $${totalPrestado.toFixed(2)}`)
    console.log(`   Gastos:         $${totalGastos.toFixed(2)}`)
    console.log(`   → Saldo Final:  $${saldoEfectivo.toFixed(2)}`)
    totalCreados++
  }

  console.log("\n" + "=".repeat(60))
  console.log(`✅ Cierres creados: ${totalCreados}`)
  console.log(`⏭️  Omitidos:       ${totalOmitidos}`)
  console.log("\nAhora el informe de hoy mostrará correctamente la Caja Anterior.")
}

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())

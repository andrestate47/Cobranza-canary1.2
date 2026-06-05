/**
 * Script de reparación de saldos en producción.
 * Uso: DATABASE_URL="postgresql://..." node scripts/repair-cierres-produccion.js
 * 
 * Recalcula los saldoEfectivo de TODOS los cierres de TODOS los cobradores,
 * usando la nueva lógica: saldoInicial = saldoEfectivo del cierre anterior.
 * NO acumula movimientos de días intermedios (domingo, etc.).
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Zona horaria de Ecuador (UTC-5)
const ECUADOR_OFFSET_MS = -5 * 60 * 60 * 1000

function getEcuadorDayRange(fecha) {
  // fecha es un Date o string ISO
  const d = new Date(fecha)
  // Normalizar a medianoche Ecuador
  const ecStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }) // 'YYYY-MM-DD'
  const [year, month, day] = ecStr.split('-').map(Number)
  const inicio = new Date(Date.UTC(year, month - 1, day, 5, 0, 0)) // 00:00 Ecuador = 05:00 UTC
  const fin = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59)) // 23:59:59 Ecuador
  return { inicio, fin }
}

async function calcularSaldoDelDia(userId, fechaInicio, fechaFin, saldoInicialDia) {
  const pagos = await prisma.pago.aggregate({
    _sum: { monto: true },
    where: { userId, fecha: { gte: fechaInicio, lte: fechaFin } }
  })
  const totalCobrado = Number(pagos._sum.monto || 0)

  const prestamos = await prisma.prestamo.aggregate({
    _sum: { monto: true },
    where: { userId, createdAt: { gte: fechaInicio, lte: fechaFin } }
  })
  const totalPrestado = Number(prestamos._sum.monto || 0)

  const gastos = await prisma.gasto.aggregate({
    _sum: { monto: true },
    where: { userId, fecha: { gte: fechaInicio, lte: fechaFin } }
  })
  const totalGastos = Number(gastos._sum.monto || 0)

  const movimientos = await prisma.movimientoCajaChica.findMany({
    where: { cobradorId: userId, fecha: { gte: fechaInicio, lte: fechaFin } }
  })
  const TIPOS_INGRESO = ["INGRESO", "ENTREGADO", "ENTREGA", "APERTURA_CAJA"]
  const TIPOS_EGRESO  = ["EGRESO", "EGRESO_GENERAL", "DEVUELTO", "DEVOLUCION", "GASTO", "GASTADO"]
  const ingresosExtra = movimientos.filter(m => TIPOS_INGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)
  const egresosExtra  = movimientos.filter(m => TIPOS_EGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)

  const saldoEfectivo = saldoInicialDia + totalCobrado - totalPrestado - totalGastos + ingresosExtra - egresosExtra
  return { totalCobrado, totalPrestado, totalGastos, saldoEfectivo }
}

async function main() {
  // Obtener todos los cobradores
  const cobradores = await prisma.user.findMany({
    where: { role: 'COBRADOR' },
    select: { id: true, email: true, firstName: true, lastName: true }
  })

  console.log(`Cobradores encontrados: ${cobradores.length}`)

  for (const cobrador of cobradores) {
    const nombre = `${cobrador.firstName || ''} ${cobrador.lastName || ''}`.trim() || cobrador.email
    console.log(`\n====== Procesando: ${nombre} (${cobrador.email}) ======`)

    // Obtener todos sus cierres ordenados cronológicamente
    const cierres = await prisma.cierreDia.findMany({
      where: { userId: cobrador.id },
      orderBy: { fecha: 'asc' }
    })

    console.log(`  Cierres encontrados: ${cierres.length}`)

    let cierreAnterior = null

    for (const cierre of cierres) {
      const saldoInicial = cierreAnterior ? Number(cierreAnterior.saldoEfectivo) : 0
      const { inicio, fin } = getEcuadorDayRange(cierre.fecha)
      
      const { totalCobrado, totalPrestado, totalGastos, saldoEfectivo } = 
        await calcularSaldoDelDia(cobrador.id, inicio, fin, saldoInicial)

      const saldoActual = Number(cierre.saldoEfectivo)
      const cambio = Math.abs(saldoEfectivo - saldoActual) > 0.01

      if (cambio) {
        console.log(`  [CORRECCIÓN] ${cierre.fecha.toISOString().split('T')[0]}: saldo ${saldoActual} → ${saldoEfectivo}`)
        console.log(`    saldoInicial=${saldoInicial}, cobrado=${totalCobrado}, prestado=${totalPrestado}, gastos=${totalGastos}`)
        
        await prisma.cierreDia.update({
          where: { id: cierre.id },
          data: { totalCobrado, totalPrestado, totalGastos, saldoEfectivo }
        })
        
        // Actualizar para siguiente iteración
        cierre.saldoEfectivo = saldoEfectivo
      } else {
        console.log(`  [OK]         ${cierre.fecha.toISOString().split('T')[0]}: saldo ${saldoActual} (sin cambios)`)
      }

      cierreAnterior = cierre
    }
  }

  console.log('\n✅ Reparación completa.')
}

main().catch(console.error).finally(() => prisma.$disconnect())

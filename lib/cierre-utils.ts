import { prisma } from "./db"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isBefore from 'dayjs/plugin/isBefore'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBefore)

const ECUADOR_TZ = 'America/Guayaquil'
const TIPOS_INGRESO = ["INGRESO", "ENTREGADO", "ENTREGA", "APERTURA_CAJA"]
const TIPOS_EGRESO  = ["EGRESO", "EGRESO_GENERAL", "DEVUELTO", "DEVOLUCION", "GASTO", "GASTADO"]

/**
 * Calcula el saldo inicial para un día dado.
 * Regla: saldoInicial = saldoEfectivo del último cierre anterior +
 *        movimientos netos de los días sin cerrar entre ese cierre y el día actual.
 * Esto permite gaps de varios días (ej: fin de semana, feriados) sin perder datos.
 */
export async function obtenerSaldoInicialParaDia(userId: string, fechaInicio: Date) {
  const cierreAnterior = await prisma.cierreDia.findFirst({
    where: { userId, fecha: { lt: fechaInicio } },
    orderBy: { fecha: 'desc' }
  })

  let saldoInicial = 0
  let diasSinCerrar = 0

  if (cierreAnterior) {
    saldoInicial = parseFloat(cierreAnterior.saldoEfectivo.toString())

    // Inicio del día siguiente al último cierre (en Ecuador)
    const fechaDesde = dayjs.tz(cierreAnterior.fecha, ECUADOR_TZ).add(1, 'day').startOf('day').toDate()

    if (fechaDesde < fechaInicio) {
      // Contar días LABORALES sin cerrar (para la alerta, excluye domingos)
      let cursor = dayjs.tz(cierreAnterior.fecha, ECUADOR_TZ).add(1, 'day')
      const limite = dayjs.tz(fechaInicio, ECUADOR_TZ)
      while (cursor.isBefore(limite)) {
        if (cursor.day() !== 0) diasSinCerrar++ // 0 = domingo
        cursor = cursor.add(1, 'day')
      }

      // Acumular movimientos de los días intermedios sin cierre
      const [pagosAnt, prestamosAnt, gastosAnt, cajasAnt] = await Promise.all([
        prisma.pago.aggregate({ _sum: { monto: true }, where: { userId, fecha: { gte: fechaDesde, lt: fechaInicio } } }),
        prisma.prestamo.aggregate({ _sum: { monto: true }, where: { userId, createdAt: { gte: fechaDesde, lt: fechaInicio } } }),
        prisma.gasto.aggregate({ _sum: { monto: true }, where: { userId, fecha: { gte: fechaDesde, lt: fechaInicio } } }),
        prisma.movimientoCajaChica.findMany({ where: { cobradorId: userId, fecha: { gte: fechaDesde, lt: fechaInicio } } })
      ])

      const cobradoAnt  = Number(pagosAnt._sum.monto || 0)
      const prestadoAnt = Number(prestamosAnt._sum.monto || 0)
      const gastadoAnt  = Number(gastosAnt._sum.monto || 0)
      const ingresosAnt = cajasAnt.filter(m => TIPOS_INGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)
      const egresosAnt  = cajasAnt.filter(m => TIPOS_EGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)

      saldoInicial = saldoInicial + cobradoAnt - prestadoAnt - gastadoAnt + ingresosAnt - egresosAnt
    }
  } else {
    // Sin cierres previos: activar alerta
    diasSinCerrar = 1
    saldoInicial = 0
  }

  return { saldoInicial, diasSinCerrar, cierreAnterior }
}

export async function calcularSaldoParaDia(userId: string, fechaInicio: Date, fechaFin: Date, saldoInicialDia: number) {
  const [pagos, prestamos, gastos, movimientos] = await Promise.all([
    prisma.pago.aggregate({ _sum: { monto: true }, where: { userId, fecha: { gte: fechaInicio, lte: fechaFin } } }),
    prisma.prestamo.aggregate({ _sum: { monto: true }, where: { userId, createdAt: { gte: fechaInicio, lte: fechaFin } } }),
    prisma.gasto.aggregate({ _sum: { monto: true }, where: { userId, fecha: { gte: fechaInicio, lte: fechaFin } } }),
    prisma.movimientoCajaChica.findMany({ where: { cobradorId: userId, fecha: { gte: fechaInicio, lte: fechaFin } } })
  ])

  const totalCobrado  = Number(pagos._sum.monto || 0)
  const totalPrestado = Number(prestamos._sum.monto || 0)
  const totalGastos   = Number(gastos._sum.monto || 0)
  const ingresosExtra = movimientos.filter(m => TIPOS_INGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)
  const egresosExtra  = movimientos.filter(m => TIPOS_EGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)

  const saldoEfectivo = saldoInicialDia + totalCobrado - totalPrestado - totalGastos + ingresosExtra - egresosExtra
  return { totalCobrado, totalPrestado, totalGastos, saldoEfectivo }
}

/**
 * Propaga el saldo correcto hacia los cierres POSTERIORES al día indicado.
 * Empieza desde el día SIGUIENTE para no sobreescribir el cierre recién creado.
 */
export async function recalcularYPropagarSaldos(userId: string, fechaDesde: Date) {
  const { getEcuadorDayRange } = await import('./date-utils')

  // Buscar solo cierres DESPUÉS de fechaDesde (no el mismo día)
  const fechaSiguiente = dayjs.tz(fechaDesde, ECUADOR_TZ).add(1, 'day').startOf('day').toDate()

  const cierres = await prisma.cierreDia.findMany({
    where: { userId, fecha: { gte: fechaSiguiente } },
    orderBy: { fecha: 'asc' }
  })

  for (const cierre of cierres) {
    const { inicio: fechaInicio, fin: fechaFin } = getEcuadorDayRange(cierre.fecha.toISOString())
    const { saldoInicial } = await obtenerSaldoInicialParaDia(userId, fechaInicio)
    const { totalCobrado, totalPrestado, totalGastos, saldoEfectivo } =
      await calcularSaldoParaDia(userId, fechaInicio, fechaFin, saldoInicial)

    await prisma.cierreDia.update({
      where: { id: cierre.id },
      data: { totalCobrado, totalPrestado, totalGastos, saldoEfectivo }
    })
  }
}

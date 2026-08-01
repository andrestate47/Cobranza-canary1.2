import { prisma } from "./db"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const ECUADOR_TZ = 'America/Guayaquil'
const TIPOS_INGRESO = ["INGRESO", "ENTREGADO", "ENTREGA", "APERTURA_CAJA"]
const TIPOS_EGRESO  = ["EGRESO", "EGRESO_GENERAL", "DEVUELTO", "DEVOLUCION"]

/**
 * Calcula los movimientos netos de un rango de fechas para un usuario dado.
 */
export async function calcularMovimientosNetosParaRango(
  userId: string, 
  whereFecha: { gte?: Date; lt?: Date; lte?: Date }
) {
  const [pagos, prestamos, gastos, movimientos] = await Promise.all([
    prisma.pago.aggregate({ _sum: { monto: true }, where: { userId, fecha: whereFecha } }),
    prisma.prestamo.aggregate({ _sum: { monto: true }, where: { userId, createdAt: whereFecha } }),
    prisma.gasto.aggregate({ _sum: { monto: true }, where: { userId, fecha: whereFecha } }),
    prisma.movimientoCajaChica.findMany({ where: { cobradorId: userId, fecha: whereFecha } })
  ])

  const totalCobrado = Number(pagos._sum.monto || 0)
  const totalPrestado = Number(prestamos._sum.monto || 0)
  const gastosDirectos = Number(gastos._sum.monto || 0)

  const ingresosExtra = movimientos
    .filter(m => TIPOS_INGRESO.includes(m.tipo))
    .reduce((s, m) => s + Number(m.monto), 0)

  const egresosExtra = movimientos
    .filter(m => TIPOS_EGRESO.includes(m.tipo))
    .filter(m => !(m.observaciones && (m.observaciones.includes("Refinanciamiento préstamo:") || m.observaciones.includes("Renovación préstamo:"))))
    .reduce((s, m) => s + Number(m.monto), 0)

  const gastosCajaChica = movimientos
    .filter(m => m.tipo === "GASTO" || m.tipo === "GASTADO")
    .reduce((s, m) => s + Number(m.monto), 0)

  const gastosSueldos = movimientos
    .filter(m => m.tipo === "PAGO_SUELDO")
    .reduce((s, m) => s + Number(m.monto), 0)

  const totalGastosReal = gastosDirectos + gastosCajaChica + gastosSueldos

  const flujoNeto = totalCobrado - totalPrestado - totalGastosReal + ingresosExtra - egresosExtra

  return {
    totalCobrado,
    totalPrestado,
    totalGastos: totalGastosReal,
    gastosDirectos,
    gastosCajaChica,
    gastosSueldos,
    ingresosExtra,
    egresosExtra,
    flujoNeto
  }
}

/**
 * Obtiene el saldo inicial para un día dado.
 * Regla: saldoInicial = saldoEfectivo del último cierre anterior +
 *        movimientos netos de los días sin cerrar entre ese cierre y el día actual.
 * Si no existen cierres anteriores, acumula los movimientos históricos antes de fechaInicio.
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
      while (cursor.valueOf() < limite.valueOf()) {
        if (cursor.day() !== 0) diasSinCerrar++ // 0 = domingo
        cursor = cursor.add(1, 'day')
      }

      // Acumular movimientos de los días intermedios sin cierre
      const { flujoNeto } = await calcularMovimientosNetosParaRango(userId, {
        gte: fechaDesde,
        lt: fechaInicio
      })

      saldoInicial += flujoNeto
    }
  } else {
    // Sin cierres previos: acumular todos los movimientos antes de fechaInicio
    diasSinCerrar = 1
    const { flujoNeto } = await calcularMovimientosNetosParaRango(userId, {
      lt: fechaInicio
    })
    saldoInicial = flujoNeto
  }

  return { saldoInicial, diasSinCerrar, cierreAnterior }
}

export async function calcularSaldoParaDia(userId: string, fechaInicio: Date, fechaFin: Date, saldoInicialDia: number) {
  const { totalCobrado, totalPrestado, totalGastos, flujoNeto } = 
    await calcularMovimientosNetosParaRango(userId, { gte: fechaInicio, lte: fechaFin })

  const saldoEfectivo = saldoInicialDia + flujoNeto
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


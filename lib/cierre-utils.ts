import { prisma } from "./db"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const ECUADOR_TZ = 'America/Guayaquil'

export async function obtenerSaldoInicialParaDia(userId: string, fechaInicio: Date) {
  // El saldo inicial de cualquier día es SIEMPRE el saldoEfectivo del último cierre anterior.
  // Los domingos u otros días no laborales NO acumulan saldo — sus movimientos se cuentan
  // dentro del día laboral donde realmente se registraron (los queries por fecha ya los capturan).
  const cierreAnterior = await prisma.cierreDia.findFirst({
    where: {
      userId: userId,
      fecha: {
        lt: fechaInicio
      }
    },
    orderBy: {
      fecha: 'desc'
    }
  })

  let saldoInicial = 0
  let diasSinCerrar = 0

  if (cierreAnterior) {
    // Saldo inicial = exactamente lo que quedó guardado en el último cierre
    saldoInicial = parseFloat(cierreAnterior.saldoEfectivo.toString())

    // Calcular días laborales sin cerrar (para mostrar la alerta informativa)
    // Solo contamos días de lunes a sábado entre el último cierre y hoy
    const diaUltimoCierre = dayjs.tz(cierreAnterior.fecha, ECUADOR_TZ)
    const diaConsultado = dayjs.tz(fechaInicio, ECUADOR_TZ)
    let diasLaboralesSinCerrar = 0
    let cursor = diaUltimoCierre.add(1, 'day')
    while (cursor.isBefore(diaConsultado)) {
      const dow = cursor.day() // 0=domingo, 6=sábado
      if (dow !== 0) { // excluir domingos
        diasLaboralesSinCerrar++
      }
      cursor = cursor.add(1, 'day')
    }
    diasSinCerrar = diasLaboralesSinCerrar
  } else {
    // Si nunca ha cerrado caja, activar alerta
    diasSinCerrar = 1
    saldoInicial = 0
  }

  return { saldoInicial, diasSinCerrar, cierreAnterior }
}

export async function calcularSaldoParaDia(userId: string, fechaInicio: Date, fechaFin: Date, saldoInicialDia: number) {
  // Pagos del día (todos los métodos)
  const pagos = await prisma.pago.aggregate({
    _sum: { monto: true },
    where: { userId, fecha: { gte: fechaInicio, lte: fechaFin } }
  })
  const totalCobrado = Number(pagos._sum.monto || 0)

  // Préstamos del día
  const prestamos = await prisma.prestamo.aggregate({
    _sum: { monto: true },
    where: { userId, createdAt: { gte: fechaInicio, lte: fechaFin } }
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

export async function recalcularYPropagarSaldos(userId: string, fechaDesde: Date) {
  // Propagar saldos a los cierres POSTERIORES al fechaDesde (no al mismo día).
  // El cierre del día fechaDesde ya fue guardado correctamente por quien llamó esta función.
  const { getEcuadorDayRange } = await import('./date-utils')
  const fechaSiguiente = dayjs.tz(fechaDesde, ECUADOR_TZ).add(1, 'day').startOf('day').toDate()

  const cierres = await prisma.cierreDia.findMany({
    where: {
      userId,
      fecha: {
        gte: fechaSiguiente
      }
    },
    orderBy: {
      fecha: 'asc'
    }
  })

  for (const cierre of cierres) {
    const { inicio: fechaInicio, fin: fechaFin } = getEcuadorDayRange(cierre.fecha.toISOString())
    
    // Saldo inicial = saldoEfectivo del cierre anterior (ya corregido en iteración previa)
    const { saldoInicial } = await obtenerSaldoInicialParaDia(userId, fechaInicio)
    
    // Recalcular con el saldo inicial correcto
    const { totalCobrado, totalPrestado, totalGastos, saldoEfectivo } = 
      await calcularSaldoParaDia(userId, fechaInicio, fechaFin, saldoInicial)
      
    await prisma.cierreDia.update({
      where: { id: cierre.id },
      data: {
        totalCobrado,
        totalPrestado,
        totalGastos,
        saldoEfectivo
      }
    })
  }
}



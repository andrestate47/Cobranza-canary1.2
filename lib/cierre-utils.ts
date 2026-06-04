import { prisma } from "./db"

export async function calcularSaldoParaDia(userId: string, fechaInicio: Date, fechaFin: Date, saldoInicialDia: number) {
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

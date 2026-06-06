import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

function getEcuadorEndOfDay(fecha: Date | string) {
  const d = typeof fecha === 'string' ? new Date(fecha + 'T12:00:00Z') : fecha
  const ecStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  const [year, month, day] = ecStr.split('-').map(Number)
  // Fin del día Ecuador (UTC-5) = 04:59:59 UTC del día siguiente
  return new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59))
}

function getEcuadorDayRange(fecha: Date) {
  const ecStr = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  const [year, month, day] = ecStr.split('-').map(Number)
  const inicio = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))
  const fin    = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59))
  return { inicio, fin }
}

/**
 * Calcula el saldo efectivo ACUMULADO de un cobrador desde el principio de los tiempos
 * hasta el fin del día indicado. Esta es la fuente de verdad absoluta.
 */
async function calcularSaldoAcumuladoHasta(userId: string, hasta: Date) {
  const [pagos, prestamos, gastos, movimientos] = await Promise.all([
    prisma.pago.aggregate({ _sum: { monto: true }, where: { userId, fecha: { lte: hasta } } }),
    prisma.prestamo.aggregate({ _sum: { monto: true }, where: { userId, createdAt: { lte: hasta } } }),
    prisma.gasto.aggregate({ _sum: { monto: true }, where: { userId, fecha: { lte: hasta } } }),
    prisma.movimientoCajaChica.findMany({ where: { cobradorId: userId, fecha: { lte: hasta } } })
  ])

  const TIPOS_INGRESO = ["INGRESO", "ENTREGADO", "ENTREGA", "APERTURA_CAJA"]
  const TIPOS_EGRESO  = ["EGRESO", "EGRESO_GENERAL", "DEVUELTO", "DEVOLUCION", "GASTO", "GASTADO"]
  const ingresosExtra = movimientos.filter(m => TIPOS_INGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)
  const egresosExtra  = movimientos.filter(m => TIPOS_EGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)

  return Number(pagos._sum.monto || 0)
    - Number(prestamos._sum.monto || 0)
    - Number(gastos._sum.monto || 0)
    + ingresosExtra
    - egresosExtra
}

/**
 * Calcula los totales solo del día (para almacenar en el cierre).
 */
async function calcularMovimientosDelDia(userId: string, inicio: Date, fin: Date) {
  const [pagos, prestamos, gastos, movimientos] = await Promise.all([
    prisma.pago.aggregate({ _sum: { monto: true }, where: { userId, fecha: { gte: inicio, lte: fin } } }),
    prisma.prestamo.aggregate({ _sum: { monto: true }, where: { userId, createdAt: { gte: inicio, lte: fin } } }),
    prisma.gasto.aggregate({ _sum: { monto: true }, where: { userId, fecha: { gte: inicio, lte: fin } } }),
    prisma.movimientoCajaChica.findMany({ where: { cobradorId: userId, fecha: { gte: inicio, lte: fin } } })
  ])

  const TIPOS_INGRESO = ["INGRESO", "ENTREGADO", "ENTREGA", "APERTURA_CAJA"]
  const TIPOS_EGRESO  = ["EGRESO", "EGRESO_GENERAL", "DEVUELTO", "DEVOLUCION", "GASTO", "GASTADO"]
  const ingresosExtra = movimientos.filter(m => TIPOS_INGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)
  const egresosExtra  = movimientos.filter(m => TIPOS_EGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)

  return {
    totalCobrado:  Number(pagos._sum.monto || 0),
    totalPrestado: Number(prestamos._sum.monto || 0),
    totalGastos:   Number(gastos._sum.monto || 0) + egresosExtra,
    ingresosExtra,
    egresosExtra
  }
}

/**
 * GET /api/admin/repair-cierres
 *
 * Recalcula el saldoEfectivo de cada cierre usando el acumulado histórico real
 * hasta el fin de ese día. Esto corrige automáticamente gaps de días sin cierre.
 *
 * Parámetros:
 *   ?dry=true     → solo simula, no aplica cambios
 *   ?desde=YYYY-MM-DD → solo recalcula cierres POSTERIORES a esa fecha
 *                       (útil para no tocar datos históricos anteriores)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email! } })
    if (!currentUser || currentUser.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dryRun   = searchParams.get("dry") === "true"
    const desdeStr = searchParams.get("desde") // ej: "2026-05-30"

    const cobradores = await prisma.user.findMany({
      where: { role: 'COBRADOR' },
      select: { id: true, email: true, firstName: true, lastName: true }
    })

    const resultados: any[] = []

    for (const cobrador of cobradores) {
      const nombre = `${cobrador.firstName || ''} ${cobrador.lastName || ''}`.trim() || cobrador.email
      const cierresDelCobrador: any[] = []

      const whereClause: any = { userId: cobrador.id }
      if (desdeStr) {
        whereClause.fecha = { gt: getEcuadorEndOfDay(desdeStr) }
      }

      const cierres = await prisma.cierreDia.findMany({
        where: whereClause,
        orderBy: { fecha: 'asc' }
      })

      for (const cierre of cierres) {
        const finDelDia = getEcuadorEndOfDay(cierre.fecha)
        const { inicio }  = getEcuadorDayRange(cierre.fecha)

        // El saldo correcto es el acumulado histórico hasta el fin de ese día
        const saldoEfectivoCorrecto = await calcularSaldoAcumuladoHasta(cobrador.id, finDelDia)

        // Los totales del día (para guardar en el registro del cierre)
        const mov = await calcularMovimientosDelDia(cobrador.id, inicio, finDelDia)

        const saldoActual = Number(cierre.saldoEfectivo)
        const hayDiferencia = Math.abs(saldoEfectivoCorrecto - saldoActual) > 0.01

        cierresDelCobrador.push({
          fecha:          cierre.fecha.toISOString().split('T')[0],
          saldoAnterior:  parseFloat(saldoActual.toFixed(2)),
          saldoNuevo:     parseFloat(saldoEfectivoCorrecto.toFixed(2)),
          totalCobrado:   parseFloat(mov.totalCobrado.toFixed(2)),
          totalPrestado:  parseFloat(mov.totalPrestado.toFixed(2)),
          totalGastos:    parseFloat(mov.totalGastos.toFixed(2)),
          corregido:      hayDiferencia
        })

        if (hayDiferencia && !dryRun) {
          await prisma.cierreDia.update({
            where: { id: cierre.id },
            data: {
              totalCobrado:  mov.totalCobrado,
              totalPrestado: mov.totalPrestado,
              totalGastos:   mov.totalGastos,
              saldoEfectivo: saldoEfectivoCorrecto
            }
          })
        }
      }

      resultados.push({
        cobrador:     nombre,
        email:        cobrador.email,
        totalCierres: cierres.length,
        corregidos:   cierresDelCobrador.filter(c => c.corregido).length,
        cierres:      cierresDelCobrador
      })
    }

    return NextResponse.json({
      dryRun,
      desde:   desdeStr || "inicio de los tiempos",
      mensaje: dryRun
        ? "Simulación — no se aplicaron cambios. Quita ?dry=true para aplicar."
        : "Reparación aplicada correctamente.",
      resultados
    })
  } catch (error) {
    console.error("Error en repair-cierres:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

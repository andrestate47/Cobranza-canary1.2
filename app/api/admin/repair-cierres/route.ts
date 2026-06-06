import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const TIPOS_INGRESO = ["INGRESO", "ENTREGADO", "ENTREGA", "APERTURA_CAJA"]
const TIPOS_EGRESO  = ["EGRESO", "EGRESO_GENERAL", "DEVUELTO", "DEVOLUCION", "GASTO", "GASTADO"]

function getEcuadorDayRange(fecha: Date) {
  const ecStr = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  const [year, month, day] = ecStr.split('-').map(Number)
  const inicio = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))
  const fin    = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59))
  return { inicio, fin }
}

/** Suma los movimientos netos de un rango de fechas */
async function calcularMovimientosEnRango(userId: string, desde: Date, hasta: Date) {
  const [pagos, prestamos, gastos, cajas] = await Promise.all([
    prisma.pago.aggregate({ _sum: { monto: true }, where: { userId, fecha: { gte: desde, lte: hasta } } }),
    prisma.prestamo.aggregate({ _sum: { monto: true }, where: { userId, createdAt: { gte: desde, lte: hasta } } }),
    prisma.gasto.aggregate({ _sum: { monto: true }, where: { userId, fecha: { gte: desde, lte: hasta } } }),
    prisma.movimientoCajaChica.findMany({ where: { cobradorId: userId, fecha: { gte: desde, lte: hasta } } })
  ])
  const ingresosExtra = cajas.filter(m => TIPOS_INGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)
  const egresosExtra  = cajas.filter(m => TIPOS_EGRESO.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)
  return {
    cobrado:  Number(pagos._sum.monto || 0),
    prestado: Number(prestamos._sum.monto || 0),
    gastos:   Number(gastos._sum.monto || 0),
    ingresosExtra,
    egresosExtra,
    neto: Number(pagos._sum.monto || 0) - Number(prestamos._sum.monto || 0) - Number(gastos._sum.monto || 0) + ingresosExtra - egresosExtra
  }
}

/**
 * GET /api/admin/repair-cierres
 *
 * Recalcula saldoEfectivo de cada cierre usando cadena correcta:
 *   - Empieza desde saldoInicial=0 en el primer cierre
 *   - Para gaps entre cierres, acumula los movimientos intermedios
 *   - Cada cierre: saldoEfectivo = saldoAnterior + movimientosIntermedios + movimientosDia
 *
 * Params:
 *   ?dry=true  → simula sin guardar
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
    const desdeStr = searchParams.get("desde") // ej: "2026-06-01"


    const cobradores = await prisma.user.findMany({
      where: { role: 'COBRADOR' },
      select: { id: true, email: true, firstName: true, lastName: true }
    })

    const resultados: any[] = []

    for (const cobrador of cobradores) {
      const nombre = `${cobrador.firstName || ''} ${cobrador.lastName || ''}`.trim() || cobrador.email

      // Definir la fecha de inicio del filtro
      let fechaDesdeFiltro: Date | null = null
      if (desdeStr) {
        // Usamos inicio del día para incluir cualquier cierre en esa fecha
        const ecStr = desdeStr // YYYY-MM-DD
        const [year, month, day] = ecStr.split('-').map(Number)
        fechaDesdeFiltro = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))
      }

      // Obtener el último cierre ANTES de la fecha desde (si hay filtro)
      let saldoAcumulado = 0
      let finCierreAnterior: Date | null = null

      if (fechaDesdeFiltro) {
        const cierrePrevio = await prisma.cierreDia.findFirst({
          where: { userId: cobrador.id, fecha: { lt: fechaDesdeFiltro } },
          orderBy: { fecha: 'desc' }
        })
        if (cierrePrevio) {
          saldoAcumulado = Number(cierrePrevio.saldoEfectivo)
          const { fin } = getEcuadorDayRange(cierrePrevio.fecha)
          finCierreAnterior = fin
        }
      }

      // Obtener los cierres a reparar (desde la fecha dada, o todos)
      const cierres = await prisma.cierreDia.findMany({
        where: {
          userId: cobrador.id,
          ...(fechaDesdeFiltro ? { fecha: { gte: fechaDesdeFiltro } } : {})
        },
        orderBy: { fecha: 'asc' }
      })

      const detalles: any[] = []

      for (const cierre of cierres) {
        const { inicio, fin } = getEcuadorDayRange(cierre.fecha)

        // Si hay un gap entre el cierre anterior y este, sumar movimientos intermedios
        if (finCierreAnterior !== null && finCierreAnterior < inicio) {
          const diaGapInicio = new Date(finCierreAnterior.getTime() + 1)
          const diaGapFin = new Date(inicio.getTime() - 1)
          const gapMovs = await calcularMovimientosEnRango(cobrador.id, diaGapInicio, diaGapFin)
          saldoAcumulado += gapMovs.neto
        }

        // Movimientos del día del cierre
        const movsDia = await calcularMovimientosEnRango(cobrador.id, inicio, fin)
        const saldoNuevo = saldoAcumulado + movsDia.neto

        const saldoActual = Number(cierre.saldoEfectivo)
        const hayDiferencia = Math.abs(saldoNuevo - saldoActual) > 0.01

        detalles.push({
          fecha:         cierre.fecha.toISOString().split('T')[0],
          saldoAnterior: parseFloat(saldoActual.toFixed(2)),
          saldoNuevo:    parseFloat(saldoNuevo.toFixed(2)),
          saldoInicial:  parseFloat(saldoAcumulado.toFixed(2)),
          totalCobrado:  parseFloat(movsDia.cobrado.toFixed(2)),
          totalPrestado: parseFloat(movsDia.prestado.toFixed(2)),
          totalGastos:   parseFloat((movsDia.gastos + movsDia.egresosExtra).toFixed(2)),
          corregido:     hayDiferencia
        })

        if (hayDiferencia && !dryRun) {
          await prisma.cierreDia.update({
            where: { id: cierre.id },
            data: {
              totalCobrado:  movsDia.cobrado,
              totalPrestado: movsDia.prestado,
              totalGastos:   movsDia.gastos,
              saldoEfectivo: saldoNuevo
            }
          })
        }

        // Actualizar para la siguiente iteración
        saldoAcumulado = saldoNuevo
        finCierreAnterior = fin
      }

      resultados.push({
        cobrador:     nombre,
        email:        cobrador.email,
        totalCierres: cierres.length,
        corregidos:   detalles.filter(d => d.corregido).length,
        cierres:      detalles
      })
    }

    return NextResponse.json({
      dryRun,
      mensaje: dryRun
        ? "Simulación — no se aplicaron cambios. Quita ?dry=true para aplicar."
        : "Reparación aplicada correctamente.",
      resultados
    })
  } catch (error) {
    console.error("Error repair-cierres:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

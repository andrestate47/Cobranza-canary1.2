import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

function getEcuadorDayRange(fecha: Date) {
  const ecStr = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  const [year, month, day] = ecStr.split('-').map(Number)
  const inicio = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))
  const fin    = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59))
  return { inicio, fin }
}

function getEcuadorEndOfDay(fechaStr: string) {
  const [year, month, day] = fechaStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59))
}

async function calcularSaldoDelDia(
  userId: string,
  fechaInicio: Date,
  fechaFin: Date,
  saldoInicialDia: number
) {
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

/**
 * Calcula el saldo real acumulado desde el inicio hasta el fin del día indicado.
 * Suma todos los cobros, resta todos los préstamos y gastos, en toda la historia.
 */
async function calcularSaldoAcumuladoHasta(userId: string, hasta: Date) {
  const pagos = await prisma.pago.aggregate({
    _sum: { monto: true },
    where: { userId, fecha: { lte: hasta } }
  })
  const prestamos = await prisma.prestamo.aggregate({
    _sum: { monto: true },
    where: { userId, createdAt: { lte: hasta } }
  })
  const gastos = await prisma.gasto.aggregate({
    _sum: { monto: true },
    where: { userId, fecha: { lte: hasta } }
  })
  const movimientos = await prisma.movimientoCajaChica.findMany({
    where: { cobradorId: userId, fecha: { lte: hasta } }
  })
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
 * GET /api/admin/repair-cierres
 *
 * Parámetros de query:
 *   ?dry=true            → solo simula, no aplica cambios
 *   ?desde=YYYY-MM-DD    → calcula el saldo acumulado real hasta esa fecha y
 *                          recalcula en cadena todos los cierres desde ese punto.
 *                          Si no se indica, recalcula desde el primer cierre.
 *
 * Ejemplo de uso:
 *   /api/admin/repair-cierres?desde=2026-05-30&dry=true   ← ver qué va a cambiar
 *   /api/admin/repair-cierres?desde=2026-05-30            ← aplicar corrección
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })
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

      let saldoBase = 0
      let cierres

      if (desdeStr) {
        // 1. Calcular el saldo real acumulado hasta el FIN del día "desde" (ej: 30/05)
        const finDelDia = getEcuadorEndOfDay(desdeStr)
        saldoBase = await calcularSaldoAcumuladoHasta(cobrador.id, finDelDia)

        // 2. Obtener solo los cierres POSTERIORES a esa fecha
        cierres = await prisma.cierreDia.findMany({
          where: { userId: cobrador.id, fecha: { gt: finDelDia } },
          orderBy: { fecha: 'asc' }
        })
      } else {
        // Sin filtro: recalcular todos los cierres desde el principio
        cierres = await prisma.cierreDia.findMany({
          where: { userId: cobrador.id },
          orderBy: { fecha: 'asc' }
        })
        saldoBase = 0
      }

      // saldoAnterior empieza como saldoBase (el "punto cero" conocido)
      let saldoAnterior = saldoBase

      for (const cierre of cierres) {
        const { inicio, fin } = getEcuadorDayRange(cierre.fecha)

        const { totalCobrado, totalPrestado, totalGastos, saldoEfectivo } =
          await calcularSaldoDelDia(cobrador.id, inicio, fin, saldoAnterior)

        const saldoActual = Number(cierre.saldoEfectivo)
        const hayDiferencia = Math.abs(saldoEfectivo - saldoActual) > 0.01

        cierresDelCobrador.push({
          fecha:          cierre.fecha.toISOString().split('T')[0],
          saldoAnterior:  parseFloat(saldoActual.toFixed(2)),
          saldoNuevo:     parseFloat(saldoEfectivo.toFixed(2)),
          saldoInicial:   parseFloat(saldoAnterior.toFixed(2)),
          totalCobrado:   parseFloat(totalCobrado.toFixed(2)),
          totalPrestado:  parseFloat(totalPrestado.toFixed(2)),
          totalGastos:    parseFloat(totalGastos.toFixed(2)),
          corregido:      hayDiferencia
        })

        if (hayDiferencia && !dryRun) {
          await prisma.cierreDia.update({
            where: { id: cierre.id },
            data: { totalCobrado, totalPrestado, totalGastos, saldoEfectivo }
          })
        }

        // El saldo recalculado de este cierre es la base del siguiente
        saldoAnterior = saldoEfectivo
      }

      resultados.push({
        cobrador:       nombre,
        email:          cobrador.email,
        totalCierres:   cierres.length,
        saldoBaseUsado: desdeStr ? parseFloat(saldoBase.toFixed(2)) : "desde 0",
        corregidos:     cierresDelCobrador.filter(c => c.corregido).length,
        cierres:        cierresDelCobrador
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

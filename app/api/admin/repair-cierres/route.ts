import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

function getEcuadorDayRange(fecha: Date) {
  // Calcular el rango del día en zona horaria Ecuador (UTC-5)
  const ecStr = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  const [year, month, day] = ecStr.split('-').map(Number)
  const inicio = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))       // 00:00 Ecuador = 05:00 UTC
  const fin    = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59)) // 23:59:59 Ecuador
  return { inicio, fin }
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
 * GET /api/admin/repair-cierres
 * Solo administradores. Recalcula todos los saldoEfectivo de cierres usando
 * la lógica correcta: saldoInicial = saldoEfectivo del cierre anterior.
 * NO acumula movimientos de días intermedios (domingos, feriados, etc.).
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
    const dryRun = searchParams.get("dry") === "true"

    const cobradores = await prisma.user.findMany({
      where: { role: 'COBRADOR' },
      select: { id: true, email: true, firstName: true, lastName: true }
    })

    const resultados: any[] = []

    for (const cobrador of cobradores) {
      const nombre = `${cobrador.firstName || ''} ${cobrador.lastName || ''}`.trim() || cobrador.email
      const cierresDelCobrador: any[] = []

      const cierres = await prisma.cierreDia.findMany({
        where: { userId: cobrador.id },
        orderBy: { fecha: 'asc' }
      })

      let cierreAnterior: any = null

      for (const cierre of cierres) {
        const saldoInicial = cierreAnterior ? Number(cierreAnterior.saldoEfectivo) : 0
        const { inicio, fin } = getEcuadorDayRange(cierre.fecha)

        const { totalCobrado, totalPrestado, totalGastos, saldoEfectivo } =
          await calcularSaldoDelDia(cobrador.id, inicio, fin, saldoInicial)

        const saldoActual = Number(cierre.saldoEfectivo)
        const hayDiferencia = Math.abs(saldoEfectivo - saldoActual) > 0.01

        cierresDelCobrador.push({
          fecha: cierre.fecha.toISOString().split('T')[0],
          saldoAnterior: saldoActual,
          saldoNuevo: saldoEfectivo,
          saldoInicial,
          totalCobrado,
          totalPrestado,
          totalGastos,
          corregido: hayDiferencia
        })

        if (hayDiferencia && !dryRun) {
          await prisma.cierreDia.update({
            where: { id: cierre.id },
            data: { totalCobrado, totalPrestado, totalGastos, saldoEfectivo }
          })
          cierre.saldoEfectivo = saldoEfectivo as any
        }

        cierreAnterior = { ...cierre, saldoEfectivo: hayDiferencia ? saldoEfectivo : saldoActual }
      }

      resultados.push({
        cobrador: nombre,
        email: cobrador.email,
        totalCierres: cierres.length,
        corregidos: cierresDelCobrador.filter(c => c.corregido).length,
        cierres: cierresDelCobrador
      })
    }

    return NextResponse.json({
      dryRun,
      mensaje: dryRun
        ? "Simulación (dry run) — no se hicieron cambios. Llama sin ?dry=true para aplicar."
        : "Reparación aplicada correctamente.",
      resultados
    })
  } catch (error) {
    console.error("Error en repair-cierres:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

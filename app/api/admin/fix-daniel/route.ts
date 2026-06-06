import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

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

    const daniel = await prisma.user.findFirst({
      where: { email: 'cobrador@cobranza.com' }
    })

    if (!daniel) {
      return NextResponse.json({ error: "No se encontro a Daniel" }, { status: 404 })
    }

    const cierres = await prisma.cierreDia.findMany({
      where: { userId: daniel.id },
      orderBy: { fecha: 'asc' }
    })

    const TIPOS_INGRESO = ["INGRESO", "ENTREGADO", "ENTREGA", "APERTURA_CAJA"]
    const TIPOS_EGRESO  = ["EGRESO", "EGRESO_GENERAL", "DEVUELTO", "DEVOLUCION", "GASTO", "GASTADO"]

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
        neto: Number(pagos._sum.monto || 0) - Number(prestamos._sum.monto || 0) - Number(gastos._sum.monto || 0) + ingresosExtra - egresosExtra
      }
    }

    function getEcuadorDayRange(fecha: Date) {
      const ecStr = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
      const [year, month, day] = ecStr.split('-').map(Number)
      const inicio = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))
      const fin    = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59))
      return { inicio, fin }
    }

    const resultados = []
    let saldoAcumulado = 0
    let finCierreAnterior: Date | null = null

    for (const cierre of cierres) {
      const { inicio, fin } = getEcuadorDayRange(cierre.fecha)

      if (finCierreAnterior !== null && finCierreAnterior < inicio) {
        const diaGapInicio = new Date(finCierreAnterior.getTime() + 1)
        const diaGapFin = new Date(inicio.getTime() - 1)
        const gapMovs = await calcularMovimientosEnRango(daniel.id, diaGapInicio, diaGapFin)
        saldoAcumulado += gapMovs.neto
      }

      const movsDia = await calcularMovimientosEnRango(daniel.id, inicio, fin)
      const saldoNuevo = saldoAcumulado + movsDia.neto
      
      await prisma.cierreDia.update({
        where: { id: cierre.id },
        data: { saldoEfectivo: saldoNuevo }
      })
      
      resultados.push({
        fecha: cierre.fecha.toISOString().split('T')[0],
        saldoAnteriorGuardado: Number(cierre.saldoEfectivo),
        saldoNuevoCorrecto: saldoNuevo
      })

      saldoAcumulado = saldoNuevo
      finCierreAnterior = fin
    }

    return NextResponse.json({ mensaje: "Daniel reseteado a 0", resultados })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

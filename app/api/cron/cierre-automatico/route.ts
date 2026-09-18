import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getEcuadorDayRange, normalizeToEcuadorMidnight } from "@/lib/date-utils"
import { calcularSaldoParaDia, obtenerSaldoInicialParaDia, recalcularYPropagarSaldos } from "@/lib/cierre-utils"

export const dynamic = "force-dynamic"

async function ejecutarCierreAutomatico(fechaTarget?: string) {
  // Si no se especifica fecha, tomar la fecha actual en Ecuador (al dar las 12:00 AM se cierra el día)
  const hoyStr = fechaTarget || new Date().toISOString().split('T')[0]
  const fechaCierre = normalizeToEcuadorMidnight(hoyStr)
  const { inicio: fechaInicio, fin: fechaFin } = getEcuadorDayRange(hoyStr)

  const cobradores = await prisma.user.findMany({
    where: { role: "COBRADOR", isActive: true },
    select: { id: true, firstName: true, lastName: true, name: true }
  })

  let creados = 0
  let omitidos = 0
  const resultados = []

  for (const cobrador of cobradores) {
    // Verificar si ya existe cierre registrado para esta fecha
    const cierreExistente = await prisma.cierreDia.findUnique({
      where: { userId_fecha: { userId: cobrador.id, fecha: fechaCierre } }
    })

    if (cierreExistente) {
      omitidos++
      resultados.push({ cobrador: cobrador.id, estado: "OMITIDO", motivo: "Cierre ya existente" })
      continue
    }

    // Obtener saldo inicial acumulando días no cerrados
    const { saldoInicial: saldoInicialDia } = await obtenerSaldoInicialParaDia(cobrador.id, fechaInicio)

    // Calcular flujo y saldo del día
    const { totalCobrado, totalPrestado, totalGastos, saldoEfectivo } =
      await calcularSaldoParaDia(cobrador.id, fechaInicio, fechaFin, saldoInicialDia)

    // Omitir si no hubo actividad (saldo $0 y sin préstamos/cobros/gastos)
    if (totalCobrado === 0 && totalPrestado === 0 && totalGastos === 0 && saldoEfectivo === 0) {
      omitidos++
      resultados.push({ cobrador: cobrador.id, estado: "OMITIDO", motivo: "Sin actividad" })
      continue
    }

    // Crear cierre de caja automático
    const nuevoCierre = await prisma.cierreDia.create({
      data: {
        fecha: fechaCierre,
        userId: cobrador.id,
        totalCobrado,
        totalPrestado,
        totalGastos,
        saldoEfectivo,
        observaciones: `Cierre automático de medianoche (12:00 AM)`
      }
    })

    // Propagar saldos hacia cierres futuros
    await recalcularYPropagarSaldos(cobrador.id, fechaCierre)

    creados++
    resultados.push({ cobrador: cobrador.id, estado: "CERRADO", cierreId: nuevoCierre.id, saldoEfectivo })
  }

  return { creados, omitidos, fechaCierre, resultados }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "cierre_auto_secret_key"
    const { searchParams } = new URL(request.url)
    const secretParam = searchParams.get("secret")
    const fechaParam = searchParams.get("fecha")

    // Verificar secreto de autorización
    if (secretParam !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado para ejecutar el cron" }, { status: 401 })
    }

    const resultado = await ejecutarCierreAutomatico(fechaParam || undefined)

    return NextResponse.json({
      success: true,
      mensaje: `Cierre automático ejecutado exitosamente a las 12:00 AM. Cajas cerradas: ${resultado.creados}, Omitidas: ${resultado.omitidos}`,
      detalles: resultado
    })
  } catch (error) {
    console.error("Error en cron de cierre automático:", error)
    return NextResponse.json({ error: "Error al ejecutar cierre automático de medianoche" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

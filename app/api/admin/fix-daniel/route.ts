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
      where: { userId: daniel.id, fecha: { gte: new Date('2026-06-01T00:00:00Z') } },
      orderBy: { fecha: 'asc' }
    })

    const resultados = []
    let saldoAcumulado = 0

    for (const cierre of cierres) {
      const saldoNuevo = saldoAcumulado + Number(cierre.totalCobrado) - Number(cierre.totalPrestado) - Number(cierre.totalGastos)
      
      await prisma.cierreDia.update({
        where: { id: cierre.id },
        data: { saldoEfectivo: saldoNuevo }
      })
      
      resultados.push({
        fecha: cierre.fecha.toISOString().split('T')[0],
        saldoInicialUsado: saldoAcumulado,
        saldoNuevo
      })

      saldoAcumulado = saldoNuevo
    }

    return NextResponse.json({ mensaje: "Daniel reseteado a 0", resultados })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { recalcularYPropagarSaldos } from "@/lib/cierre-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get("nombre")
    const montoStr = searchParams.get("monto")

    if (!nombre || !montoStr) {
      const cobradores = await prisma.user.findMany({ where: { role: "COBRADOR" }, select: { id: true, firstName: true, name: true, email: true } })
      return NextResponse.json({ 
        error: "Faltan parámetros. Usa el formato: /api/set-caja?nombre=Daniel&monto=667",
        cobradoresDisponibles: cobradores 
      }, { status: 400 })
    }

    const monto = parseFloat(montoStr)
    if (isNaN(monto)) {
      return NextResponse.json({ error: "El monto no es un número válido" }, { status: 400 })
    }

    // Buscar al cobrador
    const cobrador = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: nombre, mode: 'insensitive' } },
          { name: { contains: nombre, mode: 'insensitive' } },
          { id: nombre }
        ],
        role: "COBRADOR"
      }
    })

    if (!cobrador) {
      return NextResponse.json({ error: `No se encontró ningún cobrador con el nombre ${nombre}` }, { status: 404 })
    }

    const { getEcuadorDayRange } = await import('@/lib/date-utils')
    const { inicio: fechaInicio } = getEcuadorDayRange()

    // Buscar el cierre anterior (el que se usa como Caja Anterior HOY)
    const ultimoCierre = await prisma.cierreDia.findFirst({
      where: {
        userId: cobrador.id,
        fecha: {
          lt: fechaInicio
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    if (ultimoCierre) {
      // Si ya tiene un cierre, lo actualizamos al monto deseado
      const cierreActualizado = await prisma.cierreDia.update({
        where: { id: ultimoCierre.id },
        data: {
          saldoEfectivo: monto,
          observaciones: `Actualización manual de saldo a ${monto}`
        }
      })
      
      // Propagar el saldo corregido hacia cualquier cierre posterior
      await recalcularYPropagarSaldos(cobrador.id, ultimoCierre.fecha)

      return NextResponse.json({ 
        success: true,
        mensaje: `¡Listo! Se actualizó el ÚLTIMO cierre de ${cobrador.firstName} (fecha: ${ultimoCierre.fecha.toISOString()}) y se propagó el nuevo saldo, para que su saldo sea $${monto}`, 
        cierre: cierreActualizado 
      })
    } else {
      // Si no tiene ningún cierre, creamos uno con fecha de ayer
      const { getEcuadorDayRange } = await import('@/lib/date-utils')
      const hoy = new Date()
      hoy.setDate(hoy.getDate() - 1)
      const fechaAyerString = hoy.toISOString().split('T')[0]
      const { inicio: ayer } = getEcuadorDayRange(fechaAyerString)

      const nuevoCierre = await prisma.cierreDia.create({
        data: {
          userId: cobrador.id,
          fecha: ayer,
          totalCobrado: 0,
          totalPrestado: 0,
          totalGastos: 0,
          saldoEfectivo: monto,
          observaciones: `Creación manual de saldo inicial (${monto})`
        }
      })

      // Propagar el saldo corregido hacia cualquier cierre posterior
      await recalcularYPropagarSaldos(cobrador.id, ayer)

      return NextResponse.json({ 
        success: true, 
        mensaje: `¡Listo! Se ha creado un cierre inicial de ayer para ${cobrador.firstName} con un saldo de $${monto}`,
        cierre: nuevoCierre 
      })
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error interno", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get("nombre")

    if (!nombre) {
      const cobradores = await prisma.user.findMany({ where: { role: "COBRADOR" }, select: { id: true, firstName: true, name: true, email: true } })
      return NextResponse.json({ 
        error: "Falta el parámetro nombre. Ejemplo: /api/fix-caja?nombre=Daniel",
        cobradoresDisponibles: cobradores 
      }, { status: 400 })
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
      const cobradores = await prisma.user.findMany({ where: { role: "COBRADOR" }, select: { id: true, firstName: true, name: true, email: true } })
      return NextResponse.json({ 
        error: `No se encontró ningún cobrador con el nombre ${nombre}`,
        cobradoresDisponibles: cobradores
      }, { status: 404 })
    }

    // Obtener la fecha de ayer usando la misma lógica de Ecuador que usa el sistema
    const hoy = new Date()
    hoy.setDate(hoy.getDate() - 1)
    const fechaAyerString = hoy.toISOString().split('T')[0]
    
    // Importación dinámica porque estamos en la misma ruta
    const { getEcuadorDayRange } = await import('@/lib/date-utils')
    const { inicio: ayer } = getEcuadorDayRange(fechaAyerString)
    
    const monto = 667.00

    // Verificar que no haya ya un cierre
    const existe = await prisma.cierreDia.findFirst({
      where: {
        userId: cobrador.id,
        fecha: {
          gte: ayer
        }
      }
    })

    if (existe) {
      // Si ya existe, vamos a actualizarlo en vez de fallar!
      const cierreActualizado = await prisma.cierreDia.update({
        where: { id: existe.id },
        data: {
          saldoEfectivo: monto,
          observaciones: "Actualización manual de saldo migrado (667.00)"
        }
      })
      return NextResponse.json({ 
        success: true,
        mensaje: "El cobrador ya tenía un cierre registrado para ayer, así que lo actualicé para que tenga los $667.00 exactos.", 
        cierre: cierreActualizado 
      })
    }

    // Crear el cierre
    const cierre = await prisma.cierreDia.create({
      data: {
        userId: cobrador.id,
        fecha: ayer,
        totalCobrado: 0,
        totalPrestado: 0,
        totalGastos: 0,
        saldoEfectivo: monto,
        observaciones: "Asignación manual de saldo migrado (667.00)"
      }
    })

    return NextResponse.json({ 
      success: true, 
      mensaje: `¡Listo! Se ha creado la caja de ayer para ${cobrador.firstName} con un saldo de $667.00`,
      cierre 
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

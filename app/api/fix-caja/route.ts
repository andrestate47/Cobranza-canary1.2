import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get("nombre")

    if (!nombre) {
      return NextResponse.json({ error: "Falta el parámetro nombre. Ejemplo: /api/fix-caja?nombre=Daniel" }, { status: 400 })
    }

    // Buscar al cobrador
    const cobrador = await prisma.user.findFirst({
      where: {
        firstName: {
          contains: nombre,
          mode: 'insensitive'
        },
        role: "COBRADOR"
      }
    })

    if (!cobrador) {
      return NextResponse.json({ error: `No se encontró ningún cobrador con el nombre ${nombre}` }, { status: 404 })
    }

    // Buscar si ya existe un cierre de ayer
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    ayer.setHours(0, 0, 0, 0)
    
    // Obtener cierre anterior del administrador para copiar el monto si se desea,
    // o simplemente crearlo con 667
    
    const monto = 667.00

    // Verificar que no haya ya un cierre
    const existe = await prisma.cierreDia.findFirst({
      where: {
        userId: cobrador.id,
        fecha: {
          gte: ayer,
          lt: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    })

    if (existe) {
      return NextResponse.json({ 
        mensaje: "El cobrador ya tiene un cierre registrado para ayer", 
        cierre: existe 
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

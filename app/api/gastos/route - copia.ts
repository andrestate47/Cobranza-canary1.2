
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")
    const limite = parseInt(searchParams.get("limite") || "50")

    const whereCondition: Prisma.GastoWhereInput = {}

    if (fecha) {
      const fechaInicio = new Date(fecha)
      fechaInicio.setHours(0, 0, 0, 0)
      const fechaFin = new Date(fecha)
      fechaFin.setHours(23, 59, 59, 999)

      whereCondition.fecha = {
        gte: fechaInicio,
        lte: fechaFin
      }
    }

    const gastos = await prisma.gasto.findMany({
      where: whereCondition,
      include: {
        usuario: {
          select: {
            firstName: true,
            lastName: true,
            name: true
          }
        }
      },
      orderBy: {
        fecha: "desc"
      },
      take: limite
    })

    const gastosFormateados = gastos.map((gasto: any) => ({
      id: gasto.id,
      concepto: gasto.concepto,
      monto: parseFloat(gasto.monto.toString()),
      fecha: gasto.fecha,
      observaciones: gasto.observaciones,
      fotoComprobante: gasto.fotoComprobante,
      usuario: {
        nombre: gasto.usuario.firstName && gasto.usuario.lastName
          ? `${gasto.usuario.firstName} ${gasto.usuario.lastName}`
          : gasto.usuario.name || "Usuario"
      }
    }))

    return NextResponse.json(gastosFormateados)
  } catch (error) {
    console.error("Error al obtener gastos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { concepto, monto, observaciones, fotoComprobante } = body

    if (!concepto || !monto) {
      return NextResponse.json(
        { error: "Concepto y monto son obligatorios" },
        { status: 400 }
      )
    }

    // Verificar si el día está cerrado (solo para cobradores)
    if (session.user.role === "COBRADOR") {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      const cierreHoy = await prisma.cierreDia.findUnique({
        where: { fecha: hoy }
      })

      if (cierreHoy) {
        return NextResponse.json(
          { error: "No se pueden registrar gastos después del cierre del día" },
          { status: 403 }
        )
      }
    }

    // Crear el gasto y registrar en caja chica usando transacción
    const montoNumerico = parseFloat(monto.toString())

    const resultado = await prisma.$transaction(async (tx: any) => {
      // Crear el gasto
      const gasto = await tx.gasto.create({
        data: {
          concepto: concepto.trim(),
          monto: montoNumerico,
          observaciones: observaciones?.trim(),
          fotoComprobante: fotoComprobante,
          userId: session.user.id
        },
        include: {
          usuario: {
            select: {
              firstName: true,
              lastName: true,
              name: true
            }
          }
        }
      })

      // Registrar movimiento en caja chica como egreso general
      // No afecta el saldo de ningún cobrador, solo se resta del saldo en caja
      await tx.movimientoCajaChica.create({
        data: {
          tipo: "EGRESO_GENERAL",
          monto: montoNumerico,
          saldoAnterior: 0,
          saldoNuevo: 0,
          observaciones: `Gasto: ${concepto.trim()}${observaciones ? ` - ${observaciones.trim()}` : ''}`,
          asignadoPor: {
            connect: { id: session.user.id }
          }
        }
      })

      return gasto
    })

    return NextResponse.json({
      message: "Gasto registrado exitosamente",
      gasto: {
        id: resultado.id,
        concepto: resultado.concepto,
        monto: parseFloat(resultado.monto.toString()),
        fecha: resultado.fecha,
        observaciones: resultado.observaciones,
        fotoComprobante: resultado.fotoComprobante,
        usuario: {
          nombre: resultado.usuario.firstName && resultado.usuario.lastName
            ? `${resultado.usuario.firstName} ${resultado.usuario.lastName}`
            : resultado.usuario.name || "Usuario"
        }
      }
    })
  } catch (error) {
    console.error("Error al crear gasto:", error)
    console.error("Error al crear gasto:", error)
    return NextResponse.json(
      { error: `Error interno: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}

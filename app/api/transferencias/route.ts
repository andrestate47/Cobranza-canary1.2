

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { prestamoId, monto, banco, referencia, observaciones, fotoComprobante } = body

    // 1. Validaciones básicas
    if (!prestamoId || !monto || !fotoComprobante) {
      return NextResponse.json(
        { error: "Los campos préstamo, monto y foto del comprobante son obligatorios" },
        { status: 400 }
      )
    }

    const montoNum = parseFloat(monto.toString())
    if (montoNum <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a cero" },
        { status: 400 }
      )
    }

    // 2. Ejecutar todo dentro de una transacción
    const resultado = await prisma.$transaction(async (tx: any) => {
      // a) Verificar préstamo y saldo
      const prestamo = await tx.prestamo.findUnique({
        where: { id: prestamoId },
        include: { pagos: { select: { monto: true } } }
      })

      if (!prestamo) {
        throw new Error("Préstamo no encontrado")
      }

      // Calcular saldo pendiente
      const totalPagado = prestamo.pagos.reduce((sum: number, p: any) => sum + Number(p.monto), 0)
      const montoTotalPrestamo = Number(prestamo.monto) * (1 + Number(prestamo.interes) / 100)
      const saldoPendiente = montoTotalPrestamo - totalPagado

      // Validar que el pago no exceda el saldo (con un pequeño margen de error por decimales)
      if (montoNum > saldoPendiente + 100) { // Margen de $100 pesos
        throw new Error(`El monto ($${montoNum}) excede el saldo pendiente ($${saldoPendiente})`)
      }

      // b) Crear la Transferencia
      const nuevaTransferencia = await tx.transferencia.create({
        data: {
          prestamoId,
          userId: session.user.id,
          monto: montoNum,
          banco: banco?.trim() || null,
          referencia: referencia?.trim() || null,
          fotoComprobante,
          observaciones: observaciones?.trim() || null,
        }
      })

      // c) Crear el Pago asociado
      // Nota: Usamos el mismo monto. En 'observaciones' referenciamos la transferencia.
      await tx.pago.create({
        data: {
          prestamoId,
          userId: session.user.id,
          monto: montoNum,
          metodoPago: "TRANSFERENCIA",
          observaciones: `Transferencia ID: ${nuevaTransferencia.id}. Ref: ${referencia || 'S/N'}. ${observaciones || ''}`.trim().substring(0, 191) // Asegurar que cabe en DB
        }
      })

      return nuevaTransferencia
    })

    // 3. Devolver respuesta con los datos enriquecidos (fuera de la transacción para no bloquear)
    const transferenciaFull = await prisma.transferencia.findUnique({
      where: { id: resultado.id },
      include: {
        usuario: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true
          }
        },
        prestamo: {
          select: {
            id: true,
            cliente: {
              select: {
                nombre: true,
                apellido: true
              }
            }
          }
        }
      }
    })

    if (!transferenciaFull) throw new Error("Error al recuperar la transferencia creada")

    return NextResponse.json({
      id: transferenciaFull.id,
      prestamoId: transferenciaFull.prestamoId,
      monto: parseFloat(transferenciaFull.monto.toString()),
      banco: transferenciaFull.banco,
      referencia: transferenciaFull.referencia,
      fotoComprobante: transferenciaFull.fotoComprobante,
      observaciones: transferenciaFull.observaciones,
      fecha: transferenciaFull.fecha,
      usuario: transferenciaFull.usuario,
      prestamo: transferenciaFull.prestamo
    })

  } catch (error) {
    console.error("Error al crear transferencia:", error)
    const message = error instanceof Error ? error.message : "Error interno del servidor"

    // Si es un error de validación nuestro (ej: saldo excedido), devolvemos 400
    if (message.includes("Préstamo no encontrado") || message.includes("excede el saldo")) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Error interno del servidor al procesar la transferencia" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const prestamoId = searchParams.get('prestamoId')

    if (!prestamoId) {
      return NextResponse.json(
        { error: "ID del préstamo es requerido" },
        { status: 400 }
      )
    }

    const transferencias = await prisma.transferencia.findMany({
      where: {
        prestamoId
      },
      include: {
        usuario: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(transferencias.map((transferencia: any) => ({
      id: transferencia.id,
      prestamoId: transferencia.prestamoId,
      monto: parseFloat(transferencia.monto.toString()),
      banco: transferencia.banco,
      referencia: transferencia.referencia,
      fotoComprobante: transferencia.fotoComprobante,
      observaciones: transferencia.observaciones,
      fecha: transferencia.fecha,
      usuario: transferencia.usuario
    })))

  } catch (error) {
    console.error("Error al obtener transferencias:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}


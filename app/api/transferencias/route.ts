

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
    const { prestamoId, monto, banco, referencia, observaciones, fotoComprobante, fecha, metodoPago } = body

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

    const fechaPago = fecha ? new Date(fecha) : new Date()

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
          fecha: fechaPago
        }
      })

      // c) Crear el Pago asociado
      // Nota: Usamos el mismo monto. En 'observaciones' referenciamos la transferencia.
      await tx.pago.create({
        data: {
          prestamoId,
          userId: session.user.id,
          monto: montoNum,
          fecha: fechaPago,
          metodoPago: metodoPago || "TRANSFERENCIA",
          observaciones: `Transferencia ID: ${nuevaTransferencia.id}. Ref: ${referencia || 'S/N'}. ${observaciones || ''}`.trim().substring(0, 191) // Asegurar que cabe en DB
        }
      })

      return nuevaTransferencia
    })

    // 3. Devolver respuesta con los datos enriquecidos
    // Necesitamos obtener el PAGO completo, no solo la transferencia, para poder generar la boleta.
    // Buscamos el pago recién creado. Como lo creamos en la transacción, podemos buscarlo por referencia cruzada o simplemente buscar el último pago de este préstamo/usuario creado hace instantes.
    // Sin embargo, lo más seguro es buscar el pago que tenga en observaciones la referencia a esta transferencia ID.

    // Primero recuperamos la transferencia para tener su ID si no lo guardamos (aunque resultado.id lo tiene)
    const transferenciaFull = await prisma.transferencia.findUnique({
      where: { id: resultado.id },
      include: {
        usuario: { select: { name: true, firstName: true, lastName: true } },
        prestamo: { include: { cliente: true } }
      }
    })

    if (!transferenciaFull) throw new Error("Error al recuperar la transferencia creada")

    // Buscamos el pago asociado. 
    // Nota: La forma más robusta hubiera sido retornar el ID del pago desde la transacción, 
    // pero prisma.$transaction retorna el resultado de la última operación o lo que retornemos nosotros.
    // Vamos a buscar el pago más reciente de este préstamo creado por este usuario.
    const pagoAsociado = await prisma.pago.findFirst({
      where: {
        prestamoId: prestamoId,
        userId: session.user.id,
        metodoPago: metodoPago || "TRANSFERENCIA",
        createdAt: { gte: new Date(Date.now() - 10000) } // Creado en los últimos 10s
      },
      orderBy: { createdAt: 'desc' },
      include: {
        prestamo: {
          include: {
            cliente: true,
            pagos: {
              where: { id: { not: resultado.id } }, // Excluir este pago (aunque necesitamos lógica precisa para saldo anterior)
              orderBy: { fecha: 'desc' }
            }
          }
        },
        usuario: {
          select: {
            firstName: true,
            lastName: true,
            name: true
          }
        }
      }
    })

    // Construir respuesta base
    const responseData: any = {
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
    }

    // Si encontramos el pago, agregamos la estructura para la boleta
    if (pagoAsociado) {
      const montoOriginalPrestamo = Number(pagoAsociado.prestamo.monto)
      const tasaInteresPrestamo = Number(pagoAsociado.prestamo.interes) / 100
      const montoTotalPrestamo = montoOriginalPrestamo * (1 + tasaInteresPrestamo)

      // Calcular pagos previos para el saldo pendiente exacto
      const todosLosPagos = await prisma.pago.aggregate({
        where: { prestamoId: prestamoId },
        _sum: { monto: true }
      })
      const totalPagadoHastaAhora = Number(todosLosPagos._sum.monto || 0)
      const saldoPendienteActual = Math.max(0, montoTotalPrestamo - totalPagadoHastaAhora)

      // Pago anterior para la boleta
      const ultimoPagoAnterior = pagoAsociado.prestamo.pagos.length > 1
        ? pagoAsociado.prestamo.pagos.find(p => p.id !== pagoAsociado.id)
        : null

      const numeroBoleta = `BOL-${String(pagoAsociado.id).padStart(6, '0')}`

      responseData.pago = {
        id: pagoAsociado.id,
        monto: Number(pagoAsociado.monto),
        fecha: pagoAsociado.fecha,
        observaciones: pagoAsociado.observaciones,
        metodoPago: pagoAsociado.metodoPago,
        numeroBoleta: numeroBoleta,
        prestamo: {
          id: pagoAsociado.prestamo.id,
          monto: montoOriginalPrestamo,
          interes: Number(pagoAsociado.prestamo.interes),
          valorCuota: Number(pagoAsociado.prestamo.valorCuota),
          montoTotal: montoTotalPrestamo,
          saldoPendiente: saldoPendienteActual, // Saldo DESPUÉS del pago
          fechaInicio: pagoAsociado.prestamo.fechaInicio,
          tipoPago: pagoAsociado.prestamo.tipoPago,
          cuotas: pagoAsociado.prestamo.cuotas,
          microseguroTipo: pagoAsociado.prestamo.microseguroTipo,
          microseguroValor: Number(pagoAsociado.prestamo.microseguroValor),
          microseguroTotal: Number(pagoAsociado.prestamo.microseguroTotal),
          ultimoPago: ultimoPagoAnterior ? {
            fecha: ultimoPagoAnterior.fecha,
            monto: Number(ultimoPagoAnterior.monto)
          } : undefined
        },
        cliente: {
          nombre: pagoAsociado.prestamo.cliente.nombre,
          apellido: pagoAsociado.prestamo.cliente.apellido,
          documento: pagoAsociado.prestamo.cliente.documento,
          telefono: pagoAsociado.prestamo.cliente.telefono,
          direccionCliente: pagoAsociado.prestamo.cliente.direccionCliente
        },
        usuario: {
          nombre: pagoAsociado.usuario.firstName && pagoAsociado.usuario.lastName
            ? `${pagoAsociado.usuario.firstName} ${pagoAsociado.usuario.lastName}`
            : pagoAsociado.usuario.name || "Usuario"
        },
        tipoCredito: pagoAsociado.prestamo.tipoCredito?.toLowerCase() || 'efectivo',
        tipoPagoMetodo: (metodoPago || 'transferencia').toLowerCase()
      }
    }

    return NextResponse.json(responseData)

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


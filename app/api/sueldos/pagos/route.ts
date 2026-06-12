
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(request.url)
    const cobradorId = url.searchParams.get('cobradorId')
    const estado = url.searchParams.get('estado')
    const tipo = url.searchParams.get('tipo')
    const periodo = url.searchParams.get('periodo')

    // Construir filtros
    const where: any = {}
    
    if (cobradorId) {
      where.cobradorId = cobradorId
    }
    
    if (estado) {
      where.estado = estado
    }
    
    if (tipo) {
      where.tipo = tipo
    }
    
    if (periodo) {
      where.periodo = periodo
    }

    const pagos = await prisma.pagoSueldo.findMany({
      where,
      include: {
        cobrador: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        pagador: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        configuracion: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(pagos)
  } catch (error) {
    console.error("Error al obtener pagos de sueldo:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo administradores y supervisores pueden crear pagos de sueldo
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!currentUser || (currentUser.role !== 'ADMINISTRADOR' && currentUser.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const data = await request.json()
    const { 
      cobradorId, 
      tipo, 
      periodo,
      montoBase,
      montoComisiones,
      montoTotal,
      montoAvances,
      montoFinal,
      observaciones,
      metodoPago
    } = data

    // DEBUG: log exacto de lo que llega
    console.log("[POST /api/sueldos/pagos] Body recibido:", JSON.stringify({
      cobradorId,
      tipo,
      periodo,
      montoBase,
      montoComisiones,
      montoTotal,
      montoAvances,
      montoFinal,
      observaciones,
      metodoPago
    }))

    // Parsear valores numéricos antes de validar
    const parsedMontoBase       = parseFloat(montoBase       || "0") || 0
    const parsedMontoComisiones = parseFloat(montoComisiones || "0") || 0
    const parsedMontoTotal      = parseFloat(montoTotal      || "0") || 0
    const parsedMontoAvances    = parseFloat(montoAvances    || "0") || 0
    const parsedMontoFinal      = parseFloat(montoFinal      || "0") || 0

    console.log("[POST /api/sueldos/pagos] Valores parseados:", {
      parsedMontoBase, parsedMontoComisiones, parsedMontoTotal,
      parsedMontoAvances, parsedMontoFinal
    })

    // Validaciones
    if (!cobradorId) {
      console.log("[POST /api/sueldos/pagos] FALLA: cobradorId vacío")
      return NextResponse.json({ error: "ID de cobrador requerido" }, { status: 400 })
    }

    if (!tipo) {
      console.log("[POST /api/sueldos/pagos] FALLA: tipo vacío")
      return NextResponse.json({ error: "Tipo de pago requerido" }, { status: 400 })
    }

    if (!parsedMontoFinal || parsedMontoFinal <= 0) {
      console.log("[POST /api/sueldos/pagos] FALLA: montoFinal inválido =>", montoFinal, "=> parsed:", parsedMontoFinal)
      return NextResponse.json({ error: "Monto final debe ser mayor a 0" }, { status: 400 })
    }

    // Verificar que el cobrador existe
    const cobrador = await prisma.user.findUnique({ where: { id: cobradorId } })
    if (!cobrador) {
      return NextResponse.json({ error: "Cobrador no encontrado" }, { status: 404 })
    }

    // Obtener configuración del cobrador si existe
    const configuracion = await prisma.configuracionSueldo.findUnique({
      where: { userId: cobradorId }
    })

    // Obtener saldo actual del cobrador para la Caja Chica
    const ultimoMovimiento = await prisma.movimientoCajaChica.findFirst({
      where: { cobradorId },
      orderBy: { fecha: "desc" },
    })
    const saldoAnterior = ultimoMovimiento?.saldoNuevo || new Decimal(0)
    const saldoNuevo = saldoAnterior.minus(parsedMontoFinal)

    // Crear el PagoSueldo y el MovimientoCajaChica en una transacción
    const pago = await prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pagoSueldo.create({
        data: {
          cobradorId,
          pagadorId: currentUser.id,
          configuracionId: configuracion?.id,
          tipo,
          periodo,
          montoBase:       parsedMontoBase,
          montoComisiones: parsedMontoComisiones,
          montoTotal:      parsedMontoTotal,
          montoAvances:    parsedMontoAvances,
          montoFinal:      parsedMontoFinal,
          observaciones,
          metodoPago,
          estado: 'PAGADO',
          fechaPago: new Date()
        },
        include: {
          cobrador: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          },
          pagador: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          },
          configuracion: true
        }
      });

      await tx.movimientoCajaChica.create({
        data: {
          cobradorId,
          asignadoPorId: currentUser.id,
          tipo: "PAGO_SUELDO",
          monto: new Decimal(parsedMontoFinal),
          saldoAnterior,
          saldoNuevo,
          descripcion: `Sueldo/Avance (${tipo}) - Período: ${periodo || 'N/A'}`,
          observaciones,
          estado: "APROBADO"
        }
      });

      return nuevoPago;
    });

    return NextResponse.json(pago, { status: 201 })
  } catch (error) {
    console.error("Error al crear pago de sueldo:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

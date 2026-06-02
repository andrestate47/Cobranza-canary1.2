
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"

// GET /api/caja-chica - Obtener saldo y movimientos del cobrador actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id

    // Obtener todos los movimientos del cobrador
    const movimientos = await prisma.movimientoCajaChica.findMany({
      where: {
        cobradorId: userId,
      },
      include: {
        cobrador: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
          },
        },
        asignadoPor: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
      orderBy: {
        fecha: "desc",
      },
    })

    // Calcular balances
    let totalEntregado = new Decimal(0)
    let totalGastado = new Decimal(0)
    let totalDevuelto = new Decimal(0)

    movimientos.forEach((mov) => {
      if (mov.tipo === "ENTREGADO" || mov.tipo === "ENTREGA" || mov.tipo === "INGRESO" || mov.tipo === "APERTURA_CAJA") {
        totalEntregado = totalEntregado.plus(mov.monto)
      } else if (mov.tipo === "GASTADO" || mov.tipo === "GASTO" || mov.tipo === "EGRESO" || mov.tipo === "EGRESO_GENERAL") {
        totalGastado = totalGastado.plus(mov.monto)
      } else if (mov.tipo === "DEVUELTO" || mov.tipo === "DEVOLUCION") {
        totalDevuelto = totalDevuelto.plus(mov.monto)
      }
    })

    const balance = totalEntregado.minus(totalGastado).minus(totalDevuelto)

    return NextResponse.json({
      balance: {
        balance: balance.toNumber(),
        totalEntregado: totalEntregado.toNumber(),
        totalGastado: totalGastado.toNumber(),
        totalDevuelto: totalDevuelto.toNumber(),
      },
      movimientos: movimientos.map((mov) => ({
        id: mov.id,
        tipo: mov.tipo,
        monto: mov.monto.toNumber(),
        descripcion: mov.descripcion,
        fecha: mov.fecha.toISOString(),
        estado: mov.estado,
        cobradorId: mov.cobradorId,
        cobrador: mov.cobrador ? {
          nombre: mov.cobrador.firstName || mov.cobrador.name || "",
          apellido: mov.cobrador.lastName || "",
        } : null,
        asignadoPorId: mov.asignadoPorId,
        asignadoPor: mov.asignadoPor ? {
          nombre: mov.asignadoPor.firstName || mov.asignadoPor.name || "",
          apellido: mov.asignadoPor.lastName || "",
        } : undefined,
      })),
    })
  } catch (error) {
    console.error("Error al obtener caja chica:", error)
    return NextResponse.json(
      { error: "Error al obtener datos de caja chica" },
      { status: 500 }
    )
  }
}

// POST /api/caja-chica - Crear nuevo movimiento (solo admin/supervisor)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Validar permisos
    if (!["ADMINISTRADOR", "SUPERVISOR", "COBRADOR"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      )
    }

    const body = await request.json()
    let { cobradorId, tipo, monto, descripcion, observaciones, comprobante } = body

    const isCobrador = session.user.role === "COBRADOR"
    if (isCobrador) {
      if (tipo !== "GASTO" && tipo !== "GASTADO" && tipo !== "INGRESO" && tipo !== "EGRESO") {
        return NextResponse.json(
          { error: "Los cobradores solo pueden registrar gastos, ingresos y egresos" },
          { status: 403 }
        )
      }
      // Forzar que el cobrador solo pueda afectar su propia caja
      cobradorId = session.user.id
    }

    // Validaciones - APERTURA_CAJA y EGRESO_GENERAL no requieren cobradorId
    if (tipo === "APERTURA_CAJA" || tipo === "EGRESO_GENERAL") {
      if (!tipo || !monto) {
        return NextResponse.json(
          { error: "Faltan datos requeridos" },
          { status: 400 }
        )
      }
      if (isCobrador) {
        return NextResponse.json(
          { error: "No tienes permisos para registrar egresos generales ni apertura de caja" },
          { status: 403 }
        )
      }
    } else {
      if (!cobradorId || !tipo || !monto) {
        return NextResponse.json(
          { error: "Faltan datos requeridos" },
          { status: 400 }
        )
      }
    }

    const montoDecimal = new Decimal(String(monto))

    // Para APERTURA_CAJA, saldo siempre es 0 → monto (no tiene cobrador)
    if (tipo === "APERTURA_CAJA") {
      const movimiento = await prisma.movimientoCajaChica.create({
        data: {
          cobradorId: null,
          asignadoPorId: session.user.id,
          tipo,
          monto: montoDecimal,
          saldoAnterior: new Decimal(0),
          saldoNuevo: montoDecimal,
          descripcion,
          observaciones,
          comprobante,
          estado: "APROBADO",
        },
        include: {
          asignadoPor: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json({
        success: true,
        movimiento: {
          id: movimiento.id,
          tipo: movimiento.tipo,
          monto: movimiento.monto.toNumber(),
          saldoAnterior: movimiento.saldoAnterior.toNumber(),
          saldoNuevo: movimiento.saldoNuevo.toNumber(),
          fecha: movimiento.fecha.toISOString(),
          descripcion: movimiento.descripcion,
          observaciones: movimiento.observaciones,
          estado: movimiento.estado,
          cobrador: "Monto Inicial de Caja",
          asignadoPor: `${movimiento.asignadoPor?.firstName || movimiento.asignadoPor?.name || ""} ${movimiento.asignadoPor?.lastName || ""}`.trim(),
        },
      })
    }

    // Para EGRESO_GENERAL, no está asociado a ningún cobrador
    if (tipo === "EGRESO_GENERAL") {
      const movimiento = await prisma.movimientoCajaChica.create({
        data: {
          cobradorId: null,
          asignadoPorId: session.user.id,
          tipo,
          monto: montoDecimal,
          saldoAnterior: new Decimal(0),
          saldoNuevo: montoDecimal.negated(),
          descripcion,
          observaciones,
          comprobante,
          estado: "APROBADO",
        },
        include: {
          asignadoPor: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json({
        success: true,
        movimiento: {
          id: movimiento.id,
          tipo: movimiento.tipo,
          monto: movimiento.monto.toNumber(),
          saldoAnterior: movimiento.saldoAnterior.toNumber(),
          saldoNuevo: movimiento.saldoNuevo.toNumber(),
          fecha: movimiento.fecha.toISOString(),
          descripcion: movimiento.descripcion,
          observaciones: movimiento.observaciones,
          estado: movimiento.estado,
          cobrador: "Egreso General",
          asignadoPor: `${movimiento.asignadoPor?.firstName || movimiento.asignadoPor?.name || ""} ${movimiento.asignadoPor?.lastName || ""}`.trim(),
        },
      })
    }

    // Obtener saldo actual del cobrador
    const ultimoMovimiento = await prisma.movimientoCajaChica.findFirst({
      where: { cobradorId },
      orderBy: { fecha: "desc" },
    })

    const saldoAnterior = ultimoMovimiento?.saldoNuevo || new Decimal(0)
    
    // Calcular nuevo saldo según el tipo
    let saldoNuevo = saldoAnterior
    if (tipo === "ENTREGA" || tipo === "ENTREGADO") {
      saldoNuevo = saldoAnterior.plus(montoDecimal)
    } else if (tipo === "DEVOLUCION" || tipo === "DEVUELTO" || tipo === "GASTO" || tipo === "GASTADO") {
      saldoNuevo = saldoAnterior.minus(montoDecimal)
    } else if (tipo === "AJUSTE") {
      // Para ajustes, el monto puede ser positivo o negativo
      saldoNuevo = saldoAnterior.plus(montoDecimal)
    }

    // Crear el movimiento - Las entregas se aprueban automáticamente
    const movimiento = await prisma.movimientoCajaChica.create({
      data: {
        cobradorId,
        asignadoPorId: session.user.id,
        tipo,
        monto: montoDecimal,
        saldoAnterior,
        saldoNuevo,
        descripcion,
        observaciones,
        comprobante,
        estado: tipo === "ENTREGADO" || tipo === "ENTREGA" ? "APROBADO" : "APROBADO",
      },
      include: {
        cobrador: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
          },
        },
        asignadoPor: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      movimiento: {
        id: movimiento.id,
        tipo: movimiento.tipo,
        monto: movimiento.monto.toNumber(),
        saldoAnterior: movimiento.saldoAnterior.toNumber(),
        saldoNuevo: movimiento.saldoNuevo.toNumber(),
        fecha: movimiento.fecha.toISOString(),
        descripcion: movimiento.descripcion,
        observaciones: movimiento.observaciones,
        estado: movimiento.estado,
        cobrador: movimiento.cobrador ? 
          `${movimiento.cobrador.firstName || movimiento.cobrador.name || ""} ${movimiento.cobrador.lastName || ""}`.trim() :
          "Sin cobrador",
        asignadoPor: `${movimiento.asignadoPor?.firstName || movimiento.asignadoPor?.name || ""} ${movimiento.asignadoPor?.lastName || ""}`.trim(),
      },
    })
  } catch (error) {
    console.error("Error al crear movimiento de caja chica:", error)
    return NextResponse.json(
      { error: "Error al crear movimiento de caja chica" },
      { status: 500 }
    )
  }
}

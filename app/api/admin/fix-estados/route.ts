import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { calcularSaldo } from "@/lib/prestamo-calc"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Validar que solo el administrador pueda ejecutar esto
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // 1. Traer todos los préstamos que actualmente figuran como ACTIVO
    const prestamosActivos = await prisma.prestamo.findMany({
      where: { estado: 'ACTIVO' },
      include: {
        pagos: {
          select: {
            monto: true,
            devolucionSeguro: true
          }
        }
      }
    })

    // 2. Traer el listado de préstamos que han sido origen de una renovación
    const prestamosRenovados = await prisma.prestamo.findMany({
      where: { renovadoDeId: { not: null } },
      select: { renovadoDeId: true }
    })
    const idsRenovados = new Set(prestamosRenovados.map(r => r.renovadoDeId as string))

    const aCancelar: string[] = []
    const aRenovar: string[] = []

    // 3. Evaluar cada préstamo activo
    for (const p of prestamosActivos) {
      // Si el ID está en el set de renovados, debe ser RENOVADO
      if (idsRenovados.has(p.id)) {
        aRenovar.push(p.id)
        continue
      }
      
      // Si no es renovado, verificamos su saldo
      const saldoInfo = calcularSaldo({
        monto: Number(p.monto),
        interes: Number(p.interes),
        pagos: p.pagos.map(pago => ({
          monto: Number(pago.monto),
          devolucionSeguro: Number(pago.devolucionSeguro || 0)
        }))
      })
      
      // Si el saldo es menor o igual a 0.01 centavos, ya se pagó en su totalidad
      if (saldoInfo.saldo <= 0.01) {
        aCancelar.push(p.id)
      }
    }

    // 4. Actualizar en Base de Datos (en transacciones separadas)
    let actualizadosRenovados = 0
    if (aRenovar.length > 0) {
      const res = await prisma.prestamo.updateMany({
        where: { id: { in: aRenovar } },
        data: { estado: 'RENOVADO' }
      })
      actualizadosRenovados = res.count
    }

    let actualizadosCancelados = 0
    if (aCancelar.length > 0) {
      const res = await prisma.prestamo.updateMany({
        where: { id: { in: aCancelar } },
        data: { estado: 'CANCELADO' }
      })
      actualizadosCancelados = res.count
    }

    return NextResponse.json({
      message: "Limpieza de estados completada exitosamente.",
      estadisticas: {
        prestamosActivosAnalizados: prestamosActivos.length,
        actualizadosACancelados: actualizadosCancelados,
        actualizadosARenovados: actualizadosRenovados,
      },
      detalles: {
        idsCancelados: aCancelar,
        idsRenovados: aRenovar
      }
    })
    
  } catch (error) {
    console.error("Error arreglando estados de prestamos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

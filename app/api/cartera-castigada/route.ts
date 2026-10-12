import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { cargarIdsRenovados } from "@/lib/prestamo-calc"
import { calcularDiasSinAbono, esPrestamoCastigado, DIAS_UMBRAL_CASTIGO } from "@/lib/cartera-castigada"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rutaIdParam = searchParams.get("rutaId")
    const busquedaParam = searchParams.get("q")?.toLowerCase() || ""

    // Obtener datos del usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || "" },
      select: { id: true, role: true, rutaId: true }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Filtro por ruta
    let targetRutaId: string | null = null
    if (user.role === "ADMINISTRADOR" || user.role === "SUPERVISOR") {
      targetRutaId = rutaIdParam || null
    } else {
      // Cobrador solo ve su ruta asignada
      targetRutaId = user.rutaId || "sin-ruta"
    }

    const whereClause: any = {
      estado: { in: ["ACTIVO", "VENCIDO"] }
    }

    if (targetRutaId) {
      whereClause.cliente = { rutaId: targetRutaId }
    }

    // Traer préstamos con datos de cliente, ruta y cobrador
    const prestamosRaw = await prisma.prestamo.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            documento: true,
            nombre: true,
            apellido: true,
            telefono: true,
            foto: true,
            direccionCliente: true,
            direccionCobro: true,
            mapLink: true,
            rutaId: true,
            ruta: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        usuario: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true
          }
        }
      },
      orderBy: { fechaInicio: "asc" }
    })

    const prestamoIds = prestamosRaw.map((p) => p.id)

    // Agregación de pagos: suma y última fecha
    let agregacionPagos: any[] = []
    if (prestamoIds.length > 0) {
      agregacionPagos = await prisma.pago.groupBy({
        by: ["prestamoId"],
        _sum: { monto: true, devolucionSeguro: true },
        _max: { fecha: true },
        where: { prestamoId: { in: prestamoIds } }
      } as any)
    }

    const pagosMap = new Map<string, { totalPagado: number; fechaUltimoPago: Date | null }>()
    agregacionPagos.forEach((agg) => {
      pagosMap.set(agg.prestamoId, {
        totalPagado: Number(agg._sum.monto || 0) + Number(agg._sum.devolucionSeguro || 0),
        fechaUltimoPago: agg._max.fecha
      })
    })

    const idsRenovados = await cargarIdsRenovados(prisma)
    const hoy = new Date()

    // Procesar préstamos y filtrar solo los que entran a Cartera Castigada
    const castigados: any[] = []

    prestamosRaw.forEach((p) => {
      const agg = pagosMap.get(p.id) || { totalPagado: 0, fechaUltimoPago: null }
      const montoOriginal = parseFloat(p.monto.toString())
      const interesPorc = parseFloat(p.interes.toString())
      const montoTotal = montoOriginal + (montoOriginal * interesPorc) / 100
      const totalPagado = agg.totalPagado
      const saldoPendiente = Math.max(0, Math.round((montoTotal - totalPagado) * 100) / 100)

      // Solo préstamos que todavía deben dinero
      if (saldoPendiente <= 0.01) return

      const prestamoInput = {
        id: p.id,
        monto: montoOriginal,
        interes: interesPorc,
        saldoPendiente,
        estado: p.estado,
        fechaInicio: p.fechaInicio,
        fechaFin: p.fechaFin,
        datosRefinanciamiento: p.datosRefinanciamiento
      }

      const clasificaCastigado = esPrestamoCastigado(
        prestamoInput,
        agg.fechaUltimoPago,
        idsRenovados,
        hoy
      )

      if (clasificaCastigado) {
        const { diasSinAbono, fechaReferencia, tieneAbonosPrevios } = calcularDiasSinAbono(
          prestamoInput,
          agg.fechaUltimoPago,
          hoy
        )

        const meta = (p.datosRefinanciamiento as any) || {}

        // Filtro de búsqueda textual si aplica
        if (busquedaParam) {
          const textoCompleto = `
            ${p.cliente.nombre} 
            ${p.cliente.apellido} 
            ${p.cliente.documento} 
            ${p.cliente.codigoCliente} 
            ${p.cliente.telefono || ""}
          `.toLowerCase()

          if (!textoCompleto.includes(busquedaParam)) {
            return
          }
        }

        castigados.push({
          id: p.id,
          monto: montoOriginal,
          interes: interesPorc,
          montoTotal,
          totalPagado,
          saldoPendiente,
          cuotas: p.cuotas,
          cuotasPagadas: p.cuotasPagadasManual !== null ? parseFloat(p.cuotasPagadasManual.toString()) : (parseFloat(p.valorCuota.toString()) > 0 ? totalPagado / parseFloat(p.valorCuota.toString()) : 0),
          valorCuota: parseFloat(p.valorCuota.toString()),
          tipoPago: p.tipoPago,
          fechaInicio: p.fechaInicio,
          fechaFin: p.fechaFin,
          estado: p.estado,
          diasSinAbono,
          fechaReferencia,
          tieneAbonosPrevios,
          fechaUltimoPago: agg.fechaUltimoPago,
          esCastigoManual: meta.castigadoManual === true,
          motivoCastigo: meta.motivoCastigo || null,
          fechaCastigoManual: meta.fechaCastigoManual || null,
          cliente: p.cliente,
          cobrador: p.usuario
        })
      }
    })

    // Ordenar por días sin abono desc (los más críticos primero)
    castigados.sort((a, b) => b.diasSinAbono - a.diasSinAbono)

    // Agrupar métricas de resumen
    const clientesUnicosIds = new Set(castigados.map((item) => item.cliente.id))
    const totalSaldoCastigado = castigados.reduce((sum, item) => sum + item.saldoPendiente, 0)
    const totalMontoOriginal = castigados.reduce((sum, item) => sum + item.monto, 0)
    const totalRecuperado = castigados.reduce((sum, item) => sum + item.totalPagado, 0)
    const promedioDiasSinAbono =
      castigados.length > 0
        ? Math.round(castigados.reduce((sum, item) => sum + item.diasSinAbono, 0) / castigados.length)
        : 0

    // Traer rutas para el filtro de selector
    const rutas = await prisma.ruta.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" }
    })

    return NextResponse.json({
      resumen: {
        totalSaldoCastigado: Math.round(totalSaldoCastigado * 100) / 100,
        totalClientesCastigados: clientesUnicosIds.size,
        totalPrestamosCastigados: castigados.length,
        totalMontoOriginal: Math.round(totalMontoOriginal * 100) / 100,
        totalRecuperado: Math.round(totalRecuperado * 100) / 100,
        promedioDiasSinAbono,
        umbralDias: DIAS_UMBRAL_CASTIGO
      },
      items: castigados,
      rutas
    })
  } catch (error) {
    console.error("Error al obtener cartera castigada:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/**
 * Permite al administrador marcar o desmarcar manualmente un préstamo como cartera castigada
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMINISTRADOR" && session.user.role !== "SUPERVISOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const { prestamoId, castigadoManual, excluidoCastigo, motivo } = body

    if (!prestamoId) {
      return NextResponse.json({ error: "prestamoId es requerido" }, { status: 400 })
    }

    const prestamo = await prisma.prestamo.findUnique({
      where: { id: prestamoId },
      select: { id: true, datosRefinanciamiento: true }
    })

    if (!prestamo) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 })
    }

    const metaActual = (prestamo.datosRefinanciamiento as any) || {}
    const metaNueva = {
      ...metaActual,
      castigadoManual: Boolean(castigadoManual),
      excluidoCastigo: Boolean(excluidoCastigo),
      motivoCastigo: motivo?.trim() || metaActual.motivoCastigo || null,
      fechaCastigoManual: castigadoManual ? new Date().toISOString() : null,
      actualizadoPor: session.user.name || session.user.email
    }

    await prisma.prestamo.update({
      where: { id: prestamoId },
      data: {
        datosRefinanciamiento: metaNueva
      }
    })

    return NextResponse.json({
      success: true,
      mensaje: castigadoManual
        ? "Préstamo asignado manualmente a Cartera Castigada"
        : excluidoCastigo
        ? "Préstamo excluido de Cartera Castigada"
        : "Estado de Cartera Castigada restablecido"
    })
  } catch (error) {
    console.error("Error al actualizar estado de castigo:", error)
    return NextResponse.json({ error: "Error al actualizar estado" }, { status: 500 })
  }
}

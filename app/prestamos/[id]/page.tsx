
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import DetallePrestamoClient from "@/components/detalle-prestamo-client"

interface PrestamoDetailPageProps {
  params: {
    id: string
  }
}

export default async function PrestamoDetailPage({ params }: PrestamoDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  try {
    const prestamo = await prisma.prestamo.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        usuario: {
          select: {
            firstName: true,
            lastName: true,
            name: true
          }
        },
        pagos: {
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
          }
        }
      }
    })

    if (!prestamo) {
      notFound()
    }

    let prestamoAnteriorRaw = null;
    if (prestamo.renovadoDeId) {
      prestamoAnteriorRaw = await prisma.prestamo.findUnique({
        where: { id: prestamo.renovadoDeId },
        include: {
          pagos: {
            orderBy: { fecha: "desc" }
          }
        }
      });
    }

    const formatAnterior = (ant: any) => {
      if (!ant) return null;
      return {
        ...ant,
        monto: parseFloat(ant.monto.toString()),
        interes: parseFloat(ant.interes.toString()),
        valorCuota: parseFloat(ant.valorCuota.toString()),
        fechaInicio: ant.fechaInicio.toISOString(),
        fechaFin: ant.fechaFin.toISOString(),
        pagos: ant.pagos.map((p: any) => ({
          ...p,
          monto: parseFloat(p.monto.toString()),
          fecha: p.fecha.toISOString()
        }))
      }
    }

    // Obtener todos los préstamos históricos del cliente para calcular con exactitud su score crediticio
    const prestamosClienteRaw = await prisma.prestamo.findMany({
      where: { clienteId: prestamo.clienteId },
      include: {
        pagos: {
          select: {
            id: true,
            monto: true,
            devolucionSeguro: true,
            fecha: true
          },
          orderBy: { fecha: "desc" }
        }
      },
      orderBy: { fechaInicio: "desc" }
    })

    const prestamosClienteFormatted = prestamosClienteRaw.map((p) => {
      const pMonto = parseFloat(p.monto.toString())
      const pInteres = parseFloat(p.interes.toString())
      const pValorCuota = parseFloat(p.valorCuota.toString())
      const pPagosSum = p.pagos.reduce(
        (sum, pg) => sum + parseFloat(pg.monto.toString()) + (pg.devolucionSeguro ? parseFloat(pg.devolucionSeguro.toString()) : 0),
        0
      )
      const pMontoTotal = pMonto * (1 + pInteres / 100)
      const pSaldoPendiente = Math.max(0, Math.round((pMontoTotal - pPagosSum) * 100) / 100)
      const pCuotasPagadas = pValorCuota > 0 ? pPagosSum / pValorCuota : 0

      return {
        id: p.id,
        monto: pMonto,
        interes: pInteres,
        valorCuota: pValorCuota,
        cuotas: p.cuotas,
        cuotasPagadas: p.cuotasPagadasManual !== null ? parseFloat(p.cuotasPagadasManual.toString()) : pCuotasPagadas,
        saldoPendiente: pSaldoPendiente,
        fechaInicio: p.fechaInicio.toISOString(),
        fechaFin: p.fechaFin.toISOString(),
        estado: p.estado,
        tipoPago: p.tipoPago,
        cuotasAtrasadasManual: p.cuotasAtrasadasManual ? parseFloat(p.cuotasAtrasadasManual.toString()) : null,
        diasVencidosManual: p.diasVencidosManual,
        diasGracia: p.diasGracia,
        renovadoDeId: p.renovadoDeId,
        pagos: p.pagos.map((pg) => ({
          monto: parseFloat(pg.monto.toString()),
          devolucionSeguro: pg.devolucionSeguro ? parseFloat(pg.devolucionSeguro.toString()) : 0,
          fecha: pg.fecha.toISOString()
        }))
      }
    })

    // Convertir Decimal a números para evitar errores de serialización
    const prestamoFormatted = {
      ...prestamo,
      cliente: {
        ...prestamo.cliente,
        createdAt: prestamo.cliente.createdAt.toISOString()
      },
      monto: parseFloat(prestamo.monto.toString()),
      interes: parseFloat(prestamo.interes.toString()),
      valorCuota: parseFloat(prestamo.valorCuota.toString()),
      interesTotal: prestamo.interesTotal ? parseFloat(prestamo.interesTotal.toString()) : null,
      microseguroTotal: prestamo.microseguroTotal ? parseFloat(prestamo.microseguroTotal.toString()) : 0,
      microseguroValor: prestamo.microseguroValor ? parseFloat(prestamo.microseguroValor.toString()) : 0,
      seguroDevuelto: prestamo.pagos.reduce((acc, p) => acc + (p.devolucionSeguro ? parseFloat(p.devolucionSeguro.toString()) : 0), 0),
      moraCredito: prestamo.moraCredito ? parseFloat(prestamo.moraCredito.toString()) : 0,
      fechaInicio: prestamo.fechaInicio.toISOString(),
      fechaFin: prestamo.fechaFin.toISOString(),
      fechaFinManual: prestamo.fechaFinManual ? prestamo.fechaFinManual.toISOString() : null,
      fechaProximoPagoManual: prestamo.fechaProximoPagoManual ? prestamo.fechaProximoPagoManual.toISOString() : null,
      createdAt: prestamo.createdAt.toISOString(),
      updatedAt: prestamo.updatedAt.toISOString(),
      cuotasPagadasManual: prestamo.cuotasPagadasManual ? parseFloat(prestamo.cuotasPagadasManual.toString()) : null,
      cuotasAtrasadasManual: prestamo.cuotasAtrasadasManual ? parseFloat(prestamo.cuotasAtrasadasManual.toString()) : null,
      cuotasPendientesManual: prestamo.cuotasPendientesManual ? parseFloat(prestamo.cuotasPendientesManual.toString()) : null,
      diasVencidosManual: prestamo.diasVencidosManual,
      valorEnAtrasoManual: prestamo.valorEnAtrasoManual ? parseFloat(prestamo.valorEnAtrasoManual.toString()) : null,
      pagos: prestamo.pagos.map((pago) => ({
        id: pago.id,
        prestamoId: pago.prestamoId,
        monto: parseFloat(pago.monto.toString()),
        devolucionSeguro: pago.devolucionSeguro ? parseFloat(pago.devolucionSeguro.toString()) : 0,
        fecha: pago.fecha.toISOString(),
        observaciones: pago.observaciones,
        metodoPago: pago.metodoPago,
        fotoComprobante: pago.fotoComprobante,
        usuario: pago.usuario,
        createdAt: pago.createdAt.toISOString(),
        updatedAt: pago.updatedAt.toISOString(),
      })),
      prestamoAnteriorInfo: formatAnterior(prestamoAnteriorRaw),
      prestamosCliente: prestamosClienteFormatted
    }

    return <DetallePrestamoClient prestamo={prestamoFormatted as unknown as Parameters<typeof DetallePrestamoClient>[0]['prestamo']} session={session} />
  } catch (error) {
    console.error("Error loading prestamo:", error)
    notFound()
  }
}

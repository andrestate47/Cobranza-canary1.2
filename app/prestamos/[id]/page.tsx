
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

    // Convertir Decimal a números para evitar errores de serialización
    const prestamoFormatted = {
      ...prestamo,
      monto: parseFloat(prestamo.monto.toString()),
      interes: parseFloat(prestamo.interes.toString()),
      valorCuota: parseFloat(prestamo.valorCuota.toString()),
      interesTotal: prestamo.interesTotal ? parseFloat(prestamo.interesTotal.toString()) : null,
      microseguroTotal: parseFloat(prestamo.microseguroTotal.toString()),
      microseguroValor: parseFloat(prestamo.microseguroValor.toString()),
      moraCredito: parseFloat(prestamo.moraCredito.toString()),
      fechaInicio: prestamo.fechaInicio.toISOString(),
      fechaFin: prestamo.fechaFin.toISOString(),
      createdAt: prestamo.createdAt.toISOString(),
      updatedAt: prestamo.updatedAt.toISOString(),
      pagos: prestamo.pagos.map((pago) => ({
        id: pago.id,
        prestamoId: pago.prestamoId,
        monto: parseFloat(pago.monto.toString()),
        fecha: pago.fecha.toISOString(),
        observaciones: pago.observaciones,
        metodoPago: pago.metodoPago,
        fotoComprobante: pago.fotoComprobante,
        usuario: pago.usuario,
        createdAt: pago.createdAt.toISOString(),
        updatedAt: pago.updatedAt.toISOString(),
      }))
    }

    return <DetallePrestamoClient prestamo={prestamoFormatted as unknown as Parameters<typeof DetallePrestamoClient>[0]['prestamo']} session={session} />
  } catch (error) {
    console.error("Error loading prestamo:", error)
    notFound()
  }
}

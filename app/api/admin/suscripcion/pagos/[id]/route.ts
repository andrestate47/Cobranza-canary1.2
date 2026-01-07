
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';

// PUT - Verificar o rechazar pago
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user || user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 });
    }

    const body = await req.json();
    const { estado, observaciones } = body;

    if (!['CONFIRMADO', 'RECHAZADO'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Obtener el pago
    const pago = await prisma.pagoSuscripcion.findUnique({
      where: { id: params.id },
      include: { suscripcion: true }
    });

    if (!pago) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el pago
    const pagoActualizado = await prisma.pagoSuscripcion.update({
      where: { id: params.id },
      data: {
        estado,
        observaciones,
        verificadoPor: user.id,
        fechaVerificacion: new Date()
      }
    });

    // Si el pago fue confirmado, actualizar la suscripción
    if (estado === 'CONFIRMADO') {
      await prisma.suscripcion.update({
        where: { id: pago.suscripcionId },
        data: {
          estado: 'ACTIVA',
          fechaActivacion: new Date(),
          fechaVencimiento: pago.periodoFin
        }
      });
    }

    return NextResponse.json(pagoActualizado);
  } catch (error: unknown) {
    console.error('Error al verificar pago:', error);
    const msg = error instanceof Error ? error.message : 'Error al verificar pago';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE - Eliminar pago
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user || user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 });
    }

    await prisma.pagoSuscripcion.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error al eliminar pago:', error);
    const msg = error instanceof Error ? error.message : 'Error al eliminar pago';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

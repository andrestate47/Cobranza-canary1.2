
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { calculateExpirationDate, calculatePlanAmount } from '@/lib/subscription';

// GET - Obtener historial de pagos
export async function GET(req: NextRequest) {
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

    const pagos = await prisma.pagoSuscripcion.findMany({
      include: {
        suscripcion: true
      },
      orderBy: {
        fechaPago: 'desc'
      }
    });

    return NextResponse.json(pagos);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json(
      { error: 'Error al obtener pagos' },
      { status: 500 }
    );
  }
}

// POST - Registrar nuevo pago
export async function POST(req: NextRequest) {
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
    const {
      suscripcionId,
      monto,
      metodoPago,
      banco,
      numeroReferencia,
      comprobanteUrl,
      observaciones
    } = body;

    // Obtener la suscripción
    const suscripcion = await prisma.suscripcion.findUnique({
      where: { id: suscripcionId }
    });

    if (!suscripcion) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      );
    }

    // Calcular período del pago
    const periodoInicio = new Date();
    const periodoFin = calculateExpirationDate(periodoInicio, suscripcion.plan);

    const pago = await prisma.pagoSuscripcion.create({
      data: {
        suscripcionId,
        monto,
        metodoPago,
        banco,
        numeroReferencia,
        comprobanteUrl,
        observaciones,
        periodoInicio,
        periodoFin,
        estado: 'PENDIENTE'
      }
    });

    return NextResponse.json(pago, { status: 201 });
  } catch (error: unknown) {
    console.error('Error al registrar pago:', error);
    const msg = error instanceof Error ? error.message : "Error al registrar pago";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

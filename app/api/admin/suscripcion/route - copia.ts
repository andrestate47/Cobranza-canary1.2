
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { checkSubscriptionStatus, calculateExpirationDate } from '@/lib/subscription';

// GET - Obtener estado actual de la suscripción
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

    const status = await checkSubscriptionStatus();
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error al obtener estado de suscripción:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de suscripción' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva suscripción (período de prueba)
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

    // Verificar si ya existe una suscripción activa o en prueba
    const existente = await prisma.suscripcion.findFirst({
      where: {
        OR: [
          { estado: 'ACTIVA' },
          { estado: 'PRUEBA' }
        ]
      }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe una suscripción activa' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { nombreEmpresa, emailContacto, telefonoContacto, rucEmpresa, direccion } = body;

    // Calcular fecha de vencimiento (10 días de prueba)
    const fechaInicio = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 10);

    const suscripcion = await prisma.suscripcion.create({
      data: {
        nombreEmpresa,
        emailContacto,
        telefonoContacto,
        rucEmpresa,
        direccion,
        plan: 'MENSUAL',
        estado: 'PRUEBA',
        fechaInicio,
        fechaVencimiento
      }
    });

    return NextResponse.json(suscripcion, { status: 201 });
  } catch (error: unknown) {
    console.error('Error al crear suscripción:', error);
    const msg = error instanceof Error ? error.message : "Error al crear suscripción";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT - Actualizar suscripción
export async function PUT(req: NextRequest) {
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
    const { id, nombreEmpresa, emailContacto, telefonoContacto, rucEmpresa, direccion, plan } = body;

    const suscripcion = await prisma.suscripcion.update({
      where: { id },
      data: {
        nombreEmpresa,
        emailContacto,
        telefonoContacto,
        rucEmpresa,
        direccion,
        plan
      }
    });

    return NextResponse.json(suscripcion);
  } catch (error: unknown) {
    console.error('Error al actualizar suscripción:', error);
    const msg = error instanceof Error ? error.message : "Error al actualizar suscripción";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

// GET - Obtener configuración actual
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Buscar o crear configuración
    let config = await prisma.configuracion.findFirst();

    if (!config) {
      // Crear configuración por defecto si no existe
      config = await prisma.configuracion.create({
        data: {
          moneda: 'USD',
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración
export async function PUT(request: Request) {
  try {
    const session = await requirePermission('CONFIGURAR_SISTEMA')

    const body = await request.json();
    const { moneda } = body;

    if (!moneda) {
      return NextResponse.json(
        { error: 'Moneda es requerida' },
        { status: 400 }
      );
    }

    // Validar que la moneda sea válida
    const monedasValidas = ['USD', 'EUR', 'MXN', 'BRL', 'ARS', 'COP', 'PEN'];
    if (!monedasValidas.includes(moneda)) {
      return NextResponse.json(
        { error: 'Moneda inválida' },
        { status: 400 }
      );
    }

    // Buscar configuración existente
    let config = await prisma.configuracion.findFirst();

    if (config) {
      // Actualizar configuración existente
      config = await prisma.configuracion.update({
        where: { id: config.id },
        data: { moneda },
      });
    } else {
      // Crear nueva configuración
      config = await prisma.configuracion.create({
        data: { moneda },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}

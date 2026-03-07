
import { prisma } from './db';
import { Suscripcion } from '@prisma/client';

export interface SubscriptionStatus {
  isValid: boolean;
  isTrialPeriod: boolean;
  daysRemaining: number;
  suscripcion: Suscripcion | null;
}

/**
 * Verifica el estado de la suscripción del sistema
 * @returns Estado de la suscripción
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    // Obtener la suscripción activa o en prueba (solo debería haber una)
    const suscripcion = await prisma.suscripcion.findFirst({
      where: {
        OR: [
          { estado: 'ACTIVA' },
          { estado: 'PRUEBA' }
        ]
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    });

    // Si no hay suscripción, retornar como vencida
    if (!suscripcion) {
      return {
        isValid: false,
        isTrialPeriod: false,
        daysRemaining: 0,
        suscripcion: null
      };
    }

    const now = new Date();
    const fechaVencimiento = new Date(suscripcion.fechaVencimiento);
    const daysRemaining = Math.ceil((fechaVencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Si la suscripción está vencida, actualizarla
    if (now > fechaVencimiento) {
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { estado: 'VENCIDA' }
      });

      return {
        isValid: false,
        isTrialPeriod: false,
        daysRemaining: 0,
        suscripcion
      };
    }

    return {
      isValid: true,
      isTrialPeriod: suscripcion.estado === 'PRUEBA',
      daysRemaining,
      suscripcion
    };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return {
      isValid: false,
      isTrialPeriod: false,
      daysRemaining: 0,
      suscripcion: null
    };
  }
}

/**
 * Calcula la nueva fecha de vencimiento según el plan
 * @param fechaInicio Fecha de inicio
 * @param plan Plan de suscripción (MENSUAL o ANUAL)
 * @returns Nueva fecha de vencimiento
 */
export function calculateExpirationDate(fechaInicio: Date, plan: 'MENSUAL' | 'ANUAL'): Date {
  const fecha = new Date(fechaInicio);
  
  if (plan === 'MENSUAL') {
    fecha.setMonth(fecha.getMonth() + 1);
  } else {
    fecha.setFullYear(fecha.getFullYear() + 1);
  }
  
  return fecha;
}

/**
 * Calcula el monto según el plan
 * @param plan Plan de suscripción
 * @returns Monto en dólares
 */
export function calculatePlanAmount(plan: 'MENSUAL' | 'ANUAL'): number {
  const PRECIO_MENSUAL = 50; // $50/mes
  const PRECIO_ANUAL = 500; // $500/año (ahorro de $100)
  
  return plan === 'MENSUAL' ? PRECIO_MENSUAL : PRECIO_ANUAL;
}

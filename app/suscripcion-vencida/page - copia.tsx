
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { checkSubscriptionStatus } from '@/lib/subscription';
import { AlertCircle, Calendar, Mail, Phone, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function SuscripcionVencidaPage() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! }
  });

  if (!user) {
    redirect('/login');
  }

  // Verificar estado de suscripción
  const status = await checkSubscriptionStatus();

  // Si la suscripción es válida, redirigir al dashboard
  if (status.isValid) {
    redirect('/dashboard');
  }

  const isAdmin = user.role === 'ADMINISTRADOR';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-3xl font-bold">Suscripción Vencida</CardTitle>
          <CardDescription className="text-lg">
            Tu período de suscripción ha expirado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status.suscripcion && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center text-sm">
                <Building className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-semibold">Empresa:</span>
                <span className="ml-2">{status.suscripcion.nombreEmpresa}</span>
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-semibold">Plan:</span>
                <span className="ml-2">{status.suscripcion.plan}</span>
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-semibold">Venció el:</span>
                <span className="ml-2">
                  {new Date(status.suscripcion.fechaVencimiento).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">¿Cómo renovar tu suscripción?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Realiza una transferencia bancaria a una de nuestras cuentas:</li>
              <div className="ml-6 mt-2 space-y-2 text-sm bg-blue-50 p-3 rounded">
                <div>
                  <p className="font-semibold">Banco Pichincha</p>
                  <p>Cuenta: 1234567890</p>
                  <p>A nombre de: B.&.D.S.C</p>
                </div>
                <div className="border-t pt-2">
                  <p className="font-semibold">Banco Guayaquil</p>
                  <p>Cuenta: 0987654321</p>
                  <p>A nombre de: B.&.D.S.C</p>
                </div>
              </div>
              <li className="mt-2">Contacta a tu administrador para registrar el pago</li>
              <li>El administrador verificará el pago y activará tu suscripción</li>
            </ol>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Precios</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">Plan Mensual:</span> $50 USD/mes</p>
              <p><span className="font-semibold">Plan Anual:</span> $500 USD/año (ahorra $100)</p>
            </div>
          </div>

          {status.suscripcion && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Información de Contacto</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-gray-500" />
                  <span>{status.suscripcion.emailContacto}</span>
                </div>
                {status.suscripcion.telefonoContacto && (
                  <div className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 text-gray-500" />
                    <span>{status.suscripcion.telefonoContacto}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {isAdmin ? (
              <Link href="/admin/suscripcion" className="flex-1">
                <Button className="w-full">
                  Gestionar Suscripción
                </Button>
              </Link>
            ) : (
              <div className="w-full text-center text-sm text-gray-600">
                Contacta a tu administrador para renovar la suscripción
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

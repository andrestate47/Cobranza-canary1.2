import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ConfiguracionClient from '@/components/configuracion-client';

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Configuración</h1>
      <ConfiguracionClient />
    </div>
  );
}

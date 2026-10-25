import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ConfiguracionClient from '@/components/configuracion-client';
import BackgroundHalo from '@/components/background-halo';

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 overflow-x-hidden p-6">
      <BackgroundHalo />
      <div className="container mx-auto max-w-4xl relative z-10">
        <h1 className="text-3xl font-bold mb-6">Configuración</h1>
        <ConfiguracionClient />
      </div>
    </div>
  );
}


import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import GestionSuscripcion from '@/components/gestion-suscripcion';
import BackgroundHalo from '@/components/background-halo';

export default async function SuscripcionPage() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! }
  });

  if (!user || user.role !== 'ADMINISTRADOR') {
    redirect('/dashboard');
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 overflow-x-hidden">
      <BackgroundHalo />
      <div className="container mx-auto py-6 relative z-10">
        <GestionSuscripcion />
      </div>
    </div>
  );
}

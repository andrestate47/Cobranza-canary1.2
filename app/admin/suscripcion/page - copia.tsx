
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import GestionSuscripcion from '@/components/gestion-suscripcion';

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
    <div className="container mx-auto py-6">
      <GestionSuscripcion />
    </div>
  );
}

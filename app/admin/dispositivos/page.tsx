
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DispositivosClient from './dispositivos-client'
import BackgroundHalo from '@/components/background-halo'

export default async function DispositivosPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMINISTRADOR') {
    redirect('/dashboard')
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 overflow-x-hidden">
      <BackgroundHalo />
      <div className="container mx-auto py-8 px-4 relative z-10">
        <Suspense fallback={<div>Cargando...</div>}>
          <DispositivosClient />
        </Suspense>
      </div>
    </div>
  )
}

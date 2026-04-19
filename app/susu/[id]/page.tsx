
import { Metadata } from 'next'
import SusuDetalleClient from '@/components/susu/susu-detalle-client'

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: 'Detalle de SUSU',
  description: 'Ver detalles y gestionar pagos del SUSU'
}

export default async function SusuDetallePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMINISTRADOR" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

  return <SusuDetalleClient susuId={params.id} />
}

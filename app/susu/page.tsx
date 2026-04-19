
import { Metadata } from 'next'
import SusuListClient from '@/components/susu/susu-list-client'

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: 'SUSU - Sistema de Ahorro Rotativo',
  description: 'Gestiona tus SUSUs y participa en grupos de ahorro'
}

export default async function SusuPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMINISTRADOR" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

  return <SusuListClient />
}

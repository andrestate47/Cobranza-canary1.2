
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardClient from "@/components/dashboard-client"
import { checkSubscriptionStatus } from "@/lib/subscription"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  // Verificar estado de suscripción
  // DESACTIVADO TEMPORALMENTE PARA ACCESO LIBRE
  // const subscriptionStatus = await checkSubscriptionStatus()
  
  // Si la suscripción no es válida, redirigir a página de suscripción vencida
  // if (!subscriptionStatus.isValid) {
  //   redirect("/suscripcion-vencida")
  // }

  return <DashboardClient session={session} />
}

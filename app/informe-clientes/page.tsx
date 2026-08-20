
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/permissions"
import InformeClientesClient from "@/components/informe-clientes-client"

export default async function InformeClientesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  if (!hasPermission(session as any, 'VER_INFORME_CLIENTES')) {
    redirect("/dashboard")
  }

  return <InformeClientesClient session={session} />
}

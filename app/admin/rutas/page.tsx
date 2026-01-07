
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import GestionRutas from "@/components/gestion-rutas"

export default async function RutasPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Solo administradores pueden acceder
  const user = session.user as any
  if (user?.role !== "ADMINISTRADOR") {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<div className="p-4">Cargando...</div>}>
      <GestionRutas />
    </Suspense>
  )
}

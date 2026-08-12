
import { Suspense } from "react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import NuevoPrestamoClient from "@/components/nuevo-prestamo-client"
import { Loader2 } from "lucide-react"

export default async function NuevoPrestamoPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#071311]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <NuevoPrestamoClient session={session} />
    </Suspense>
  )
}

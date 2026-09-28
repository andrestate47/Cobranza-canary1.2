import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import CajaChicaClient from "@/components/caja-chica-client"

export default async function ViaticosPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return <CajaChicaClient session={session} />
}

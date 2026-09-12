
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import ListadoGeneralClient from "@/components/listado-general-client"

export const dynamic = "force-dynamic"

export default async function ListadoGeneralPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  return <ListadoGeneralClient session={session} />
}

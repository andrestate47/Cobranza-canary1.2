
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { ViaticosAdmin } from "@/components/viaticos-admin"

export default async function ViaticosPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  return <ViaticosAdmin />
}


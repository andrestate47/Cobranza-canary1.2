import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import RutaDelDiaClient from "@/components/ruta-del-dia-client"

export const metadata = {
  title: "Ruta del Día - Cobranza",
  description: "Organiza tu ruta de cobro diaria y registra pagos de forma interactiva.",
}

export default async function RutaDelDiaPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  return <RutaDelDiaClient session={session} />
}

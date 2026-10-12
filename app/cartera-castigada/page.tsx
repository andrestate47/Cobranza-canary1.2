import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import CarteraCastigadaClient from "@/components/cartera-castigada-client"

export const metadata = {
  title: "Cartera Castigada | Sistema de Cobranza",
  description: "Control y seguimiento de préstamos y clientes en mora crítica (+30 días sin abonos)"
}

export default async function CarteraCastigadaPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return <CarteraCastigadaClient session={session} />
}

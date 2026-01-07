
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { ViaticosAdmin } from "@/components/viaticos-admin"

export default async function ViaticosPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Viáticos/Caja/Cobradores</h1>
        <p className="text-gray-600">
          Control de ingresos y egresos para cobradores
        </p>
      </div>
      <ViaticosAdmin />
    </div>
  )
}

import { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import AdminUsuarios from "@/components/admin-usuarios"
import { ArrowLeft, Home, Shield } from "lucide-react"

export const metadata: Metadata = {
  title: "Gestión de Usuarios - B.&.D.S.C",
  description: "Panel de administración para gestionar usuarios, roles y permisos",
}

export default function AdminUsuariosPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-[#0E1F1C]/90 border-b border-gray-200 dark:border-[#1F3A36] shadow-sm">
        <div className="container-mobile">
          <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:h-16 md:py-0">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    Gestión de Usuarios
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-emerald-300/80">
                    Roles, accesos y permisos del sistema
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start md:self-auto">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#1A3330]"
              >
                <Link href="/dashboard" className="flex items-center">
                  <Home className="h-4 w-4 mr-2" />
                  Inicio
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-mobile py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          <AdminUsuarios />
        </Suspense>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Shield, Clock, XCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DeviceGuardProps {
  children: React.ReactNode
}

interface EstadoDispositivo {
  autorizado: boolean
  esAdmin?: boolean
  bloqueado?: boolean
  pendiente?: boolean
  mensaje?: string
  dispositivo?: {
    deviceName?: string
  }
}

export function DeviceGuard({ children }: DeviceGuardProps) {
  const { data: session, status } = useSession() || {}
  
  // Evitar pantalla de carga si ya está verificado en sesión o si es Admin
  const [verificando, setVerificando] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("device_verified")
      if (cached === "true") return false
    }
    return true
  })

  const [estadoDispositivo, setEstadoDispositivo] = useState<EstadoDispositivo | null>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("device_verified_data")
      if (cached) {
        try {
          return JSON.parse(cached)
        } catch (e) {}
      }
    }
    return null
  })

  useEffect(() => {
    const verificarDispositivo = async () => {
      if (status === "loading") return
      
      if (!session?.user) {
        setVerificando(false)
        return
      }

      // Si es admin, autorizar inmediatamente sin bloquear en cada refresh
      if (session.user.role === "ADMINISTRADOR") {
        setEstadoDispositivo({ autorizado: true, esAdmin: true })
        setVerificando(false)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("device_verified", "true")
        }
        return
      }

      try {
        const response = await fetch("/api/dispositivos/verificar", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        })

        const data = await response.json()
        setEstadoDispositivo(data)
        setVerificando(false)
        if (typeof window !== "undefined" && (data.autorizado || data.esAdmin)) {
          sessionStorage.setItem("device_verified", "true")
          sessionStorage.setItem("device_verified_data", JSON.stringify(data))
        }
      } catch (error) {
        console.error("Error al verificar dispositivo:", error)
        setVerificando(false)
      }
    }

    verificarDispositivo()
  }, [session, status])

  // Pantalla de carga mientras verifica (soporte dark mode completo para evitar destellos)
  if (verificando || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#071313] transition-colors">
        <Card className="w-full max-w-md bg-white dark:bg-[#102525] border-gray-200 dark:border-[#1F3A36] shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400" />
              <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Verificando dispositivo...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si no hay sesión, mostrar contenido normal (página de login)
  if (!session) {
    return <>{children}</>
  }

  // Si es admin, permitir acceso sin restricciones
  if (session.user?.role === "ADMINISTRADOR" || estadoDispositivo?.esAdmin) {
    return <>{children}</>
  }

  // Si el dispositivo está autorizado, permitir acceso
  if (estadoDispositivo?.autorizado) {
    return <>{children}</>
  }

  // Si el dispositivo está bloqueado
  if (estadoDispositivo?.bloqueado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#071313] p-4">
        <Card className="w-full max-w-lg border-red-200 dark:border-red-900/40 bg-white dark:bg-[#102525]">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">Dispositivo Bloqueado</CardTitle>
            <CardDescription className="dark:text-gray-400">Este dispositivo no tiene autorización para acceder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Acceso Denegado</AlertTitle>
              <AlertDescription>
                {estadoDispositivo?.mensaje || "Este dispositivo ha sido bloqueado por el administrador."}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 dark:bg-[#152e2a] p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <strong>Dispositivo:</strong> {estadoDispositivo?.dispositivo?.deviceName || "Desconocido"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Por favor, contacte al administrador del sistema para solicitar acceso desde este dispositivo.
              </p>
            </div>

            <Button 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              variant="outline" 
              className="w-full"
            >
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si el dispositivo está pendiente de autorización
  if (estadoDispositivo?.pendiente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#071313] p-4">
        <Card className="w-full max-w-lg border-yellow-200 dark:border-yellow-900/40 bg-white dark:bg-[#102525]">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-950/50 rounded-full flex items-center justify-center">
              <Clock className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-2xl text-yellow-600 dark:text-yellow-400">Dispositivo Pendiente de Autorización</CardTitle>
            <CardDescription className="dark:text-gray-400">Se ha detectado un nuevo dispositivo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-yellow-200 dark:border-yellow-900/40 bg-yellow-50 dark:bg-yellow-950/30">
              <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-300">Seguridad Activada</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-200">
                {estadoDispositivo?.mensaje || "Este dispositivo está pendiente de autorización por el administrador."}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 dark:bg-[#152e2a] p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Dispositivo detectado:</strong> {estadoDispositivo?.dispositivo?.deviceName || "Desconocido"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Estado:</strong> <span className="text-yellow-600 dark:text-yellow-400 font-medium">Pendiente de aprobación</span>
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>📱 Próximos pasos:</strong>
              </p>
              <ol className="text-sm text-blue-700 dark:text-blue-200 mt-2 space-y-1 list-decimal list-inside">
                <li>El administrador ha sido notificado automáticamente</li>
                <li>Recibirás acceso una vez que el administrador apruebe este dispositivo</li>
                <li>Por favor, espera la autorización antes de intentar acceder nuevamente</li>
              </ol>
            </div>

            <Button 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              variant="outline" 
              className="w-full"
            >
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Por defecto, permitir acceso (fallback)
  return <>{children}</>
}

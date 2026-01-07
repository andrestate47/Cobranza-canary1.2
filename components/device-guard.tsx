
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
  const [verificando, setVerificando] = useState(true)
  const [estadoDispositivo, setEstadoDispositivo] = useState<EstadoDispositivo | null>(null)

  useEffect(() => {
    const verificarDispositivo = async () => {
      if (status === "loading") return
      
      if (!session?.user) {
        setVerificando(false)
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
      } catch (error) {
        console.error("Error al verificar dispositivo:", error)
        setVerificando(false)
      }
    }

    verificarDispositivo()
  }, [session, status])

  // Pantalla de carga mientras verifica
  if (verificando || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-gray-600">Verificando dispositivo...</p>
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
  if (estadoDispositivo?.esAdmin) {
    return <>{children}</>
  }

  // Si el dispositivo está autorizado, permitir acceso
  if (estadoDispositivo?.autorizado) {
    return <>{children}</>
  }

  // Si el dispositivo está bloqueado
  if (estadoDispositivo?.bloqueado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg border-red-200">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Dispositivo Bloqueado</CardTitle>
            <CardDescription>Este dispositivo no tiene autorización para acceder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Acceso Denegado</AlertTitle>
              <AlertDescription>
                {estadoDispositivo?.mensaje || "Este dispositivo ha sido bloqueado por el administrador."}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Dispositivo:</strong> {estadoDispositivo?.dispositivo?.deviceName || "Desconocido"}
              </p>
              <p className="text-sm text-gray-600">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg border-yellow-200">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl text-yellow-600">Dispositivo Pendiente de Autorización</CardTitle>
            <CardDescription>Se ha detectado un nuevo dispositivo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-yellow-200 bg-yellow-50">
              <Shield className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Seguridad Activada</AlertTitle>
              <AlertDescription className="text-yellow-700">
                {estadoDispositivo?.mensaje || "Este dispositivo está pendiente de autorización por el administrador."}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Dispositivo detectado:</strong> {estadoDispositivo?.dispositivo?.deviceName || "Desconocido"}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Estado:</strong> <span className="text-yellow-600 font-medium">Pendiente de aprobación</span>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>📱 Próximos pasos:</strong>
              </p>
              <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
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

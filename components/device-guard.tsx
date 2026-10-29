"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Shield, Clock, XCircle } from "lucide-react"
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

// Funciones seguras para acceder a sessionStorage sin lanzar excepciones en navegadores restrictivos
function safeGetSessionStorage(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage.getItem(key)
    }
  } catch {
    // Modo incógnito, storage deshabilitado o políticas estrictas
  }
  return null
}

function safeSetSessionStorage(key: string, value: string) {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(key, value)
    }
  } catch {
    // Ignorar si no hay permisos de storage
  }
}

export function DeviceGuard({ children }: DeviceGuardProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { data: session, status } = useSession() || {}
  const [estadoDispositivo, setEstadoDispositivo] = useState<EstadoDispositivo | null>(null)

  // Asegurar que el primer render en cliente coincida exactamente con el SSR (prevenir Hydration Error)
  useEffect(() => {
    setMounted(true)
    const cachedData = safeGetSessionStorage("device_verified_data")
    if (cachedData) {
      try {
        setEstadoDispositivo(JSON.parse(cachedData))
      } catch {}
    }
  }, [])

  const isPublicPage = !pathname || pathname === "/" || pathname.startsWith("/login")

  useEffect(() => {
    if (!mounted || isPublicPage || status !== "authenticated" || !session?.user) {
      return
    }

    // Administradores nunca se bloquean
    if (session.user.role === "ADMINISTRADOR") {
      setEstadoDispositivo({ autorizado: true, esAdmin: true })
      safeSetSessionStorage("device_verified", "true")
      return
    }

    // Si ya está verificado en caché de sesión como autorizado, no repetir fetch
    if (safeGetSessionStorage("device_verified") === "true") {
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const verificarDispositivo = async () => {
      try {
        const response = await fetch("/api/dispositivos/verificar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!response.ok) return

        const data = await response.json()
        setEstadoDispositivo(data)

        if (data.autorizado || data.esAdmin) {
          safeSetSessionStorage("device_verified", "true")
          safeSetSessionStorage("device_verified_data", JSON.stringify(data))
        }
      } catch (err) {
        // En caso de fallo o timeout de red, no bloquear la experiencia del usuario
        console.warn("[DeviceGuard] Verificación de dispositivo omitida o demorada:", err)
      } finally {
        clearTimeout(timeoutId)
      }
    }

    verificarDispositivo()
  }, [mounted, isPublicPage, status, session])

  // Antes de montar en el cliente, SIEMPRE renderizar children tal como lo hace el SSR.
  // Esto elimina 100% el "Application error: a client-side exception has occurred" por desajuste de hidratación.
  if (!mounted || isPublicPage || status !== "authenticated" || !session) {
    return <>{children}</>
  }

  // Si es admin o está explícitamente autorizado, permitir acceso normal
  if (session.user?.role === "ADMINISTRADOR" || estadoDispositivo?.esAdmin || estadoDispositivo?.autorizado) {
    return <>{children}</>
  }

  // Si el dispositivo está bloqueado por el administrador
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

  // Fallback por defecto: renderizar children normalmente
  return <>{children}</>
}

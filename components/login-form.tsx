
"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User, Lock, Eye, EyeOff } from "lucide-react"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        let errorMessage = "Credenciales incorrectas. Por favor, verifica tu email y contraseña."

        if (result.error.includes("desactivado")) {
          errorMessage = "Tu cuenta ha sido desactivada. Contacta al administrador para reactivarla."
        } else if (result.error.includes("Tiempo de uso")) {
          errorMessage = result.error
        }

        toast({
          title: "Error de autenticación",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        // Verificar la sesión para obtener información del usuario
        const session = await getSession()
        const userName = session?.user?.firstName || session?.user?.name || "Usuario"
        const userRole = session?.user?.role === 'ADMINISTRADOR' ? 'Administrador' :
          session?.user?.role === 'SUPERVISOR' ? 'Supervisor' : 'Cobrador'

        toast({
          title: `¡Bienvenido, ${userName}!`,
          description: `Sesión iniciada como ${userRole}.`,
        })
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="animate-fadeInScale shadow-2xl bg-white border-gray-200">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-28 h-28 mb-14 relative">
          <Image
            src="/logo.png"
            alt="B.&.D.S.C Logo"
            width={112}
            height={112}
            className="object-contain"
            priority
          />
        </div>
        <CardTitle className="text-2xl font-bold text-black">
          B.&.D.S.C
        </CardTitle>
        <CardDescription className="text-slate-500">
          Ingresa tus credenciales para acceder al sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-800">
              Correo electrónico
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-600" style={{ color: '#475569' }} />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="pl-10 h-12 text-slate-900 border-slate-300 bg-white placeholder:text-slate-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-600" style={{ color: '#475569' }} />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-12 h-12 text-slate-900 border-slate-300 bg-white placeholder:text-slate-500"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-slate-600 hover:text-slate-800"
                style={{ color: '#475569' }}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-12 text-lg font-semibold btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>

        {/* Información de cuentas de demostración */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">📝 Cuentas de Demostración</h3>
          <div className="space-y-1 text-xs text-blue-700">
            <p><strong>👑 Administrador:</strong> admin@cobranza.com / admin123</p>
            <p><strong>👤 Supervisor:</strong> supervisor@cobranza.com / supervisor123</p>
            <p><strong>💼 Cobrador:</strong> cobrador@cobranza.com / cobrador123</p>
          </div>
          <p className="text-xs text-blue-600 mt-2 italic">
            Cada rol tiene diferentes permisos y accesos al sistema
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

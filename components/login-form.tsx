
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
import { Loader2, Mail, Lock, Eye, EyeOff, ShieldCheck, UserCheck } from "lucide-react"

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
        const session = await getSession()
        const userName = session?.user?.firstName || session?.user?.name || "Usuario"
        const userRole = session?.user?.role === 'ADMINISTRADOR' ? 'Administrador' :
          session?.user?.role === 'SUPERVISOR' ? 'Supervisor' : 'Cobrador'

        toast({
          title: `¡Bienvenido, ${userName}!`,
          description: `Sesión iniciada con rol ${userRole}.`,
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
    <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
      <CardHeader className="text-center pt-8 pb-4 space-y-3 relative">
        {/* Glow halo around logo */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 blur-lg opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-slate-950/80 border border-slate-700/60 p-2.5 flex items-center justify-center shadow-inner">
            <Image
              src="/logo.png"
              alt="B.&.D.S.C Logo"
              width={72}
              height={72}
              className="object-contain filter drop-shadow-md"
              priority
            />
          </div>
        </div>

        <div className="space-y-1">
          <CardTitle className="text-2xl font-black text-white tracking-wider">
            B.&.D.S.C
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs font-medium">
            Sistema de Cobranza & Gestión Financiera
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-8 space-y-6">
        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-slate-300">
              Correo Electrónico
            </Label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="pl-10 h-11 text-sm bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-slate-300">
              Contraseña
            </Label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 text-sm bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                disabled={isLoading}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 mt-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                Iniciando sesión...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <UserCheck className="w-4 h-4" />
                Ingresar al Sistema
              </span>
            )}
          </Button>
        </form>

        {/* Security badge footer */}
        <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 border-t border-slate-800/80">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Acceso exclusivo para personal autorizado</span>
        </div>
      </CardContent>
    </Card>
  )
}



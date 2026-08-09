
import LoginForm from "@/components/login-form"
import { Metadata } from "next"
import Image from "next/image"
import { ShieldCheck, Wallet, Route, TrendingUp, Lock } from "lucide-react"

export const metadata: Metadata = {
  title: "Iniciar Sesión | B.&.D.S.C - Sistema de Cobranzas",
  description: "Plataforma de gestión de préstamos, rutas y cobranza diaria",
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Dynamic Background Light Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-600/30 to-blue-700/20 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-600/20 to-teal-800/25 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[35%] w-[350px] h-[350px] rounded-full bg-purple-600/15 blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Brand & Hero Showcase (Visible on Large Screens) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-6">
          <div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Gestión Integral de <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Cobranzas & Préstamos
              </span>
            </h1>

            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              Plataforma rápida, segura e intuitiva para el control de rutas diarias, cierre de caja en tiempo real y administración de clientes.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 w-fit mb-3">
                <Route className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Rutas Inteligentes</h3>
              <p className="text-xs text-slate-400 mt-1">Ubicaciones GPS y orden eficiente de cobranza.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit mb-3">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Cierre de Día</h3>
              <p className="text-xs text-slate-400 mt-1">Auditoría automática de ingresos y gastos.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 w-fit mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Reportes Claros</h3>
              <p className="text-xs text-slate-400 mt-1">Estadísticas de ganancias y amortizaciones.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 w-fit mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Seguridad SSL</h3>
              <p className="text-xs text-slate-400 mt-1">Control por roles y verificación de dispositivo.</p>
            </div>
          </div>

          {/* Footer Security Tag */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sistema protegido • B.&.D.S.C ENTERPRISE</span>
          </div>
        </div>

        {/* Right Side: Login Form Card */}
        <div className="w-full lg:col-span-6 flex justify-center">
          <LoginForm />
        </div>

      </div>
    </div>
  )
}


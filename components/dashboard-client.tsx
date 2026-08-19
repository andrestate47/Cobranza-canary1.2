"use client"

import { Session } from "next-auth"
import { signOut } from "next-auth/react"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useCurrency } from "@/hooks/use-currency"
import { usePermissions } from "@/hooks/use-permissions"
import {
  Users,
  Calendar,
  BarChart3,
  Receipt,
  Plus,
  LogOut,
  User,
  Settings,
  Shield,
  Crown,
  PiggyBank,
  Smartphone,
  FileText,
  Wallet,
  MapPin,
  RefreshCw,
  Clock,
  DollarSign,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Search,
  Zap,
  CheckCircle2,
  LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardClientProps {
  session: Session
}

interface ModuleItem {
  title: string
  description: string
  icon: any
  href: string
  category: 'operaciones' | 'reportes' | 'admin'
  badgeText?: string
  accentColor: {
    bg: string
    text: string
    border: string
    glow: string
  }
}

export default function DashboardClient({ session }: DashboardClientProps) {
  const user = session?.user
  const { logoUrl, format: formatCurrency } = useCurrency()
  const { isAdmin, isSupervisor, isCobrador, canManageUsers, canManagePermissions, canViewDashboard, canViewReports } = usePermissions()

  if (!isAdmin && !canViewDashboard) {
    return (
      <div className="text-center p-12 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl my-8">
        <Shield className="mx-auto h-12 w-12 text-rose-500 dark:text-rose-400 mb-4" />
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Acceso Denegado</h3>
        <p className="text-rose-600 dark:text-rose-400">No tienes permiso para ver el Dashboard</p>
      </div>
    )
  }

  const userFirstName = user?.firstName?.trim()
  const userName = user?.name?.trim()
  const userRole = user?.role || ''

  let displayName = ''
  if (userFirstName) {
    displayName = userFirstName
  } else if (userName) {
    displayName = userName
  }

  // Si el nombre contiene "Administrador", dejar solo "Administrador"
  if (displayName.toLowerCase().includes("administrador")) {
    displayName = "Administrador"
  }

  const welcomeGreeting = displayName ? `¡Hola, ${displayName}!` : "¡Bienvenido!"

  const [activeCategory, setActiveCategory] = useState<'all' | 'operaciones' | 'reportes' | 'admin'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingStats, setLoadingStats] = useState(true)
  const [rutaStats, setRutaStats] = useState({
    totalPendiente: 0,
    totalRecaudado: 0,
    pendientesCount: 0,
    cobradosCount: 0,
  })

  // Cargar estadísticas en tiempo real de la ruta para los KPI superiores
  const fetchRutaStats = async () => {
    setLoadingStats(true)
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      const response = await fetch(`/api/ruta-del-dia?fecha=${todayStr}`)
      if (response.ok) {
        const data = await response.json()
        const porCobrar = data.porCobrar || []
        const cobrados = data.cobrados || []

        const totalPendiente = porCobrar.reduce((sum: number, item: any) => sum + (item.valorCuota || 0), 0)
        const totalRecaudado = cobrados.reduce((sum: number, item: any) => sum + (item.pagadoHoyMonto || item.valorCuota || 0), 0)

        setRutaStats({
          totalPendiente,
          totalRecaudado,
          pendientesCount: porCobrar.length,
          cobradosCount: cobrados.length
        })
      }
    } catch (error) {
      console.error("Error al cargar stats del inicio:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchRutaStats()
  }, [])

  // Definición estandarizada de todos los módulos con el diseño de Ruta del Día
  const allModules: ModuleItem[] = useMemo(() => [
    {
      title: "Ruta del Día",
      description: "Organiza, ordena y gestiona tus cobros en tiempo real",
      icon: MapPin,
      href: "/ruta-del-dia",
      category: "operaciones",
      badgeText: "Principal",
      accentColor: {
        bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
        text: "text-cyan-600 dark:text-cyan-400",
        border: "border-cyan-500/30",
        glow: "from-cyan-500 to-emerald-500"
      }
    },
    {
      title: "Listado General",
      description: "Vista global de clientes con saldos y estados de préstamo",
      icon: Users,
      href: "/listado-general",
      category: "operaciones",
      accentColor: {
        bg: "bg-blue-500/10 dark:bg-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/30",
        glow: "from-blue-500 to-indigo-500"
      }
    },
    {
      title: "Informe de Clientes",
      description: "Gestión completa de clientes, fichas y estado de cobros",
      icon: User,
      href: "/informe-clientes",
      category: "operaciones",
      accentColor: {
        bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
        text: "text-indigo-600 dark:text-indigo-400",
        border: "border-indigo-500/30",
        glow: "from-indigo-500 to-purple-500"
      }
    },
    {
      title: user?.role === 'COBRADOR' ? "Caja Chica" : "Viáticos / Caja",
      description: user?.role === 'COBRADOR' ? "Balance y control de efectivo diario" : "Control general de ingresos y egresos de cobradores",
      icon: Wallet,
      href: user?.role === 'COBRADOR' ? "/caja-chica" : "/viaticos",
      category: "operaciones",
      accentColor: {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-500/30",
        glow: "from-emerald-500 to-teal-500"
      }
    },
    {
      title: "Gastos Operativos",
      description: "Registro y control de gastos de ruta y caja",
      icon: Receipt,
      href: "/gastos",
      category: "operaciones",
      accentColor: {
        bg: "bg-amber-500/10 dark:bg-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/30",
        glow: "from-amber-500 to-orange-500"
      }
    },
    {
      title: "Cierres del Día",
      description: "Historial de cierres de caja y arqueo de jornada",
      icon: Calendar,
      href: "/cierres-dia",
      category: "reportes",
      accentColor: {
        bg: "bg-teal-500/10 dark:bg-teal-500/20",
        text: "text-teal-600 dark:text-teal-400",
        border: "border-teal-500/30",
        glow: "from-teal-500 to-cyan-500"
      }
    },
    {
      title: "Informes del Día",
      description: "Reportes consolidados y métricas de rendimiento diario",
      icon: BarChart3,
      href: "/informes-dia",
      category: "reportes",
      accentColor: {
        bg: "bg-purple-500/10 dark:bg-purple-500/20",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-500/30",
        glow: "from-purple-500 to-pink-500"
      }
    },
    ...(isAdmin || isSupervisor || canViewReports ? [
      {
        title: "Reporte de Ganancias",
        description: "Análisis financiero avanzado e intereses generados",
        icon: TrendingUp,
        href: "/reportes/ganancias",
        category: "reportes" as const,
        badgeText: "Finanzas",
        accentColor: {
          bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
          border: "border-emerald-500/30",
          glow: "from-emerald-500 to-green-500"
        }
      },
      {
        title: "Sistema SUSU",
        description: "Administración de fondos y ahorros rotativos",
        icon: PiggyBank,
        href: "/susu",
        category: "reportes" as const,
        accentColor: {
          bg: "bg-pink-500/10 dark:bg-pink-500/20",
          text: "text-pink-600 dark:text-pink-400",
          border: "border-pink-500/30",
          glow: "from-pink-500 to-rose-500"
        }
      },
      {
        title: "Gestión de Sueldos",
        description: "Comisiones, nómina y adelantos de cobradores",
        icon: Crown,
        href: "/gestion-sueldos",
        category: "admin" as const,
        accentColor: {
          bg: "bg-amber-500/10 dark:bg-amber-500/20",
          text: "text-amber-600 dark:text-amber-400",
          border: "border-amber-500/30",
          glow: "from-amber-500 to-yellow-500"
        }
      }
    ] : []),
    ...(isAdmin || canManageUsers || canManagePermissions ? [
      {
        title: "Gestión de Usuarios",
        description: "Administración de roles, supervisores y permisos",
        icon: Shield,
        href: "/admin/usuarios",
        category: "admin" as const,
        accentColor: {
          bg: "bg-rose-500/10 dark:bg-rose-500/20",
          text: "text-rose-600 dark:text-rose-400",
          border: "border-rose-500/30",
          glow: "from-rose-500 to-red-500"
        }
      }
    ] : []),
    ...(isAdmin ? [
      {
        title: "Gestión de Rutas",
        description: "Asignación de clientes y cobradores por zonas",
        icon: MapPin,
        href: "/admin/rutas",
        category: "admin" as const,
        accentColor: {
          bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
          text: "text-cyan-600 dark:text-cyan-400",
          border: "border-cyan-500/30",
          glow: "from-cyan-500 to-blue-500"
        }
      },
      {
        title: "Control de Dispositivos",
        description: "Seguridad y autorización de dispositivos móviles",
        icon: Smartphone,
        href: "/admin/dispositivos",
        category: "admin" as const,
        accentColor: {
          bg: "bg-blue-500/10 dark:bg-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
          border: "border-blue-500/30",
          glow: "from-blue-500 to-cyan-500"
        }
      },
      {
        title: "Historial de Auditoría",
        description: "Registro de actividad e inspección de cambios",
        icon: FileText,
        href: "/admin/auditoria",
        category: "admin" as const,
        accentColor: {
          bg: "bg-purple-500/10 dark:bg-purple-500/20",
          text: "text-purple-600 dark:text-purple-400",
          border: "border-purple-500/30",
          glow: "from-purple-500 to-indigo-500"
        }
      },
      {
        title: "Suscripción",
        description: "Planes, facturación y estado de la cuenta",
        icon: Calendar,
        href: "/admin/suscripcion",
        category: "admin" as const,
        accentColor: {
          bg: "bg-teal-500/10 dark:bg-teal-500/20",
          text: "text-teal-600 dark:text-teal-400",
          border: "border-teal-500/30",
          glow: "from-teal-500 to-emerald-500"
        }
      },
      {
        title: "Configuración",
        description: "Monedas, preferencias y ajustes globales",
        icon: Settings,
        href: "/configuracion",
        category: "admin" as const,
        accentColor: {
          bg: "bg-slate-500/10 dark:bg-slate-500/20",
          text: "text-slate-600 dark:text-slate-300",
          border: "border-slate-500/30",
          glow: "from-slate-500 to-gray-500"
        }
      }
    ] : [])
  ], [user?.role, isAdmin, isSupervisor, canManageUsers, canManagePermissions])

  // Filtrado de módulos por búsqueda y categoría
  const filteredModules = useMemo(() => {
    return allModules.filter((mod) => {
      const matchCat = activeCategory === 'all' || mod.category === activeCategory
      const query = searchQuery.toLowerCase().trim()
      const matchQuery = !query ||
        mod.title.toLowerCase().includes(query) ||
        mod.description.toLowerCase().includes(query)
      return matchCat && matchQuery
    })
  }, [allModules, activeCategory, searchQuery])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const totalAtendidos = rutaStats.pendientesCount + rutaStats.cobradosCount
  const porcentajeEficiencia = totalAtendidos > 0
    ? Math.round((rutaStats.cobradosCount / totalAtendidos) * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 pb-16 w-full max-w-full overflow-x-hidden">

      {/* ─── STICKY HEADER (ESTILO RUTA DEL DÍA) ─── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-[#0E1F1C]/90 border-b border-gray-200 dark:border-[#1F3A36] shadow-sm w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 w-full">
          <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
            
            {/* Logo y título de la plataforma */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 p-1 flex items-center justify-center shrink-0">
                {logoUrl ? (
                  <img
                    src={`/api/files/system/${encodeURIComponent(logoUrl)}`}
                    alt="Logo Plataforma"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Image
                    src="/logo.png"
                    alt="Logo Plataforma"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-base font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[120px] sm:max-w-none">
                    Cobranza BDSC
                  </h1>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono shrink-0">
                    v1.2
                  </Badge>
                </div>
              </div>
            </div>

            {/* Acciones del Header: Tema + Menú de Usuario */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRutaStats}
                disabled={loadingStats}
                className="h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 p-0 text-xs text-gray-600 dark:text-emerald-300 hover:bg-gray-100 dark:hover:bg-[#1A3330] rounded-xl flex items-center justify-center"
                title="Actualizar datos"
              >
                <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin text-emerald-500" : ""}`} />
              </Button>

              <ThemeToggle />

              {/* Menú de Usuario */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 sm:h-9 sm:px-3 flex items-center space-x-1.5 border border-gray-200 dark:border-[#1F3A36] bg-white dark:bg-[#152e2a] hover:bg-gray-50 dark:hover:bg-[#1A3330] rounded-xl text-gray-800 dark:text-white shrink-0"
                  >
                    <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline-block">
                      {displayName || user?.role || 'Cuenta'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white shadow-xl">
                  <DropdownMenuLabel className="font-bold flex items-center justify-between">
                    <span>Mi Cuenta</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {user?.role}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100 dark:bg-[#1F3A36]" />
                  <DropdownMenuItem asChild className="hover:bg-gray-100 dark:hover:bg-[#152e2a] cursor-pointer">
                    <Link href="/perfil" className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-emerald-500" />
                      <span>Mi Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild className="hover:bg-gray-100 dark:hover:bg-[#152e2a] cursor-pointer">
                      <Link href="/configuracion" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Configuración</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-gray-100 dark:bg-[#1F3A36]" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">

        {/* ─── BANNER DE BIENVENIDA Y RESUMEN KPI (ESTILO RUTA DEL DÍA) ─── */}
        <div className="bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  {user?.role === 'ADMINISTRADOR' && <Crown className="h-3 w-3 text-amber-500" />}
                  {user?.role === 'SUPERVISOR' && <Shield className="h-3 w-3 text-blue-500" />}
                  {user?.role === 'COBRADOR' && <User className="h-3 w-3 text-emerald-500" />}
                  {user?.role === 'ADMINISTRADOR' ? 'Administrador' : user?.role === 'SUPERVISOR' ? 'Supervisor' : 'Cobrador'}
                </Badge>
              </div>
            </div>

            {/* Fecha del día */}
            <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-[#152e2a] border border-gray-200 dark:border-[#1F3A36] px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-emerald-300 self-start sm:self-auto shrink-0">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="capitalize">
                {new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
              </span>
            </div>
          </div>

          {/* Tarjetas KPI de Resumen Rápido en Tiempo Real */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            
            {/* KPI 1: Por Cobrar Hoy */}
            <Card className="bg-gray-50/80 dark:bg-[#152e2a] border-gray-200 dark:border-[#1F3A36] shadow-none">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-emerald-300/70 uppercase tracking-wider block">
                    Por Cobrar Hoy
                  </span>
                  <span className="text-base sm:text-lg font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                    {formatCurrency(rutaStats.totalPendiente)}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {rutaStats.pendientesCount} pendientes en ruta
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Clock className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Recaudado Hoy */}
            <Card className="bg-gray-50/80 dark:bg-[#152e2a] border-gray-200 dark:border-[#1F3A36] shadow-none">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-emerald-300/70 uppercase tracking-wider block">
                    Recaudado Hoy
                  </span>
                  <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {formatCurrency(rutaStats.totalRecaudado)}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {rutaStats.cobradosCount} cobros listos
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Progreso */}
            <Card className="bg-gray-50/80 dark:bg-[#152e2a] border-gray-200 dark:border-[#1F3A36] shadow-none">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-emerald-300/70 uppercase tracking-wider block">
                    Efectividad Día
                  </span>
                  <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                    {porcentajeEficiencia}%
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {rutaStats.cobradosCount} de {totalAtendidos} cobrados
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Módulos Disponibles */}
            <Card className="bg-gray-50/80 dark:bg-[#152e2a] border-gray-200 dark:border-[#1F3A36] shadow-none">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-emerald-300/70 uppercase tracking-wider block">
                    Módulos Activos
                  </span>
                  <span className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5 block">
                    {allModules.length}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Herramientas habilitadas
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <LayoutGrid className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ─── BARRA DE FILTRADO DE MÓDULOS (BUSCADOR + CATEGORÍAS) ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          
          {/* Tabs por categoría */}
          <div className="flex items-center space-x-1.5 p-1 bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] rounded-xl overflow-x-auto w-full sm:w-auto shrink-0">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#152e2a]'
              }`}
            >
              Todos ({allModules.length})
            </button>
            <button
              onClick={() => setActiveCategory('operaciones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeCategory === 'operaciones'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#152e2a]'
              }`}
            >
              Operaciones Diarias
            </button>
            <button
              onClick={() => setActiveCategory('reportes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeCategory === 'reportes'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#152e2a]'
              }`}
            >
              Reportes & Cierres
            </button>
            {(isAdmin || isSupervisor || canManageUsers) && (
              <button
                onClick={() => setActiveCategory('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeCategory === 'admin'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#152e2a]'
                }`}
              >
                Administración
              </button>
            )}
          </div>

          {/* Buscador de Módulos */}
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-emerald-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar módulo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* ─── GRID DE MÓDULOS CON EL DISEÑO DE RUTA DEL DÍA ─── */}
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {filteredModules.map((item) => {
              const Icon = item.icon

              return (
                <Link key={item.href} href={item.href} className="group block w-full h-full">
                  <Card className="w-full h-full bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] hover:border-emerald-500/60 dark:hover:border-emerald-500/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 rounded-2xl overflow-hidden relative group-hover:-translate-y-1 flex flex-col justify-between">
                    
                    {/* Línea superior con gradiente dinámico */}
                    <div className={`h-1 bg-gradient-to-r ${item.accentColor.glow} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

                    <CardContent className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Header de la tarjeta del módulo */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-3 rounded-2xl ${item.accentColor.bg} ${item.accentColor.text} border ${item.accentColor.border} group-hover:scale-110 transition-transform duration-300 flex items-center justify-center shadow-sm`}>
                            <Icon className="h-6 w-6" />
                          </div>

                          {item.badgeText && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              {item.badgeText}
                            </Badge>
                          )}
                        </div>

                        {/* Título y descripción */}
                        <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-emerald-300/70 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Footer de la tarjeta con acción rápida */}
                      <div className="pt-4 mt-4 border-t border-gray-100 dark:border-[#152e2a] flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        <span>Ingresar al módulo</span>
                        <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-[#152e2a] group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all duration-300">
                          <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0E1F1C] border border-dashed border-gray-300 dark:border-[#1F3A36] rounded-2xl p-8 text-center space-y-2">
            <Search className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              No se encontraron módulos que coincidan con &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Intenta cambiar el término de búsqueda o selecciona otra categoría.
            </p>
          </div>
        )}

      </main>

      {/* ─── BOTÓN FLOTANTE PARA CREAR NUEVO PRÉSTAMO ─── */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link href="/prestamos/nuevo">
          <Button
            size="lg"
            className="w-14 h-14 rounded-full p-0 shadow-2xl hover:shadow-emerald-500/20 transform hover:scale-110 transition-all duration-200 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center border border-emerald-400/30"
            title="Crear Nuevo Préstamo"
          >
            <Plus className="h-8 w-8 stroke-[2.5]" />
          </Button>
        </Link>
      </div>

    </div>
  )
}

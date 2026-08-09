
"use client"

import { Session } from "next-auth"
import { signOut } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useCurrency } from "@/hooks/use-currency"
import {
  Users,
  Calendar,
  BarChart3,
  Receipt,
  Plus,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  Shield,
  Crown,
  PiggyBank,
  Smartphone,
  FileText,
  Wallet,
  MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

export default function DashboardClient({ session }: DashboardClientProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const user = session?.user
  const { logoUrl } = useCurrency()

  const baseMenuItems = [
    {
      title: "Ruta del Día",
      description: "Organiza y gestiona tus cobros diarios",
      icon: MapPin,
      href: "/ruta-del-dia",
      color: "bg-teal-500 hover:bg-teal-600",
    },
    {
      title: "Listado General",
      description: "Clientes con saldos pendientes",
      icon: Users,
      href: "/listado-general",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Informe de Clientes",
      description: "Gestión completa de clientes y visitados",
      icon: Users,
      href: "/informe-clientes",
      color: "bg-indigo-500 hover:bg-indigo-600",
    },
    // El reporte de ganancias se agregará condicionalmente según el rol
    {
      title: "Cierres del Día",
      description: "Historial de cierres diarios",
      icon: Calendar,
      href: "/cierres-dia",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "Informes del Día",
      description: "Reportes y estadísticas diarias",
      icon: BarChart3,
      href: "/informes-dia",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "Gastos",
      description: "Registro de gastos diarios",
      icon: Receipt,
      href: "/gastos",
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ]

  // Agregar Caja Chica o Viáticos según el rol
  const cajaChicaItem = user?.role === 'COBRADOR'
    ? {
      title: "Caja Chica",
      description: "Tu balance de efectivo diario",
      icon: Wallet,
      href: "/caja-chica",
      color: "bg-teal-500 hover:bg-teal-600",
    }
    : {
      title: "Viáticos/Caja/Cobradores",
      description: "Control de ingresos y egresos",
      icon: Wallet,
      href: "/viaticos",
      color: "bg-teal-500 hover:bg-teal-600",
    }

  const menuItemsWithCaja = [
    ...baseMenuItems,
    cajaChicaItem,
  ]

  // Items compartidos por Admin y Supervisor que no ve el Cobrador
  const adminSupervisorItems = [
    {
      title: "Reporte de Ganancias",
      description: "Análisis financiero detallado",
      icon: BarChart3,
      href: "/reportes/ganancias",
      color: "bg-emerald-500 hover:bg-emerald-600",
    },
    {
      title: "SUSU",
      description: "Sistema de ahorro rotativo",
      icon: PiggyBank,
      href: "/susu",
      color: "bg-pink-500 hover:bg-pink-600",
    },
  ]

  // Agregar panel de administración solo para administradores y supervisores
  const menuItems = user?.role === 'ADMINISTRADOR'
    ? [
      ...menuItemsWithCaja,
      ...adminSupervisorItems,
      {
        title: "Gestión de Usuarios",
        description: "Administrar usuarios y permisos",
        icon: Shield,
        href: "/admin/usuarios",
        color: "bg-red-500 hover:bg-red-600",
      },
      {
        title: "Gestión de Dispositivos",
        description: "Autorizar y controlar dispositivos",
        icon: Smartphone,
        href: "/admin/dispositivos",
        color: "bg-cyan-500 hover:bg-cyan-600",
      },
      {
        title: "Gestión de Rutas",
        description: "Asignar clientes a rutas de cobradores",
        icon: MapPin,
        href: "/admin/rutas",
        color: "bg-yellow-500 hover:bg-yellow-600",
      },
      {
        title: "Historial de Auditoría",
        description: "Ver eliminaciones de otros usuarios",
        icon: FileText,
        href: "/admin/auditoria",
        color: "bg-purple-500 hover:bg-purple-600",
      },
      {
        title: "Gestión de Sueldos",
        description: "Pagos de sueldos y avances",
        icon: Crown,
        href: "/gestion-sueldos",
        color: "bg-yellow-500 hover:bg-yellow-600",
      },
      {
        title: "Suscripción",
        description: "Gestionar plan y pagos",
        icon: Calendar,
        href: "/admin/suscripcion",
        color: "bg-blue-500 hover:bg-blue-600",
      },
      {
        title: "Configuración",
        description: "Moneda y ajustes del sistema",
        icon: Settings,
        href: "/configuracion",
        color: "bg-gray-500 hover:bg-gray-600",
      }
    ]
    : user?.role === 'SUPERVISOR'
      ? [
        ...menuItemsWithCaja,
        ...adminSupervisorItems,
        {
          title: "Gestión de Sueldos",
          description: "Pagos de sueldos y avances",
          icon: Crown,
          href: "/gestion-sueldos",
          color: "bg-yellow-500 hover:bg-yellow-600",
        }
      ]
      : menuItemsWithCaja

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#071313] transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#102525] shadow-sm border-b dark:border-[#34766D]">
        <div className="container-mobile">
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col items-center gap-8">
              <div className="relative w-12 h-12">
                {logoUrl ? (
                  <img
                    src={`/api/files/system/${encodeURIComponent(logoUrl)}`}
                    alt="B.&.D.S.C Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Image
                    src="/logo.png"
                    alt="B.&.D.S.C Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                )}
              </div>
              <h1 className="text-xs font-semibold text-gray-900 dark:text-[#F4FFFF]">B.&.D.S.C</h1>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />

              {/* Menu Desktop */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2 dark:text-[#F4FFFF] dark:hover:bg-[#173333]"
                      onClick={() => { }} // Ensure button is interactive
                    >
                      <User className="h-4 w-4" />
                      <span>{user?.firstName || user?.name || 'Usuario'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 dark:bg-[#102525] dark:border-[#34766D] dark:text-[#F4FFFF]">
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator className="dark:bg-[#34766D]" />
                    <DropdownMenuItem asChild>
                      <Link href="/perfil" className="flex items-center dark:hover:bg-[#173333]">
                        <User className="mr-2 h-4 w-4" />
                        <span>Mi Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/configuracion" className="flex items-center dark:hover:bg-[#173333]">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configuración</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="dark:bg-[#34766D]" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-red-600 focus:text-red-600 dark:hover:bg-[#173333]"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Menu Mobile */}
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="dark:text-[#F4FFFF]"
                >
                  {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="absolute top-[4.5rem] right-4 z-50 md:hidden w-64 bg-white dark:bg-[#102525] border dark:border-[#34766D] shadow-2xl rounded-xl animate-in slide-in-from-top-2 duration-200">
            <div className="p-2 space-y-1">
              <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-[#173333] rounded-lg">
                <User className="h-6 w-6 text-gray-400 dark:text-[#9CB7B2]" />
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-[#F4FFFF]">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-[#9CB7B2]">{user?.role}</p>
                </div>
              </div>

              <div className="space-y-0.5 py-1">
                <Link href="/perfil" className="flex items-center px-4 py-1.5 text-sm text-gray-700 dark:text-[#F4FFFF] hover:bg-gray-100 dark:hover:bg-[#173333] rounded-md">
                  <User className="mr-3 h-4 w-4" />
                  Mi Perfil
                </Link>
                <Link href="/configuracion" className="flex items-center px-4 py-1.5 text-sm text-gray-700 dark:text-[#F4FFFF] hover:bg-gray-100 dark:hover:bg-[#173333] rounded-md">
                  <Settings className="mr-3 h-4 w-4" />
                  Configuración
                </Link>
              </div>
              <div className="h-px bg-gray-200 dark:bg-[#34766D] my-1" />

              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-[#173333]"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="container-mobile py-8">
        {/* Bienvenida */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#F4FFFF] mb-2">
            ¡Bienvenido, {user?.firstName}!
          </h2>
          <p className="text-gray-600 dark:text-[#9CB7B2]">
            Selecciona una opción para continuar
          </p>
          <div className="mt-3 inline-flex items-center gap-2">
            {user?.role === 'ADMINISTRADOR' && <Crown className="h-4 w-4 text-red-600 dark:text-[#FF5C5C]" />}
            {user?.role === 'SUPERVISOR' && <Shield className="h-4 w-4 text-blue-600 dark:text-[#36E2C2]" />}
            {user?.role === 'COBRADOR' && <User className="h-4 w-4 text-green-600 dark:text-[#36E2C2]" />}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${user?.role === 'ADMINISTRADOR'
              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-[#FF5C5C]'
              : user?.role === 'SUPERVISOR'
                ? 'bg-blue-100 text-blue-800 dark:bg-teal-950/60 dark:text-[#36E2C2]'
                : 'bg-green-100 text-green-800 dark:bg-teal-950/60 dark:text-[#36E2C2]'
              }`}>
              {user?.role === 'ADMINISTRADOR' ? 'Administrador' :
                user?.role === 'SUPERVISOR' ? 'Supervisor' : 'Cobrador'}
            </span>
          </div>
        </div>

        {/* Menu Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group transform hover:scale-105 transition-all duration-200"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Card className="h-full card-shadow hover:card-shadow-hover transition-all duration-200 animate-fadeInScale dark:bg-[#102525] dark:border-[#34766D]">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F4FFFF] mb-1">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-[#9CB7B2]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Botón flotante para nuevo préstamo */}
        <div className="fixed bottom-8 right-8 z-50">
          <Link href="/prestamos/nuevo">
            <Button
              size="lg"
              className="w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-200 bg-red-500 hover:bg-red-600 flex items-center justify-center p-0"
              title="Crear Nuevo Préstamo"
            >
              <Plus className="h-10 w-10 text-white stroke-[3]" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

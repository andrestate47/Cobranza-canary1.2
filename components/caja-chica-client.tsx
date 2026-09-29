"use client"

import { Session } from "next-auth"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Plus,
  Minus,
  RefreshCw,
  Calendar,
  User,
  DollarSign,
  ArrowLeft,
  Landmark,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Target
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CajaChicaClientProps {
  session: Session
}

interface MovimientoItem {
  id: string
  tipo: string
  subtipo?: string
  monto: number
  capital?: number
  interes?: number
  descripcion?: string
  observaciones?: string
  fecha: string
  estado?: string
  cobradorId?: string
  cobrador?: string
  nombre?: string
  clienteNombre?: string
  asignadoPor?: string | null
}

interface BalanceData {
  balance: number
  totalEntregado: number
  totalGastado: number
  totalDevuelto: number
}

export default function CajaChicaClient({ session }: CajaChicaClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { format: formatCurrency } = useCurrency()
  const user = session?.user
  const isCobrador = user?.role === 'COBRADOR'

  // Estados de datos
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([])
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [totalesGlobales, setTotalesGlobales] = useState<any>(null)
  const [cobradoresResumen, setCobradoresResumen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cobradores, setCobradores] = useState<any[]>([])
  
  // Filtros
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("")
  const [filtroFechaFin, setFiltroFechaFin] = useState("")
  const [filtroCobrador, setFiltroCobrador] = useState("all")
  const [activeTab, setActiveTab] = useState<"all" | "INGRESO" | "RETIRO" | "COBRO" | "PRESTAMO">("all")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Modales de acciones
  const [openAsignarDialog, setOpenAsignarDialog] = useState(false)
  const [openMovimientoDialog, setOpenMovimientoDialog] = useState(false)
  const [tipoMovimiento, setTipoMovimiento] = useState<"GASTO" | "INGRESO" | "EGRESO">("INGRESO")

  // Forms state
  const [asignarData, setAsignarData] = useState({
    cobradorId: "",
    monto: "",
    descripcion: "",
    fecha: ""
  })

  const [movimientoData, setMovimientoData] = useState({
    monto: "",
    descripcion: "",
    fecha: ""
  })

  useEffect(() => {
    cargarDatos()
    if (!isCobrador) {
      cargarCobradores()
    }
  }, [filtroFechaInicio, filtroFechaFin])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroFechaInicio) params.append("fechaInicio", filtroFechaInicio)
      if (filtroFechaFin) params.append("fechaFin", filtroFechaFin)
      const queryStr = params.toString() ? `?${params.toString()}` : ""

      const endpoint = isCobrador 
        ? `/api/caja-chica${queryStr}` 
        : `/api/caja-chica/todos${queryStr}`
      const response = await fetch(endpoint)
      
      if (!response.ok) throw new Error("Error al cargar datos")
      
      const data = await response.json()
      
      if (isCobrador) {
        setBalance(data.balance)
        setMovimientos(data.movimientos || [])
      } else {
        setMovimientos(data.movimientosRecientes || (Array.isArray(data) ? data : []))
        setTotalesGlobales(data.totalesGlobales || null)
        setCobradoresResumen(data.cobradores || [])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de caja",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarCobradores = async () => {
    try {
      const response = await fetch("/api/usuarios?role=COBRADOR")
      if (!response.ok) throw new Error("Error al cargar cobradores")
      const data = await response.json()
      setCobradores(data)
    } catch (error) {
      console.error("Error cargando cobradores:", error)
    }
  }

  const handleAsignarEfectivo = async () => {
    if (!asignarData.cobradorId || !asignarData.monto) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ENTREGADO",
          monto: parseFloat(asignarData.monto),
          descripcion: asignarData.descripcion,
          fecha: asignarData.fecha || undefined,
          cobradorId: asignarData.cobradorId
        })
      })

      if (!response.ok) throw new Error("Error al ingresar/asignar efectivo")

      toast({
        title: "Éxito",
        description: "Efectivo ingresado correctamente"
      })

      setOpenAsignarDialog(false)
      setAsignarData({ cobradorId: "", monto: "", descripcion: "", fecha: "" })
      cargarDatos()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo realizar el ingreso",
        variant: "destructive"
      })
    }
  }

  const handleRegistrarMovimiento = async () => {
    if (!movimientoData.monto) {
      toast({
        title: "Error",
        description: "Debe ingresar un monto",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoMovimiento,
          monto: parseFloat(movimientoData.monto),
          descripcion: movimientoData.descripcion,
          fecha: movimientoData.fecha || undefined,
          cobradorId: user?.id
        })
      })

      if (!response.ok) throw new Error("Error al registrar movimiento")

      toast({
        title: "Éxito",
        description: "Movimiento registrado correctamente"
      })

      setOpenMovimientoDialog(false)
      setMovimientoData({ monto: "", descripcion: "", fecha: "" })
      cargarDatos()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el movimiento",
        variant: "destructive"
      })
    }
  }

  // Filtrado dinámico de la lista de movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(mov => {
      // Filtro por Cobrador
      if (filtroCobrador !== "all" && mov.cobradorId !== filtroCobrador) return false

      // Filtro por Tab de Tipo
      if (activeTab === "INGRESO") {
        return ["INGRESO", "ENTREGA", "ENTREGADO", "APERTURA_CAJA"].includes(mov.tipo)
      }
      if (activeTab === "RETIRO") {
        return ["RETIRO", "EGRESO", "EGRESO_GENERAL", "GASTO", "GASTADO", "DEVOLUCION", "DEVUELTO"].includes(mov.tipo)
      }
      if (activeTab === "COBRO") {
        return mov.tipo === "COBRO"
      }
      if (activeTab === "PRESTAMO") {
        return mov.tipo === "PRESTAMO"
      }

      return true
    })
  }, [movimientos, filtroCobrador, activeTab])

  // Métricas calculadas para coincidir exactamente con el diseño
  const saldoDisponible = totalesGlobales?.saldoCajaCentral ?? balance?.balance ?? 0
  const capitalIngresado = totalesGlobales?.capitalInvertidoTotal ?? balance?.totalEntregado ?? 0
  const totalRetirado = (totalesGlobales?.totalGastosGlobal || 0) + (totalesGlobales?.totalEgresosGenerales || 0)
  const totalPrestado = totalesGlobales?.totalPrestadoGlobal ?? capitalIngresado
  const totalCobrado = totalesGlobales?.totalCobradoGlobal ?? 0

  const capitalRecuperado = totalesGlobales?.capitalRecuperadoGlobal ?? (totalCobrado * 0.85)
  const interesGanado = totalesGlobales?.interesGanadoGlobal ?? (totalCobrado * 0.15)
  const balanceCobradoMenosPrestado = totalesGlobales?.balanceCobradoMenosPrestado ?? (totalCobrado - totalPrestado)

  const exportarReporte = () => {
    const csv = [
      ["Fecha", "Nombre / Origen", "Tipo", "Monto", "Capital", "Interés", "Descripción"],
      ...movimientosFiltrados.map(mov => [
        format(new Date(mov.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        mov.nombre || mov.clienteNombre || mov.cobrador || "",
        mov.tipo,
        mov.monto.toFixed(2),
        mov.capital ? mov.capital.toFixed(2) : "",
        mov.interes ? mov.interes.toFixed(2) : "",
        mov.descripcion || mov.observaciones || ""
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `movimientos-caja-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#071313] text-foreground transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* 1. Header Superior */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 rounded-full border-gray-200 dark:border-gray-800 bg-white dark:bg-[#102525]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Movimientos
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                Seguimiento de capital, cobros y caja
              </p>
            </div>
          </div>

          {/* Botones de acción principales */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportarReporte}
              className="rounded-full border-gray-200 dark:border-gray-800 bg-white dark:bg-[#102525] text-gray-700 dark:text-gray-200 font-semibold px-4 h-9 shadow-sm hover:bg-gray-50"
            >
              <Download className="mr-1.5 h-4 w-4 text-gray-500" />
              Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isCobrador) {
                  setTipoMovimiento("EGRESO")
                  setOpenMovimientoDialog(true)
                } else {
                  setTipoMovimiento("EGRESO")
                  setOpenMovimientoDialog(true)
                }
              }}
              className="rounded-full border-red-200 dark:border-red-900/50 bg-white dark:bg-[#102525] text-red-600 dark:text-red-400 font-semibold px-4 h-9 shadow-sm hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Minus className="mr-1.5 h-4 w-4 rounded-full border border-red-600 p-0.5" />
              Retirar
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (isCobrador) {
                  setTipoMovimiento("INGRESO")
                  setOpenMovimientoDialog(true)
                } else {
                  setOpenAsignarDialog(true)
                }
              }}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 h-9 shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Ingresar
            </Button>
          </div>
        </div>

        {/* 2. Banner de Saldo Disponible en Caja */}
        <div className="bg-[#eaf7f1] dark:bg-[#0c2b23] border border-emerald-100 dark:border-[#184d3e] p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
          {/* Label e icono wallet */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300 tracking-wide">
              Saldo disponible en caja
            </span>
          </div>

          {/* Hero Amount */}
          <div className="text-4xl sm:text-5xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
            {formatCurrency(saldoDisponible)}
          </div>

          {/* 4 Cards de estadísticas internas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
            {/* Capital Ingresado */}
            <div className="bg-white dark:bg-[#102525] rounded-2xl p-4 shadow-sm border border-emerald-100/60 dark:border-[#1F3A36] space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block text-center">
                Capital Ingresado
              </span>
              <span className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400 block text-center truncate">
                +{formatCurrency(capitalIngresado)}
              </span>
            </div>

            {/* Retirado */}
            <div className="bg-white dark:bg-[#102525] rounded-2xl p-4 shadow-sm border border-emerald-100/60 dark:border-[#1F3A36] space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block text-center">
                Retirado
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-600 dark:text-slate-300 block text-center truncate">
                -{formatCurrency(totalRetirado)}
              </span>
            </div>

            {/* Prestado */}
            <div className="bg-white dark:bg-[#102525] rounded-2xl p-4 shadow-sm border border-emerald-100/60 dark:border-[#1F3A36] space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block text-center">
                Prestado
              </span>
              <span className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 block text-center truncate">
                -{formatCurrency(totalPrestado)}
              </span>
            </div>

            {/* Cobrado */}
            <div className="bg-white dark:bg-[#102525] rounded-2xl p-4 shadow-sm border border-emerald-100/60 dark:border-[#1F3A36] space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block text-center">
                Cobrado
              </span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 block text-center truncate">
                +{formatCurrency(totalCobrado)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Fila de 3 Tarjetas Secundarias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Capital recuperado */}
          <div className="bg-white dark:bg-[#102525] border border-gray-100 dark:border-[#1F3A36] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold">
              <Landmark className="h-4 w-4 text-blue-600" />
              <span>Capital recuperado</span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {formatCurrency(capitalRecuperado)}
            </div>
          </div>

          {/* Interés ganado */}
          <div className="bg-white dark:bg-[#102525] border border-gray-100 dark:border-[#1F3A36] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold">
              <TrendingUp className="h-4 w-4 text-rose-600" />
              <span>Interés ganado</span>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {formatCurrency(interesGanado)}
            </div>
          </div>

          {/* Balance cobrado - prestado */}
          <div className="bg-[#fdf2f2] dark:bg-[#2d1217] border border-rose-100 dark:border-rose-900/40 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-xs font-semibold">
              <DollarSign className="h-4 w-4 text-rose-600" />
              <span>Balance cobrado - prestado</span>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {balanceCobradoMenosPrestado < 0 ? "-" : "+"}{formatCurrency(Math.abs(balanceCobradoMenosPrestado))}
            </div>
          </div>
        </div>

        {/* Bar de Filtros Avanzados (Opcional colapsable) */}
        {showAdvancedFilters && (
          <div className="bg-white dark:bg-[#102525] border border-gray-200 dark:border-[#1F3A36] rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filtroFechaInicio}
                  onChange={(e) => setFiltroFechaInicio(e.target.value)}
                  className="mt-1 h-9 cursor-pointer"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Fecha Fin</Label>
                <Input
                  type="date"
                  value={filtroFechaFin}
                  onChange={(e) => setFiltroFechaFin(e.target.value)}
                  className="mt-1 h-9 cursor-pointer"
                />
              </div>
              {!isCobrador && (
                <div>
                  <Label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Cobrador / Ruta</Label>
                  <Select value={filtroCobrador} onValueChange={setFiltroCobrador}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cobradores</SelectItem>
                      {cobradores.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre} {c.numeroRuta ? `(Ruta ${c.numeroRuta})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiltroFechaInicio("")
                  setFiltroFechaFin("")
                  setFiltroCobrador("all")
                }}
                className="text-xs text-gray-500"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        )}

        {/* 4. Tab Bar de Filtros de Píldora + Contador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {/* Píldoras de Filtro */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all shrink-0 ${
                activeTab === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-[#102525] border border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              Todos
            </button>

            <button
              onClick={() => setActiveTab("INGRESO")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all shrink-0 ${
                activeTab === "INGRESO"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-[#102525] border border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              Ingresos caja
            </button>

            <button
              onClick={() => setActiveTab("RETIRO")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all shrink-0 ${
                activeTab === "RETIRO"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-[#102525] border border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              Retiros
            </button>

            <button
              onClick={() => setActiveTab("COBRO")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all shrink-0 ${
                activeTab === "COBRO"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-[#102525] border border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              Cobros
            </button>

            <button
              onClick={() => setActiveTab("PRESTAMO")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all shrink-0 ${
                activeTab === "PRESTAMO"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-[#102525] border border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              Préstamos
            </button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="rounded-full border border-gray-200 dark:border-[#1F3A36] shrink-0"
              title="Filtros avanzados por fecha y cobrador"
            >
              <Filter className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </Button>
          </div>

          {/* Contador de Movimientos */}
          <div className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500 self-end sm:self-auto">
            {movimientosFiltrados.length} movimientos
          </div>
        </div>

        {/* 5. Lista de Movimientos en Tarjetas Elegantes */}
        <div className="space-y-3">
          {movimientosFiltrados.length === 0 ? (
            <div className="bg-white dark:bg-[#102525] border border-gray-100 dark:border-[#1F3A36] rounded-2xl p-12 text-center text-gray-400">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-600 dark:text-gray-300">No hay movimientos registrados</p>
              <p className="text-xs text-gray-400 mt-1">Los cobros, créditos y entradas de caja aparecerán aquí</p>
            </div>
          ) : (
            movimientosFiltrados.map((mov) => {
              const esCobro = mov.tipo === "COBRO"
              const esPrestamo = mov.tipo === "PRESTAMO"
              const esIngreso = ["INGRESO", "ENTREGA", "ENTREGADO", "APERTURA_CAJA"].includes(mov.tipo)
              const esPositivo = esCobro || esIngreso

              let titleName = "Movimiento de Caja"
              if (typeof mov.nombre === 'string' && mov.nombre.trim()) {
                titleName = mov.nombre
              } else if (typeof mov.clienteNombre === 'string' && mov.clienteNombre.trim()) {
                titleName = mov.clienteNombre
              } else if (typeof mov.cobrador === 'string' && mov.cobrador.trim()) {
                titleName = mov.cobrador
              } else if (mov.cobrador && typeof mov.cobrador === 'object') {
                const cObj = mov.cobrador as any
                titleName = `${cObj.nombre || cObj.firstName || ''} ${cObj.apellido || cObj.lastName || ''}`.trim() || "Movimiento de Caja"
              }

              const subtitleText = mov.subtipo || (
                esCobro ? "Pago recibido" :
                esPrestamo ? "Préstamo otorgado" :
                esIngreso ? "Ingreso de caja" : "Retiro / Egreso de caja"
              )

              return (
                <div
                  key={mov.id}
                  className="bg-white dark:bg-[#102525] border border-gray-100 dark:border-[#1F3A36] rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
                >
                  {/* Lado Izquierdo: Icono + Detalles */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Circle Icon Badge */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                      esPositivo 
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" 
                        : "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                    }`}>
                      {esCobro ? <Target className="h-5 w-5" /> :
                       esPrestamo ? <DollarSign className="h-5 w-5" /> :
                       esPositivo ? <TrendingUp className="h-5 w-5" /> :
                       <TrendingDown className="h-5 w-5" />}
                    </div>

                    {/* Info text */}
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-extrabold text-gray-900 dark:text-white text-base truncate leading-snug">
                        {titleName}
                      </h3>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-gray-400 dark:text-gray-500 font-medium">
                          {subtitleText}
                        </span>

                        {/* Badges de Desglose de Capital e Interés si es cobro */}
                        {esCobro && (mov.capital !== undefined || mov.interes !== undefined) && (
                          <div className="flex items-center gap-1.5 ml-1">
                            {mov.capital !== undefined && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                                Capital: {formatCurrency(mov.capital)}
                              </span>
                            )}
                            {mov.interes !== undefined && mov.interes > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                                Interés: {formatCurrency(mov.interes)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Descripción extra si aplica */}
                        {!esCobro && mov.descripcion && (
                          <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            • {mov.descripcion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lado Derecho: Monto + Fecha */}
                  <div className="text-right shrink-0">
                    <div className={`text-base sm:text-lg font-extrabold ${
                      esPositivo 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {esPositivo ? "+" : "-"}{formatCurrency(mov.monto)}
                    </div>
                    <div className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                      {format(new Date(mov.fecha), "d MMM yyyy HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Modal Asignar / Ingresar Efectivo */}
      <Dialog open={openAsignarDialog} onOpenChange={setOpenAsignarDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ingresar / Asignar Efectivo a Caja</DialogTitle>
            <DialogDescription>
              Registra la entrada de efectivo a la caja o cobrador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Cobrador / Destino</Label>
              <Select 
                value={asignarData.cobradorId} 
                onValueChange={(value) => setAsignarData({...asignarData, cobradorId: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccione cobrador" />
                </SelectTrigger>
                <SelectContent>
                  {cobradores.map(cobrador => (
                    <SelectItem key={cobrador.id} value={cobrador.id}>
                      {cobrador.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Monto</Label>
              <Input
                type="number"
                step="0.01"
                value={asignarData.monto}
                onChange={(e) => setAsignarData({...asignarData, monto: e.target.value})}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Fecha (Opcional - hoy por defecto)</Label>
              <Input
                type="date"
                value={asignarData.fecha}
                onChange={(e) => setAsignarData({...asignarData, fecha: e.target.value})}
                className="mt-1 cursor-pointer"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Descripción / Observación</Label>
              <Textarea
                value={asignarData.descripcion}
                onChange={(e) => setAsignarData({...asignarData, descripcion: e.target.value})}
                placeholder="Motivo del ingreso..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAsignarDialog(false)} className="rounded-full">
              Cancelar
            </Button>
            <Button onClick={handleAsignarEfectivo} className="rounded-full bg-emerald-600 hover:bg-emerald-700">
              Ingresar Efectivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Movimiento (Ingreso / Egreso / Gasto) */}
      <Dialog open={openMovimientoDialog} onOpenChange={setOpenMovimientoDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {tipoMovimiento === "INGRESO" ? "Ingresar Efectivo" : "Retirar / Registrar Egreso"}
            </DialogTitle>
            <DialogDescription>
              {tipoMovimiento === "INGRESO" ? "Registra una entrada de dinero a la caja" : "Registra un retiro o gasto de efectivo de la caja"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Monto</Label>
              <Input
                type="number"
                step="0.01"
                value={movimientoData.monto}
                onChange={(e) => setMovimientoData({...movimientoData, monto: e.target.value})}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Fecha del movimiento (Opcional - hoy por defecto)</Label>
              <Input
                type="date"
                value={movimientoData.fecha}
                onChange={(e) => setMovimientoData({...movimientoData, fecha: e.target.value})}
                className="mt-1 cursor-pointer"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Motivo / Descripción</Label>
              <Textarea
                value={movimientoData.descripcion}
                onChange={(e) => setMovimientoData({...movimientoData, descripcion: e.target.value})}
                placeholder={tipoMovimiento === "INGRESO" ? "Motivo del ingreso..." : "Ej. Retiro de caja, gasto de viáticos, gasolina..."}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMovimientoDialog(false)} className="rounded-full">
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarMovimiento} 
              className={`rounded-full ${
                tipoMovimiento === "INGRESO" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              Registrar {tipoMovimiento === "INGRESO" ? "Ingreso" : "Retiro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

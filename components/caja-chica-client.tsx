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
  Target,
  BarChart3,
  Trash2
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import dynamic from "next/dynamic"

const ReporteCobradores = dynamic(() => import("@/components/reporte-cobradores"), { ssr: false })
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
  const isAdminOrSupervisor = user?.role === 'ADMINISTRADOR' || user?.role === 'SUPERVISOR'
  const isCobrador = !isAdminOrSupervisor

  // Tab Principal: Movimientos o Reporte Cobradores
  const [mainTab, setMainTab] = useState<"movimientos" | "reporte">("movimientos")

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
  const [openIngresoDialog, setOpenIngresoDialog] = useState(false)
  const [openRetiroDialog, setOpenRetiroDialog] = useState(false)
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false)
  const [movimientoAEliminar, setMovimientoAEliminar] = useState<MovimientoItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Forms state
  const [ingresoData, setIngresoData] = useState({
    monto: "",
    cobradorId: "",
    descripcion: "",
    fecha: ""
  })

  const [retiroData, setRetiroData] = useState({
    tipoAccion: "EGRESO" as "EGRESO" | "GASTO",
    monto: "",
    cobradorId: "",
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
        setMovimientos(data.movimientosRecientes || data.movimientos || [])
        setTotalesGlobales(data.totalesGlobales || null)
      } else {
        setMovimientos(data.movimientosRecientes || (Array.isArray(data) ? data : []))
        setTotalesGlobales(data.totalesGlobales || null)
        const list = data.cobradores || []
        setCobradoresResumen(list)
        setCobradores(list)
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

  const handleRegistrarIngreso = async () => {
    if (!ingresoData.monto) {
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
          tipo: ingresoData.cobradorId ? "ENTREGADO" : "INGRESO",
          monto: parseFloat(ingresoData.monto),
          descripcion: ingresoData.descripcion,
          fecha: ingresoData.fecha || undefined,
          cobradorId: ingresoData.cobradorId || undefined
        })
      })

      if (!response.ok) throw new Error("Error al registrar ingreso")

      toast({
        title: "Éxito",
        description: "Ingreso registrado correctamente"
      })

      setOpenIngresoDialog(false)
      setIngresoData({ cobradorId: "", monto: "", descripcion: "", fecha: "" })
      cargarDatos()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo realizar el ingreso",
        variant: "destructive"
      })
    }
  }

  const handleRegistrarRetiro = async () => {
    if (!retiroData.monto) {
      toast({
        title: "Error",
        description: "Debe ingresar un monto",
        variant: "destructive"
      })
      return
    }

    try {
      const tipoFinal = retiroData.tipoAccion === "GASTO"
        ? "GASTO"
        : (retiroData.cobradorId ? "EGRESO" : "EGRESO_GENERAL")

      const response = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoFinal,
          monto: parseFloat(retiroData.monto),
          descripcion: retiroData.descripcion,
          fecha: retiroData.fecha || undefined,
          cobradorId: retiroData.cobradorId || undefined
        })
      })

      if (!response.ok) throw new Error("Error al registrar retiro/gasto")

      toast({
        title: "Éxito",
        description: retiroData.tipoAccion === "GASTO" 
          ? "Gasto registrado correctamente" 
          : "Retiro registrado correctamente"
      })

      setOpenRetiroDialog(false)
      setRetiroData({ tipoAccion: "EGRESO", cobradorId: "", monto: "", descripcion: "", fecha: "" })
      cargarDatos()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el retiro/gasto",
        variant: "destructive"
      })
    }
  }

  const handleConfirmarEliminacion = async () => {
    if (!movimientoAEliminar) return
    try {
      setDeleting(true)
      const id = movimientoAEliminar.id
      let endpoint = `/api/caja-chica/${id}`

      if (id.startsWith("pago-")) {
        endpoint = `/api/pagos/${id.replace("pago-", "")}`
      } else if (id.startsWith("prestamo-")) {
        endpoint = `/api/prestamos/${id.replace("prestamo-", "")}`
      } else if (id.startsWith("gasto-")) {
        endpoint = `/api/gastos/${id.replace("gasto-", "")}`
      }

      const response = await fetch(endpoint, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "No se pudo eliminar el movimiento")
      }

      toast({
        title: "Movimiento eliminado",
        description: "El registro ha sido eliminado correctamente de la caja"
      })

      setOpenConfirmDelete(false)
      setMovimientoAEliminar(null)
      cargarDatos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el movimiento",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
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
        return ["RETIRO", "EGRESO", "EGRESO_GENERAL", "GASTO", "GASTADO", "DEVOLUCION", "DEVUELTO", "PAGO_SUELDO"].includes(mov.tipo)
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
  const cobradorSeleccionadoData = useMemo(() => {
    if (filtroCobrador === "all") return null
    return cobradoresResumen.find(c => c.id === filtroCobrador) || null
  }, [filtroCobrador, cobradoresResumen])

  // Movimientos pertenecientes al cobrador seleccionado (o todos)
  const movsCobrador = useMemo(() => {
    if (filtroCobrador === "all") return movimientos
    return movimientos.filter(m => m.cobradorId === filtroCobrador)
  }, [filtroCobrador, movimientos])

  const capitalIngresadoCobrador = useMemo(() => {
    if (filtroCobrador === "all") return 0
    return movsCobrador
      .filter(m => ["INGRESO", "ENTREGA", "ENTREGADO", "APERTURA_CAJA"].includes(m.tipo))
      .reduce((sum, m) => sum + m.monto, 0)
  }, [filtroCobrador, movsCobrador])

  const totalRetiradoCobrador = useMemo(() => {
    if (filtroCobrador === "all") return 0
    return movsCobrador
      .filter(m => ["RETIRO", "EGRESO", "GASTO", "GASTADO", "DEVOLUCION", "DEVUELTO", "PAGO_SUELDO"].includes(m.tipo))
      .reduce((sum, m) => sum + m.monto, 0)
  }, [filtroCobrador, movsCobrador])

  const totalPrestadoCobrador = useMemo(() => {
    if (filtroCobrador === "all") return 0
    return movsCobrador
      .filter(m => m.tipo === "PRESTAMO")
      .reduce((sum, m) => sum + m.monto, 0)
  }, [filtroCobrador, movsCobrador])

  const totalCobradoCobrador = useMemo(() => {
    if (filtroCobrador === "all") return 0
    return movsCobrador
      .filter(m => m.tipo === "COBRO")
      .reduce((sum, m) => sum + m.monto, 0)
  }, [filtroCobrador, movsCobrador])

  const capitalRecuperadoCobrador = useMemo(() => {
    if (filtroCobrador === "all") return 0
    return movsCobrador
      .filter(m => m.tipo === "COBRO")
      .reduce((sum, m) => sum + (m.capital || m.monto), 0)
  }, [filtroCobrador, movsCobrador])

  const interesGanadoCobrador = useMemo(() => {
    if (filtroCobrador === "all") return 0
    return movsCobrador
      .filter(m => m.tipo === "COBRO")
      .reduce((sum, m) => sum + (m.interes || 0), 0)
  }, [filtroCobrador, movsCobrador])

  // Asignar las métricas de forma condicional: Si se seleccionó un cobrador, usar sus datos específicos; si no, usar totales globales
  const saldoDisponible = cobradorSeleccionadoData
    ? cobradorSeleccionadoData.saldoActual
    : (totalesGlobales?.saldoCajaCentral ?? balance?.balance ?? 0)

  const capitalIngresado = cobradorSeleccionadoData
    ? (capitalIngresadoCobrador || cobradorSeleccionadoData.cobradoDia)
    : (totalesGlobales?.capitalInvertidoTotal ?? balance?.totalEntregado ?? 0)

  const totalRetirado = cobradorSeleccionadoData
    ? (totalRetiradoCobrador || cobradorSeleccionadoData.gastosDia)
    : ((totalesGlobales?.totalGastosGlobal || 0) + (totalesGlobales?.totalEgresosGenerales || 0))

  const totalPrestado = cobradorSeleccionadoData
    ? (totalPrestadoCobrador || cobradorSeleccionadoData.prestadoDia)
    : (totalesGlobales?.totalPrestadoGlobal ?? 0)

  const totalCobrado = cobradorSeleccionadoData
    ? (totalCobradoCobrador || cobradorSeleccionadoData.cobradoDia)
    : (totalesGlobales?.totalCobradoGlobal ?? 0)

  const capitalRecuperado = cobradorSeleccionadoData
    ? capitalRecuperadoCobrador
    : (totalesGlobales?.capitalRecuperadoGlobal ?? 0)

  const interesGanado = cobradorSeleccionadoData
    ? interesGanadoCobrador
    : (totalesGlobales?.interesGanadoGlobal ?? 0)

  const balanceCobradoMenosPrestado = cobradorSeleccionadoData
    ? (totalCobrado - totalPrestado)
    : (totalesGlobales?.balanceCobradoMenosPrestado ?? (totalCobrado - totalPrestado))

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
                Caja
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

            {!isCobrador && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRetiroData({
                      tipoAccion: "EGRESO",
                      monto: "",
                      cobradorId: filtroCobrador !== "all" ? filtroCobrador : "",
                      fecha: "",
                      descripcion: ""
                    })
                    setOpenRetiroDialog(true)
                  }}
                  className="rounded-full border-red-200 dark:border-red-900/50 bg-white dark:bg-[#102525] text-red-600 dark:text-red-400 font-semibold px-4 h-9 shadow-sm hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Minus className="mr-1.5 h-4 w-4 rounded-full border border-red-600 p-0.5" />
                  Retirar
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setIngresoData({
                      monto: "",
                      cobradorId: filtroCobrador !== "all" ? filtroCobrador : "",
                      fecha: "",
                      descripcion: ""
                    })
                    setOpenIngresoDialog(true)
                  }}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 h-9 shadow-sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ingresar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 2. Tabs de Navegación Principal (Movimientos | Reporte Cobradores) */}
        <div className="grid grid-cols-2 gap-2 border-b border-gray-200 dark:border-[#1F3A36] pb-3 w-full">
          <button
            onClick={() => setMainTab("movimientos")}
            className={`w-full py-2 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center min-w-0 ${
              mainTab === "movimientos"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white dark:bg-[#102525] border border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#152e2a]"
            }`}
          >
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="whitespace-nowrap">Movimientos</span>
          </button>

          <button
            onClick={() => setMainTab("reporte")}
            className={`w-full py-2 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center min-w-0 ${
              mainTab === "reporte"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white dark:bg-[#102525] border border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#152e2a]"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="whitespace-nowrap">Reporte Cobradores</span>
          </button>
        </div>

        {mainTab === "reporte" ? (
          <ReporteCobradores userRole={user?.role} />
        ) : (
          <>
            {/* 3. Banner de Saldo en Caja */}
            <div className="bg-[#eaf7f1] dark:bg-[#0c2b23] border border-emerald-100 dark:border-[#184d3e] p-5 sm:p-7 rounded-3xl space-y-4 shadow-sm">
              {/* Label e icono wallet + Selector de Cobrador para Admin */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300 tracking-wide">
                    {cobradorSeleccionadoData ? `Caja (${cobradorSeleccionadoData.nombre})` : "Caja"}
                  </span>
                </div>

                {!isCobrador && (
                  <div className="flex items-center gap-2">
                    <Select value={filtroCobrador} onValueChange={setFiltroCobrador}>
                      <SelectTrigger className="h-9 min-w-[210px] bg-white dark:bg-[#102525] border-emerald-200 dark:border-[#1F3A36] text-xs font-semibold shadow-sm">
                        <SelectValue placeholder="Filtrar por Cobrador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Caja General (Todos)</SelectItem>
                        {(cobradores.length > 0 ? cobradores : cobradoresResumen).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre} {c.numeroRuta ? `(Ruta ${c.numeroRuta})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Hero Amount */}
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight break-all">
                {formatCurrency(saldoDisponible)}
              </div>

              {/* 4 Cards de estadísticas internas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 pt-2">
                {/* Capital Ingresado */}
                <div className="bg-white dark:bg-[#102525] rounded-2xl p-2.5 sm:p-4 shadow-sm border border-emerald-100/60 dark:border-[#1F3A36] space-y-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 block text-center leading-tight whitespace-normal">
                    Capital Ingresado
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-400 block text-center tracking-tight whitespace-nowrap sm:whitespace-normal">
                    +{formatCurrency(capitalIngresado)}
                  </span>
                </div>

                {/* Retirado */}
                <div className="bg-white dark:bg-[#102525] rounded-2xl p-2.5 sm:p-4 shadow-sm border border-emerald-100/60 dark:border-[#1F3A36] space-y-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 block text-center leading-tight whitespace-normal">
                    Retirado
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-600 dark:text-slate-300 block text-center tracking-tight whitespace-nowrap sm:whitespace-normal">
                    -{formatCurrency(totalRetirado)}
                  </span>
                </div>

                {/* Prestado */}
                <div className="bg-white dark:bg-[#102525] rounded-2xl p-2.5 sm:p-4 shadow-sm border border-emerald-100/60 dark:border-[#1F3A36] space-y-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 block text-center leading-tight whitespace-normal">
                    Prestado
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400 block text-center tracking-tight whitespace-nowrap sm:whitespace-normal">
                    -{formatCurrency(totalPrestado)}
                  </span>
                </div>

                {/* Cobrado */}
                <div className="bg-white dark:bg-[#102525] rounded-2xl p-2.5 sm:p-4 shadow-sm border border-emerald-100/60 dark:border-[#1F3A36] space-y-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 block text-center leading-tight whitespace-normal">
                    Cobrado
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block text-center tracking-tight whitespace-nowrap sm:whitespace-normal">
                    +{formatCurrency(totalCobrado)}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Fila de 3 Tarjetas Secundarias */}
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
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>Interés ganado</span>
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
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

            {/* 4.5 Sección Visual de Cobradores (Solo para Admin / Supervisor) */}
            {!isCobrador && cobradoresResumen.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    <span>Cobradores y Rutas ({cobradoresResumen.length})</span>
                  </h3>
                  {filtroCobrador !== "all" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiltroCobrador("all")}
                      className="text-xs text-emerald-600 hover:text-emerald-700 p-0 h-auto font-semibold"
                    >
                      Ver caja general
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cobradoresResumen.map(cobrador => {
                    const isSelected = filtroCobrador === cobrador.id
                    return (
                      <div
                        key={cobrador.id}
                        onClick={() => setFiltroCobrador(isSelected ? "all" : cobrador.id)}
                        className={`cursor-pointer rounded-2xl p-4 border transition-all space-y-2 ${
                          isSelected
                            ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                            : "bg-white dark:bg-[#102525] border-gray-200 dark:border-[#1F3A36] hover:border-emerald-300 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                              {cobrador.numeroRuta ? `R${cobrador.numeroRuta}` : 'C'}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {cobrador.nombre}
                              </p>
                              {cobrador.numeroRuta && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                  Ruta {cobrador.numeroRuta}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant={isSelected ? "default" : "outline"} className="text-[10px] shrink-0">
                            {isSelected ? "Filtro activo" : "Ver caja"}
                          </Badge>
                        </div>

                        <div className="pt-1 flex items-baseline justify-between border-t border-gray-100 dark:border-gray-800">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            Saldo disponible:
                          </span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(cobrador.saldoActual || 0)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

            {/* 5. Tab Bar de Filtros de Píldora + Contador */}
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

            {/* 6. Lista de Movimientos en Tarjetas Elegantes */}
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

                      {/* Lado Derecho: Monto + Fecha + Botón Eliminar */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
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

                        {!isCobrador && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setMovimientoAEliminar(mov)
                              setOpenConfirmDelete(true)
                            }}
                            className="rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 h-8 w-8 shrink-0 transition-colors"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

      </div>

      {/* Modal Ingresar Efectivo / Subir Ingresos */}
      <Dialog open={openIngresoDialog} onOpenChange={setOpenIngresoDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Plus className="h-5 w-5" />
              Ingresar Efectivo a Caja
            </DialogTitle>
            <DialogDescription>
              Registra la entrada o aporte de dinero a la caja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Monto ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={ingresoData.monto}
                onChange={(e) => setIngresoData({...ingresoData, monto: e.target.value})}
                placeholder="0.00"
                className="mt-1 font-bold text-lg"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Fecha (Opcional - hoy por defecto)</Label>
              <Input
                type="date"
                value={ingresoData.fecha}
                onChange={(e) => setIngresoData({...ingresoData, fecha: e.target.value})}
                className="mt-1 cursor-pointer"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Motivo / Descripción</Label>
              <Textarea
                value={ingresoData.descripcion}
                onChange={(e) => setIngresoData({...ingresoData, descripcion: e.target.value})}
                placeholder="Ej. Aporte de capital, depósito inicial, ingreso de efectivo..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIngresoDialog(false)} className="rounded-full">
              Cancelar
            </Button>
            <Button onClick={handleRegistrarIngreso} className="rounded-full bg-emerald-600 hover:bg-emerald-700">
              Ingresar Efectivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Retirar Dinero / Registrar Egreso o Gasto */}
      <Dialog open={openRetiroDialog} onOpenChange={setOpenRetiroDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Minus className="h-5 w-5" />
              Retirar Dinero / Egreso o Gasto
            </DialogTitle>
            <DialogDescription>
              Sacar efectivo de la caja o registrar un gasto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Tipo de Operación</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRetiroData({ ...retiroData, tipoAccion: "EGRESO" })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                    retiroData.tipoAccion === "EGRESO"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white dark:bg-[#102525] border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Sacar Dinero (Retiro)
                </button>
                <button
                  type="button"
                  onClick={() => setRetiroData({ ...retiroData, tipoAccion: "GASTO" })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                    retiroData.tipoAccion === "GASTO"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white dark:bg-[#102525] border-gray-200 dark:border-[#1F3A36] text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Agregar Gasto
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Monto ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={retiroData.monto}
                onChange={(e) => setRetiroData({...retiroData, monto: e.target.value})}
                placeholder="0.00"
                className="mt-1 font-bold text-lg"
              />
            </div>



            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Fecha (Opcional - hoy por defecto)</Label>
              <Input
                type="date"
                value={retiroData.fecha}
                onChange={(e) => setRetiroData({...retiroData, fecha: e.target.value})}
                className="mt-1 cursor-pointer"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Motivo / Descripción</Label>
              <Textarea
                value={retiroData.descripcion}
                onChange={(e) => setRetiroData({...retiroData, descripcion: e.target.value})}
                placeholder={retiroData.tipoAccion === "GASTO" ? "Ej. Gasolina, viáticos, repuestos..." : "Ej. Retiro de caja, banco..."}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRetiroDialog(false)} className="rounded-full">
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarRetiro} 
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white"
            >
              Registrar {retiroData.tipoAccion === "GASTO" ? "Gasto" : "Retiro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación de Movimiento */}
      <Dialog open={openConfirmDelete} onOpenChange={setOpenConfirmDelete}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar movimiento de caja?
            </DialogTitle>
            <DialogDescription>
              {movimientoAEliminar && (
                <span>
                  ¿Estás seguro de que deseas eliminar este movimiento de{" "}
                  <strong>{formatCurrency(movimientoAEliminar.monto)}</strong> ({movimientoAEliminar.tipo})? Esta acción afectará el saldo total de la caja.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setOpenConfirmDelete(false)
                setMovimientoAEliminar(null)
              }}
              className="rounded-full"
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarEliminacion}
              disabled={deleting}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

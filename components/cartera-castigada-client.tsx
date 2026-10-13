"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ArrowLeft,
  Search,
  Phone,
  MapPin,
  DollarSign,
  AlertOctagon,
  ShieldAlert,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  FileText,
  User,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  X,
  CreditCard,
  Ban,
  ChevronDown,
  ChevronRight,
  ChevronLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const PagoRapidoModal = dynamic(() => import("@/components/pago-rapido-modal"), { ssr: false })

interface CarteraResumen {
  totalSaldoCastigado: number
  totalClientesCastigados: number
  totalPrestamosCastigados: number
  totalMontoOriginal: number
  totalRecuperado: number
  promedioDiasSinAbono: number
  umbralDias: number
}

interface ItemCastigado {
  id: string
  monto: number
  interes: number
  montoTotal: number
  totalPagado: number
  saldoPendiente: number
  cuotas: number
  cuotasPagadas: number
  valorCuota: number
  tipoPago: string
  fechaInicio: string
  fechaFin: string
  estado: string
  diasSinAbono: number
  fechaReferencia: string
  tieneAbonosPrevios: boolean
  fechaUltimoPago: string | null
  esCastigoManual: boolean
  motivoCastigo: string | null
  fechaCastigoManual: string | null
  cliente: {
    id: string
    codigoCliente?: string
    documento: string
    nombre: string
    apellido: string
    telefono?: string
    foto?: string
    direccionCliente?: string
    direccionCobro?: string
    mapLink?: string
    rutaId?: string
    ruta?: {
      id: string
      nombre: string
    }
  }
  cobrador?: {
    id: string
    firstName?: string
    lastName?: string
    name?: string
  }
}

interface RutaOption {
  id: string
  nombre: string
}

export default function CarteraCastigadaClient({ session }: { session: Session }) {
  const { toast } = useToast()
  const { format: formatCurrency } = useCurrency()

  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState<CarteraResumen | null>(null)
  const [items, setItems] = useState<ItemCastigado[]>([])
  const [rutas, setRutas] = useState<RutaOption[]>([])

  // Filtros
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>("TODAS")
  const [busqueda, setBusqueda] = useState<string>("")
  const [rangoDias, setRangoDias] = useState<string>("TODOS") // TODOS, 30-60, 60-90, 90+

  // Modal pago rápido
  const [prestamoSeleccionadoParaPago, setPrestamoSeleccionadoParaPago] = useState<any | null>(null)
  const [pagoModalOpen, setPagoModalOpen] = useState(false)

  // Modal de gestión administrativa
  const [itemParaGestion, setItemParaGestion] = useState<ItemCastigado | null>(null)
  const [motivoGestion, setMotivoGestion] = useState("")
  const [gestionLoading, setGestionLoading] = useState(false)

  const isAdmin = session?.user?.role === "ADMINISTRADOR"
  const isSupervisor = session?.user?.role === "SUPERVISOR"
  const canManage = isAdmin || isSupervisor

  // Carga de datos
  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (rutaSeleccionada !== "TODAS") {
        params.append("rutaId", rutaSeleccionada)
      }
      if (busqueda.trim()) {
        params.append("q", busqueda.trim())
      }

      const res = await fetch(`/api/cartera-castigada?${params.toString()}`)
      if (!res.ok) {
        throw new Error("No se pudo cargar la cartera castigada")
      }
      const data = await res.json()
      setResumen(data.resumen)
      setItems(data.items || [])
      setRutas(data.rutas || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [rutaSeleccionada, busqueda, toast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Filtrado en memoria por rango de días
  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      if (rangoDias === "30-60") {
        return item.diasSinAbono >= 30 && item.diasSinAbono < 60
      }
      if (rangoDias === "60-90") {
        return item.diasSinAbono >= 60 && item.diasSinAbono < 90
      }
      if (rangoDias === "90+") {
        return item.diasSinAbono >= 90
      }
      return true
    })
  }, [items, rangoDias])

  // Totales de la vista actual filtrada
  const saldoTotalFiltrado = useMemo(() => {
    return itemsFiltrados.reduce((sum, it) => sum + it.saldoPendiente, 0)
  }, [itemsFiltrados])

  // Agrupación por ruta + paginación por grupo
  const POR_PAGINA = 10
  const grupos = useMemo(() => {
    const map = new Map<string, { key: string; nombre: string; items: ItemCastigado[]; subtotal: number }>()
    itemsFiltrados.forEach((it) => {
      const key = it.cliente.ruta?.id || "SIN_RUTA"
      const nombre = it.cliente.ruta?.nombre || "Sin ruta asignada"
      if (!map.has(key)) map.set(key, { key, nombre, items: [], subtotal: 0 })
      const g = map.get(key)!
      g.items.push(it)
      g.subtotal += it.saldoPendiente
    })
    return Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal)
  }, [itemsFiltrados])

  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set())
  const [paginas, setPaginas] = useState<Record<string, number>>({})

  // Al cambiar filtros: volver a página 1 y abrir automáticamente si hay un solo grupo
  useEffect(() => {
    setPaginas({})
    if (grupos.length === 1) setGruposAbiertos(new Set([grupos[0].key]))
  }, [grupos])

  const toggleGrupo = (key: string) => {
    setGruposAbiertos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const cambiarPagina = (key: string, pagina: number) => {
    setPaginas((prev) => ({ ...prev, [key]: pagina }))
  }

  // Formato de fecha seguro
  const formatFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return "Sin registro"
    try {
      return format(new Date(fechaStr), "dd/MM/yyyy", { locale: es })
    } catch {
      return "Fecha inválida"
    }
  }

  // Manejo de llamada o WhatsApp
  const handleLlamar = (tel?: string) => {
    if (!tel) {
      toast({ title: "Sin teléfono", description: "El cliente no tiene teléfono registrado" })
      return
    }
    window.location.href = `tel:${tel}`
  }

  const handleWhatsApp = (tel?: string, clienteNombre?: string, saldo?: number) => {
    if (!tel) {
      toast({ title: "Sin teléfono", description: "El cliente no tiene teléfono registrado" })
      return
    }
    const cleanTel = tel.replace(/[^0-9]/g, "")
    const num = cleanTel.startsWith("593") ? cleanTel : cleanTel.startsWith("0") ? `593${cleanTel.slice(1)}` : `593${cleanTel}`
    const msg = encodeURIComponent(
      `Estimado/a ${clienteNombre || "Cliente"}, nos comunicamos de cobranzas para coordinar el saldo pendiente de su crédito por ${formatCurrency(saldo || 0)}. Por favor contáctenos a la brevedad posible.`
    )
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank")
  }

  // Abrir modal de pago rápido
  const handleAbrirPago = (item: ItemCastigado) => {
    setPrestamoSeleccionadoParaPago({
      id: item.id,
      monto: item.monto,
      interes: item.interes,
      cuotas: item.cuotas,
      valorCuota: item.valorCuota,
      cliente: {
        nombre: item.cliente.nombre,
        apellido: item.cliente.apellido,
        documento: item.cliente.documento,
        telefono: item.cliente.telefono,
        direccionCliente: item.cliente.direccionCliente
      },
      saldoPendiente: item.saldoPendiente,
      cuotasPagadas: item.cuotasPagadas
    })
    setPagoModalOpen(true)
  }

  // Guardar gestión administrativa (excluir o reactivar)
  const handleGuardarGestion = async (accion: "EXCLUIR" | "RESTABLECER") => {
    if (!itemParaGestion) return
    setGestionLoading(true)
    try {
      const res = await fetch("/api/cartera-castigada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prestamoId: itemParaGestion.id,
          castigadoManual: false,
          excluidoCastigo: accion === "EXCLUIR",
          motivo: motivoGestion
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al procesar")

      toast({
        title: "Éxito",
        description: data.mensaje || "Estado actualizado correctamente"
      })

      setItemParaGestion(null)
      setMotivoGestion("")
      cargarDatos()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar",
        variant: "destructive"
      })
    } finally {
      setGestionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/dashboard" className="shrink-0">
              <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <div className="p-2 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg shrink-0">
              <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                  Cartera Castigada
                </h1>
                <Badge variant="destructive" className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 whitespace-nowrap">
                  +30 días sin pago
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none mt-0.5">
                Préstamos en mora crítica sin abono durante 1 mes o más
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={cargarDatos}
            disabled={loading}
            className="h-9 px-2.5 sm:px-3 text-xs gap-1.5 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-red-200 dark:border-red-900/40 bg-gradient-to-br from-red-50/50 via-white to-red-50/20 dark:from-red-950/20 dark:via-slate-900 dark:to-red-950/10 shadow-sm overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-sm font-medium text-red-600 dark:text-red-400 flex items-center justify-between">
              <span className="truncate">Total Castigado</span>
              <AlertOctagon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 shrink-0 ml-1" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-base sm:text-2xl font-extrabold text-red-700 dark:text-red-400 truncate tracking-tight">
              {formatCurrency(resumen?.totalSaldoCastigado || 0)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              En riesgo incobrable
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span className="truncate">Clientes Críticos</span>
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 shrink-0 ml-1" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-base sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {resumen?.totalClientesCastigados || 0}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              En {resumen?.totalPrestamosCastigados || 0} créditos activos
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span className="truncate">Promedio sin Pago</span>
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0 ml-1" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-base sm:text-2xl font-bold text-amber-600 dark:text-amber-400 truncate">
              {resumen?.promedioDiasSinAbono || 0} <span className="text-xs font-normal">días</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Desde último abono
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span className="truncate">Recuperado</span>
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0 ml-1" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-base sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
              {formatCurrency(resumen?.totalRecuperado || 0)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              De {formatCurrency(resumen?.totalMontoOriginal || 0)} prestado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Buscador de texto */}
            <div className="sm:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, cédula o código..."
                className="pl-9 text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Selector de Ruta */}
            {canManage && rutas.length > 0 && (
              <div className="sm:col-span-4">
                <select
                  value={rutaSeleccionada}
                  onChange={(e) => setRutaSeleccionada(e.target.value)}
                  aria-label="Filtrar por ruta"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="TODAS">Todas las rutas</option>
                  {rutas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rango de Días de Mora */}
            <div className={canManage && rutas.length > 0 ? "sm:col-span-3" : "sm:col-span-7"}>
              <select
                value={rangoDias}
                onChange={(e) => setRangoDias(e.target.value)}
                aria-label="Filtrar por rango de días sin pago"
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="TODOS">Todos los rangos (+30d)</option>
                <option value="30-60">30 a 60 días sin pago</option>
                <option value="60-90">60 a 90 días sin pago</option>
                <option value="90+">Más de 90 días sin pago</option>
              </select>
            </div>
          </div>

          {/* Subbarra informativa de resultados */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              Mostrando <span className="font-semibold text-slate-800 dark:text-slate-200">{itemsFiltrados.length}</span> créditos
              {rangoDias !== "TODOS" && ` con filtro ${rangoDias}`}
            </div>
            <div>
              Saldo total filtrado:{" "}
              <span className="font-bold text-red-600 dark:text-red-400">
                {formatCurrency(saldoTotalFiltrado)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listado de Clientes y Préstamos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-sm">Analizando cartera castigada y tiempos de pago...</p>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              No hay préstamos en Cartera Castigada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {busqueda || rutaSeleccionada !== "TODAS" || rangoDias !== "TODOS"
                ? "No se encontraron coincidencias para los filtros seleccionados."
                : "¡Excelente! No hay clientes con más de 30 días sin abonar en la cartera evaluada."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {grupos.map((grupo) => {
            const abierto = gruposAbiertos.has(grupo.key)
            const totalPaginas = Math.max(1, Math.ceil(grupo.items.length / POR_PAGINA))
            const paginaActual = Math.min(paginas[grupo.key] || 1, totalPaginas)
            const visibles = grupo.items.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

            return (
              <div key={grupo.key} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGrupo(grupo.key)}
                  className="w-full flex items-center justify-between gap-2 p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {abierto ? (
                      <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                    )}
                    <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                      {grupo.nombre}
                    </span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                      {grupo.items.length}
                    </Badge>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400 shrink-0">
                    {formatCurrency(grupo.subtotal)}
                  </span>
                </button>

                {abierto && (
                  <div className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="h-1" />
          {visibles.map((item) => {
            const diasMoraBadgeColor =
              item.diasSinAbono >= 90
                ? "bg-red-600 text-white hover:bg-red-700"
                : item.diasSinAbono >= 60
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"

            return (
              <Card
                key={item.id}
                className="border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-900/60 transition-colors shadow-sm overflow-hidden"
              >
                <CardContent className="p-3 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                    {/* Información del Cliente */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Link
                          href={`/prestamos/${item.id}`}
                          className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 transition-colors truncate"
                        >
                          {item.cliente.nombre} {item.cliente.apellido}
                        </Link>
                        {item.cliente.codigoCliente && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs font-mono">
                            {item.cliente.codigoCliente}
                          </Badge>
                        )}
                        <Badge className={`text-[10px] sm:text-xs font-bold gap-1 px-2 py-0.5 ${diasMoraBadgeColor}`}>
                          <Clock className="h-3 w-3" />
                          {item.diasSinAbono} días sin abono
                        </Badge>
                        {item.esCastigoManual && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5">
                            Castigo Manual
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          <strong className="text-slate-700 dark:text-slate-300">C.I:</strong>{" "}
                          {item.cliente.documento}
                        </span>
                        {item.cliente.ruta && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {item.cliente.ruta.nombre}
                          </span>
                        )}
                        {item.cobrador && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            Cobrador: {item.cobrador.name || `${item.cobrador.firstName || ""} ${item.cobrador.lastName || ""}`.trim()}
                          </span>
                        )}
                        <span>
                          <strong className="text-slate-700 dark:text-slate-300">Tipo:</strong>{" "}
                          {item.tipoPago}
                        </span>
                      </div>

                      {/* Fechas de seguimiento */}
                      <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1">
                        <div>
                          <strong>Último abono:</strong>{" "}
                          {item.fechaUltimoPago ? formatFecha(item.fechaUltimoPago) : "Nunca abonó"}
                        </div>
                        <div>
                          <strong>Fecha inicio:</strong> {formatFecha(item.fechaInicio)}
                        </div>
                        <div>
                          <strong>Pagado:</strong> {formatCurrency(item.totalPagado)} / {formatCurrency(item.montoTotal)}
                        </div>
                        {item.motivoCastigo && (
                          <div className="w-full text-purple-700 dark:text-purple-300 italic pt-1">
                            Nota: {item.motivoCastigo}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Saldos y Acciones Rápidas */}
                    <div className="flex flex-col sm:flex-row lg:flex-col sm:items-end lg:items-end justify-between gap-2.5 sm:gap-3 pt-2.5 sm:pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-1 text-left sm:text-right">
                        <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                          Saldo Vencido
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">
                          {formatCurrency(item.saldoPendiente)}
                        </div>
                        <div className="hidden sm:block text-[10px] sm:text-[11px] text-slate-400">
                          Cuota: {formatCurrency(item.valorCuota)}
                        </div>
                      </div>

                      {/* Botonera de Gestión */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
                        {item.cliente.telefono && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 sm:px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex-1 sm:flex-none justify-center"
                              onClick={() => handleWhatsApp(item.cliente.telefono, `${item.cliente.nombre} ${item.cliente.apellido}`, item.saldoPendiente)}
                              title="Enviar WhatsApp de cobro"
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1" />
                              WhatsApp
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 sm:px-2.5 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex-1 sm:flex-none justify-center"
                              onClick={() => handleLlamar(item.cliente.telefono)}
                              title="Llamar al cliente"
                            >
                              <Phone className="h-3.5 w-3.5 mr-1" />
                              Llamar
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex-1 sm:flex-none justify-center"
                          onClick={() => handleAbrirPago(item)}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Abonar
                        </Button>

                        <Link href={`/prestamos/${item.id}`} className="shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-2.5 text-xs">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                        </Link>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                            onClick={() => {
                              setItemParaGestion(item)
                              setMotivoGestion(item.motivoCastigo || "")
                            }}
                            title="Opciones administrativas de castigo"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

                    {totalPaginas > 1 && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          disabled={paginaActual <= 1}
                          onClick={() => cambiarPagina(grupo.key, paginaActual - 1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                          Anterior
                        </Button>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Página {paginaActual} de {totalPaginas}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          disabled={paginaActual >= totalPaginas}
                          onClick={() => cambiarPagina(grupo.key, paginaActual + 1)}
                        >
                          Siguiente
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Pago Rápido */}
      {prestamoSeleccionadoParaPago && (
        <PagoRapidoModal
          isOpen={pagoModalOpen}
          onClose={() => {
            setPagoModalOpen(false)
            setPrestamoSeleccionadoParaPago(null)
          }}
          prestamo={prestamoSeleccionadoParaPago}
          onSuccess={() => {
            setPagoModalOpen(false)
            setPrestamoSeleccionadoParaPago(null)
            cargarDatos()
          }}
        />
      )}

      {/* Modal de Gestión Administrativa */}
      <Dialog open={!!itemParaGestion} onOpenChange={(open) => !open && setItemParaGestion(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Gestión de Cartera Castigada
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cliente: {itemParaGestion?.cliente.nombre} {itemParaGestion?.cliente.apellido} (
              {itemParaGestion?.diasSinAbono} días sin abonar)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Motivo / Observación de cobro</Label>
              <Textarea
                placeholder="Ej: Cliente ilocalizable, acuerdo de pago especial, etc."
                value={motivoGestion}
                onChange={(e) => setMotivoGestion(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Puedes excluir temporalmente este préstamo de la cartera castigada si está bajo un plan de pago especial, o restablecer su regla automática.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGuardarGestion("EXCLUIR")}
              disabled={gestionLoading}
              className="text-xs"
            >
              Excluir de Castigo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleGuardarGestion("RESTABLECER")}
              disabled={gestionLoading}
              className="text-xs"
            >
              Restablecer Automático
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

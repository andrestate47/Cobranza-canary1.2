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
  Ban
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Cartera Castigada
                  <Badge variant="destructive" className="text-xs font-semibold">
                    +30 días sin pago
                  </Badge>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Préstamos y clientes en mora crítica sin abonos durante 1 mes o más
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={cargarDatos}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-red-200 dark:border-red-900/40 bg-gradient-to-br from-red-50/50 via-white to-red-50/20 dark:from-red-950/20 dark:via-slate-900 dark:to-red-950/10 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 flex items-center justify-between">
              Total Saldo Castigado
              <AlertOctagon className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400">
              {formatCurrency(resumen?.totalSaldoCastigado || 0)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              En riesgo crítico de incobrabilidad
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
              Clientes en Mora Crítica
              <User className="h-4 w-4 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {resumen?.totalClientesCastigados || 0}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              En {resumen?.totalPrestamosCastigados || 0} créditos activos
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
              Promedio Días sin Pagar
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
              {resumen?.promedioDiasSinAbono || 0} <span className="text-xs font-normal">días</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Desde el último abono registrado
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
              Total Recuperado
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(resumen?.totalRecuperado || 0)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
          {itemsFiltrados.map((item) => {
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
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Información del Cliente */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/prestamos/${item.id}`}
                          className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 transition-colors truncate"
                        >
                          {item.cliente.nombre} {item.cliente.apellido}
                        </Link>
                        {item.cliente.codigoCliente && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {item.cliente.codigoCliente}
                          </Badge>
                        )}
                        <Badge className={`text-xs font-bold gap-1 ${diasMoraBadgeColor}`}>
                          <Clock className="h-3 w-3" />
                          {item.diasSinAbono} días sin abono
                        </Badge>
                        {item.esCastigoManual && (
                          <Badge variant="secondary" className="text-xs font-medium bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                            Castigo Manual
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
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
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
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
                    <div className="flex flex-col sm:flex-row lg:flex-col sm:items-end lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Saldo Vencido Castigado
                        </div>
                        <div className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">
                          {formatCurrency(item.saldoPendiente)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Cuota diaria/periódica: {formatCurrency(item.valorCuota)}
                        </div>
                      </div>

                      {/* Botonera de Gestión */}
                      <div className="flex flex-wrap items-center gap-2">
                        {item.cliente.telefono && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={() => handleWhatsApp(item.cliente.telefono, `${item.cliente.nombre} ${item.cliente.apellido}`, item.saldoPendiente)}
                              title="Enviar WhatsApp de cobro"
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1" />
                              WhatsApp
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
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
                          className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          onClick={() => handleAbrirPago(item)}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Abonar
                        </Button>

                        <Link href={`/prestamos/${item.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                        </Link>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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

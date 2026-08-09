"use client"

import { useState, useEffect } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import {
  ArrowLeft,
  Phone,
  MapPin,
  CheckCircle2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Calendar,
  MessageCircle,
  Loader2,
  Navigation,
  Search,
  TrendingUp,
  Clock,
  Check,
  Zap,
  Filter,
  RefreshCw,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import PagoRapidoModal from "@/components/pago-rapido-modal"
import { useCurrency } from "@/hooks/use-currency"

interface RutaDelDiaClientProps {
  session: Session
}

interface Cliente {
  id: string
  nombre: string
  apellido: string
  documento: string
  telefono?: string
  direccionCliente?: string
  direccionCobro?: string
  mapLink?: string
}

interface PrestamoConDetalles {
  id: string
  monto: number
  interes: number
  cuotas: number
  valorCuota: number
  fechaInicio: string
  fechaFin: string
  estado: string
  tipoPago: string
  cliente: Cliente
  saldoPendiente: number
  cuotasPagadas: number
  yaPagoHoy: boolean
  pagadoHoyMonto: number
  diasMora: number
  enRutaHoy: boolean
}

interface CobradorInfo {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  nombre?: string
  numero?: string
}

export default function RutaDelDiaClient({ session }: RutaDelDiaClientProps) {
  const { toast } = useToast()
  const { format: formatCurrency } = useCurrency()
  const user = session?.user

  const [porCobrar, setPorCobrar] = useState<PrestamoConDetalles[]>([])
  const [cobrados, setCobrados] = useState<PrestamoConDetalles[]>([])
  const [cobradores, setCobradores] = useState<CobradorInfo[]>([])

  const [fecha, setFecha] = useState<string>(new Date().toISOString().split("T")[0])
  const [selectedCobradorId, setSelectedCobradorId] = useState<string>("")

  const [loading, setLoading] = useState(true)
  const [savingOrder, setSavingOrder] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [selectedPrestamo, setSelectedPrestamo] = useState<any | null>(null)
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState<'porCobrar' | 'cobrados'>('porCobrar')

  const loadRuta = async () => {
    setLoading(true)
    try {
      let url = `/api/ruta-del-dia?fecha=${fecha}`
      if (selectedCobradorId) url += `&rutaId=${selectedCobradorId}`

      const response = await fetch(url)
      if (!response.ok) throw new Error("No se pudo cargar la ruta del día")

      const data = await response.json()
      setPorCobrar(data.porCobrar || [])
      setCobrados(data.cobrados || [])
      if (data.cobradores) setCobradores(data.cobradores)
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Error al cargar la ruta del día", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRuta() }, [fecha, selectedCobradorId])

  const saveOrder = async (updatedList: PrestamoConDetalles[]) => {
    setSavingOrder(true)
    try {
      const ids = updatedList.map(item => item.id)
      await fetch("/api/ruta-del-dia", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: ids, fecha, rutaId: selectedCobradorId || undefined })
      })
    } catch (error) {
      toast({ title: "Error de Guardado", description: "No se pudo sincronizar el nuevo orden.", variant: "destructive" })
    } finally {
      setSavingOrder(false)
    }
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...porCobrar]
    ;[updated[index], updated[index - 1]] = [updated[index - 1], updated[index]]
    setPorCobrar(updated)
    saveOrder(updated)
  }

  const moveDown = (index: number) => {
    if (index === porCobrar.length - 1) return
    const updated = [...porCobrar]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setPorCobrar(updated)
    saveOrder(updated)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const updated = [...porCobrar]
    const [item] = updated.splice(draggedIndex, 1)
    updated.splice(targetIndex, 0, item)
    setDraggedIndex(null)
    setPorCobrar(updated)
    saveOrder(updated)
  }

  const handleRegistrarPago = (prestamo: PrestamoConDetalles) => {
    setSelectedPrestamo({
      id: prestamo.id,
      monto: prestamo.monto,
      interes: prestamo.interes,
      cuotas: prestamo.cuotas,
      valorCuota: prestamo.valorCuota,
      cliente: {
        nombre: prestamo.cliente.nombre,
        apellido: prestamo.cliente.apellido,
        documento: prestamo.cliente.documento,
        telefono: prestamo.cliente.telefono,
        direccionCliente: prestamo.cliente.direccionCobro || prestamo.cliente.direccionCliente
      },
      saldoPendiente: prestamo.saldoPendiente,
      cuotasPagadas: prestamo.cuotasPagadas
    })
    setIsPagoModalOpen(true)
  }

  const handlePagoSuccess = () => {
    setIsPagoModalOpen(false)
    loadRuta()
  }

  const normalizeText = (text: string) => {
    if (!text) return ""
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  }

  const filteredPorCobrar = porCobrar.filter(item => {
    if (!searchQuery) return true
    const query = normalizeText(searchQuery)
    const nombreCompleto = normalizeText(`${item.cliente.nombre} ${item.cliente.apellido}`)
    const documento = normalizeText(item.cliente.documento || "")
    return nombreCompleto.includes(query) || documento.includes(query)
  })

  const filteredCobrados = cobrados.filter(item => {
    if (!searchQuery) return true
    const query = normalizeText(searchQuery)
    const nombreCompleto = normalizeText(`${item.cliente.nombre} ${item.cliente.apellido}`)
    const documento = normalizeText(item.cliente.documento || "")
    return nombreCompleto.includes(query) || documento.includes(query)
  })

  // KPI calculations
  const totalRecaudadoHoy = cobrados.reduce((sum, item) => sum + (item.pagadoHoyMonto || 0), 0)
  const totalPendienteCuotas = porCobrar.reduce((sum, item) => sum + (item.valorCuota || 0), 0)
  const totalClientes = porCobrar.length + cobrados.length
  const porcentajeEficiencia = totalClientes > 0 ? Math.round((cobrados.length / totalClientes) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ─── STICKY HEADER WITH GLASSMORPHISM ─── */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3.5 space-y-3">
          
          {/* Top Bar: Title & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 transition-all">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-cyan-400" />
                    Ruta del Día
                  </h1>
                  {savingOrder && (
                    <Badge variant="outline" className="animate-pulse bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] py-0">
                      Sincronizando...
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400">Organización y cobro en tiempo real</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadRuta}
              disabled={loading}
              className="h-9 px-3 text-xs bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              Actualizar
            </Button>
          </div>

          {/* Filters Bar: Date + Collector Selector */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Date selector */}
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 focus-within:border-cyan-500/60 transition-all">
              <Calendar className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-medium"
              />
            </div>

            {/* Collector Selector (Admin / Supervisor) */}
            {(user?.role === "ADMINISTRADOR" || user?.role === "SUPERVISOR") && cobradores.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 focus-within:border-cyan-500/60 transition-all flex-1 min-w-[200px] max-w-xs">
                <Users className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <select
                  value={selectedCobradorId}
                  onChange={(e) => setSelectedCobradorId(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-200 outline-none cursor-pointer w-full"
                >
                  <option value="" className="bg-slate-900 text-slate-200">-- Seleccionar Ruta --</option>
                  {cobradores.map(ruta => (
                    <option key={ruta.id} value={ruta.id} className="bg-slate-900 text-slate-200">
                      {ruta.nombre} {ruta.numero ? `(${ruta.numero})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre o documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            />
          </div>

        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">

        {/* ─── KPI SUMMARY DASHBOARD ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Por Cobrar */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Por Cobrar</span>
                <span className="text-lg font-bold text-cyan-400 mt-0.5 block">{formatCurrency(totalPendienteCuotas)}</span>
                <span className="text-[10px] text-slate-500">{porCobrar.length} clientes pendientes</span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Recaudado Hoy */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Recaudado Hoy</span>
                <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{formatCurrency(totalRecaudadoHoy)}</span>
                <span className="text-[10px] text-slate-500">{cobrados.length} cobros realizados</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Avance */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Progreso Día</span>
                <span className="text-lg font-bold text-amber-400 mt-0.5 block">{porcentajeEficiencia}%</span>
                <span className="text-[10px] text-slate-500">{cobrados.length} de {totalClientes} atendidos</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Clientes Totales */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Total Clientes</span>
                <span className="text-lg font-bold text-purple-400 mt-0.5 block">{totalClientes}</span>
                <span className="text-[10px] text-slate-500">En ruta asignada</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── MOBILE TAB SWITCHER ─── */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-800 lg:hidden">
          <button
            onClick={() => setActiveMobileTab('porCobrar')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeMobileTab === 'porCobrar'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Por Cobrar ({filteredPorCobrar.length})
          </button>

          <button
            onClick={() => setActiveMobileTab('cobrados')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeMobileTab === 'cobrados'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Cobrados ({filteredCobrados.length})
          </button>
        </div>

        {/* ─── MAIN COLUMNS VIEW ─── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-slate-400 text-xs font-medium">Cargando información de la ruta...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── COLUMNA 1: POR COBRAR ── */}
            <div className={`${activeMobileTab === 'porCobrar' ? 'block' : 'hidden lg:block'} space-y-3`}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Por Cobrar</h2>
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs px-2.5 py-0.5 rounded-full">
                  {filteredPorCobrar.length} pendientes
                </Badge>
              </div>

              {filteredPorCobrar.length === 0 ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  {!selectedCobradorId && (user?.role === "ADMINISTRADOR" || user?.role === "SUPERVISOR") ? (
                    <>
                      <MapPin className="h-10 w-10 text-slate-500 mx-auto" />
                      <p className="text-slate-300 font-semibold text-xs">Selecciona una ruta</p>
                      <p className="text-slate-500 text-[11px]">Usa el selector superior para cargar los cobros asignados.</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                      <p className="text-slate-200 font-semibold text-xs">
                        {searchQuery ? "No se encontraron coincidencias." : "¡Ruta completada!"}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        {searchQuery ? "Intenta modificar el término de búsqueda." : "No quedan cobros pendientes para hoy."}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPorCobrar.map((item, index) => {
                    const esMora = item.diasMora > 0
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`group bg-slate-900/80 backdrop-blur-md rounded-2xl border transition-all duration-200 hover:border-slate-700 overflow-hidden shadow-lg ${
                          esMora ? "border-l-4 border-l-red-500 border-slate-800/80" : "border-l-4 border-l-cyan-500 border-slate-800/80"
                        }`}
                      >
                        <div className="flex">
                          {/* Drag handle */}
                          <div className="flex flex-col items-center justify-center px-2.5 text-slate-600 hover:text-slate-300 border-r border-slate-800/80 cursor-grab active:cursor-grabbing flex-shrink-0 bg-slate-950/40">
                            <GripVertical className="h-4 w-4" />
                          </div>

                          {/* Card Content */}
                          <div className="flex-1 p-4 space-y-3">
                            {/* Header: Name + Order buttons */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-white text-sm leading-tight truncate group-hover:text-cyan-300 transition-colors">
                                  {item.cliente.nombre} {item.cliente.apellido}
                                </h3>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {esMora ? (
                                    <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] py-0 px-2 font-semibold">
                                      Mora {item.diasMora}d
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] py-0 px-2 font-semibold">
                                      Al día
                                    </Badge>
                                  )}
                                  <span className="text-[10px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800 capitalize">
                                    {item.tipoPago.toLowerCase().replace(/_/g, " ")}
                                  </span>
                                </div>
                              </div>

                              {/* Up / Down Order controls */}
                              <div className="flex flex-col gap-0.5 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-md"
                                  onClick={() => moveUp(index)}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-md"
                                  onClick={() => moveDown(index)}
                                  disabled={index === porCobrar.length - 1}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Montos Grid */}
                            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Cuota del Día</span>
                                <span className="font-bold text-cyan-300 text-sm">{formatCurrency(item.valorCuota)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Saldo Pendiente</span>
                                <span className="font-bold text-red-400 text-sm">{formatCurrency(item.saldoPendiente)}</span>
                              </div>
                            </div>

                            {/* Dirección */}
                            {(item.cliente.direccionCobro || item.cliente.direccionCliente) && (
                              <div className="flex items-start gap-1.5 text-xs text-slate-400">
                                <MapPin className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-1">{item.cliente.direccionCobro || item.cliente.direccionCliente}</span>
                              </div>
                            )}

                            {/* Actions Bar */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.cliente.telefono && (
                                  <a href={`tel:${item.cliente.telefono}`}>
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-slate-950/60 border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg">
                                      <Phone className="h-3 w-3 text-blue-400 mr-1" />
                                      Llamar
                                    </Button>
                                  </a>
                                )}
                                {item.cliente.telefono && (
                                  <a href={`https://wa.me/${item.cliente.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-slate-950/60 border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg">
                                      <MessageCircle className="h-3 w-3 text-emerald-400 mr-1" />
                                      WhatsApp
                                    </Button>
                                  </a>
                                )}
                                {item.cliente.mapLink && (
                                  <a href={item.cliente.mapLink} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-slate-950/60 border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg">
                                      <Navigation className="h-3 w-3 text-red-400 mr-1" />
                                      Mapa
                                    </Button>
                                  </a>
                                )}
                              </div>

                              <Button
                                size="sm"
                                onClick={() => handleRegistrarPago(item)}
                                className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 rounded-xl flex-shrink-0"
                              >
                                <DollarSign className="h-4 w-4 mr-0.5" />
                                Pagar
                              </Button>
                            </div>

                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── COLUMNA 2: COBRADOS ── */}
            <div className={`${activeMobileTab === 'cobrados' ? 'block' : 'hidden lg:block'} space-y-3`}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cobrados / Abonados</h2>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full">
                  {filteredCobrados.length} realizados
                </Badge>
              </div>

              {filteredCobrados.length === 0 ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <DollarSign className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-slate-300 font-semibold text-xs">Sin cobros aún</p>
                  <p className="text-slate-500 text-[11px]">Los cobros realizados en el día aparecerán aquí organizados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCobrados.map((item) => (
                    <Card key={item.id} className="bg-slate-900/80 backdrop-blur-md border-l-4 border-l-emerald-500 border-slate-800/80 shadow-lg rounded-2xl overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-white text-sm leading-tight truncate">
                              {item.cliente.nombre} {item.cliente.apellido}
                            </h3>
                            <span className="text-xs text-slate-400 block mt-1">
                              {item.cliente.telefono || `Doc: ${item.cliente.documento}`}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Abonado hoy</span>
                            <span className="font-extrabold text-emerald-400 text-base">
                              {formatCurrency(item.pagadoHoyMonto)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 py-1 px-2.5 rounded-lg border border-emerald-500/20">
                            <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="font-semibold">Pago Registrado</span>
                          </div>
                          {item.saldoPendiente > 0 && (
                            <span className="text-xs text-slate-400 font-medium">
                              Saldo: <strong className="text-slate-200">{formatCurrency(item.saldoPendiente)}</strong>
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Modal de Pago Rápido */}
      {isPagoModalOpen && selectedPrestamo && (
        <PagoRapidoModal
          isOpen={isPagoModalOpen}
          onClose={() => setIsPagoModalOpen(false)}
          prestamo={selectedPrestamo}
          onSuccess={handlePagoSuccess}
        />
      )}
    </div>
  )
}


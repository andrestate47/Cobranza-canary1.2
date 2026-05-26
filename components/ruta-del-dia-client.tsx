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
  User,
  Navigation,
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

  const [selectedPrestamo, setSelectedPrestamo] = useState<any | null>(null)
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false)

  const loadRuta = async () => {
    setLoading(true)
    try {
      let url = `/api/ruta-del-dia?fecha=${fecha}`
      if (selectedCobradorId) url += `&userId=${selectedCobradorId}`

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
        body: JSON.stringify({ orden: ids, fecha, userId: selectedCobradorId || undefined })
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

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* ─── CABECERA STICKY ─── */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3">

          {/* Fila 1: título + botón atrás */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">🗺️ Ruta del Día</h1>
                <p className="text-[11px] text-gray-400 hidden sm:block">Organiza y registra cobros diarios</p>
              </div>
            </div>

            {/* Acceso rápido a cobrados en móvil */}
            <Button
              variant="outline"
              size="sm"
              className="text-green-700 bg-green-50 border-green-200 hover:bg-green-100 text-xs h-8 px-2 lg:hidden"
              onClick={() => document.getElementById("seccion-cobrados")?.scrollIntoView({ behavior: "smooth" })}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Pagados ({cobrados.length})
            </Button>
          </div>

          {/* Fila 2: filtros */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 text-sm">
              <Calendar className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent text-gray-700 outline-none cursor-pointer text-xs font-medium"
              />
            </div>

            {(user?.role === "ADMINISTRADOR" || user?.role === "SUPERVISOR") && cobradores.length > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                <MapPin className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                <select
                  value={selectedCobradorId}
                  onChange={(e) => setSelectedCobradorId(e.target.value)}
                  className="bg-transparent text-xs font-medium text-gray-700 outline-none cursor-pointer"
                >
                  <option value="">-- Seleccione una Ruta --</option>
                  {cobradores.map(ruta => (
                    <option key={ruta.id} value={ruta.id}>
                      {ruta.nombre} {ruta.numero ? `(${ruta.numero})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {savingOrder && (
              <span className="text-[11px] text-gray-400 animate-pulse ml-1">Guardando orden...</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 mt-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
            <p className="text-gray-400 text-sm">Cargando ruta...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── COLUMNA POR COBRAR ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-600 text-white rounded-full h-6 min-w-[24px] px-2 text-xs font-bold flex items-center justify-center">
                  {porCobrar.length}
                </Badge>
                <h2 className="text-base font-bold text-gray-800">Por Cobrar</h2>
              </div>

              {porCobrar.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-700 font-medium text-sm">¡Ruta limpia para hoy!</p>
                  <p className="text-gray-400 text-xs mt-1">No quedan cobros pendientes.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {porCobrar.map((item, index) => {
                    const esMora = item.diasMora > 0
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md overflow-hidden ${
                          esMora ? "border-l-[3px] border-l-red-500" : "border-l-[3px] border-l-teal-500"
                        }`}
                      >
                        {/* Zona drag + contenido */}
                        <div className="flex">
                          {/* Handle drag - columna izquierda */}
                          <div className="flex flex-col items-center justify-center px-2 text-gray-300 hover:text-gray-500 border-r border-gray-100 cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-4 w-4" />
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 p-3">
                            {/* Cabecera: nombre + flechas */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
                                  {item.cliente.nombre} {item.cliente.apellido}
                                </h3>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {esMora ? (
                                    <Badge className="bg-red-100 text-red-700 text-[10px] py-0 px-1.5 font-semibold hover:bg-red-100 border-none">
                                      Mora {item.diasMora}d
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-teal-100 text-teal-700 text-[10px] py-0 px-1.5 font-semibold hover:bg-teal-100 border-none">
                                      Regular
                                    </Badge>
                                  )}
                                  <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 capitalize">
                                    {item.tipoPago.toLowerCase().replace(/_/g, " ")}
                                  </span>
                                </div>
                              </div>

                              {/* Botones subir/bajar */}
                              <div className="flex flex-col gap-0.5 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  onClick={() => moveUp(index)}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  onClick={() => moveDown(index)}
                                  disabled={index === porCobrar.length - 1}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Montos */}
                            <div className="grid grid-cols-2 gap-2 mt-2 bg-gray-50 rounded-lg p-2 text-xs border border-gray-100">
                              <div>
                                <span className="text-gray-400 block text-[10px]">Cuota</span>
                                <span className="font-bold text-gray-900">{formatCurrency(item.valorCuota)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px]">Saldo</span>
                                <span className="font-bold text-red-600">{formatCurrency(item.saldoPendiente)}</span>
                              </div>
                            </div>

                            {/* Dirección */}
                            {(item.cliente.direccionCobro || item.cliente.direccionCliente) && (
                              <div className="flex items-start gap-1 mt-2 text-[11px] text-gray-400">
                                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-300" />
                                <span className="line-clamp-1">{item.cliente.direccionCobro || item.cliente.direccionCliente}</span>
                              </div>
                            )}

                            {/* Acciones */}
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 gap-2">
                              {/* Botones de contacto */}
                              <div className="flex gap-1.5 flex-wrap">
                                {item.cliente.telefono && (
                                  <a href={`tel:${item.cliente.telefono}`}>
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] border-gray-200 gap-1">
                                      <Phone className="h-3 w-3 text-blue-600" />
                                      <span className="hidden sm:inline">Llamar</span>
                                    </Button>
                                  </a>
                                )}
                                {item.cliente.telefono && (
                                  <a href={`https://wa.me/${item.cliente.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] border-gray-200 gap-1">
                                      <MessageCircle className="h-3 w-3 text-green-600" />
                                      <span className="hidden sm:inline">WhatsApp</span>
                                    </Button>
                                  </a>
                                )}
                                {item.cliente.mapLink && (
                                  <a href={item.cliente.mapLink} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] border-gray-200 gap-1">
                                      <Navigation className="h-3 w-3 text-red-500" />
                                      <span className="hidden sm:inline">Mapa</span>
                                    </Button>
                                  </a>
                                )}
                              </div>

                              {/* Botón pagar */}
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold flex-shrink-0"
                                onClick={() => handleRegistrarPago(item)}
                              >
                                <DollarSign className="h-3.5 w-3.5 mr-1" />
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

            {/* ── COLUMNA COBRADOS ── */}
            <div id="seccion-cobrados">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600 text-white rounded-full h-6 min-w-[24px] px-2 text-xs font-bold flex items-center justify-center">
                  {cobrados.length}
                </Badge>
                <h2 className="text-base font-bold text-gray-800">Cobrados / Abonaron</h2>
              </div>

              {cobrados.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-500 font-medium text-sm">Sin cobros aún</p>
                  <p className="text-gray-400 text-xs mt-1">Aquí aparecerán los clientes que abonen hoy.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cobrados.map((item) => (
                    <Card key={item.id} className="border-l-[3px] border-l-green-500 shadow-sm bg-green-50/40">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
                              {item.cliente.nombre} {item.cliente.apellido}
                            </h3>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              {item.cliente.telefono || `Doc: ${item.cliente.documento}`}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="text-[10px] text-gray-400 block">Abonado hoy</span>
                            <span className="font-extrabold text-green-700 text-base">
                              {formatCurrency(item.pagadoHoyMonto)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-[11px] text-green-700 bg-green-100/80 py-1 px-2 rounded-md border border-green-200/60">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            <span className="font-medium">Pago registrado</span>
                          </div>
                          {item.saldoPendiente > 0 && (
                            <span className="text-[10px] text-gray-400">
                              Saldo: {formatCurrency(item.saldoPendiente)}
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
      </div>

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

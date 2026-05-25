"use client"

import { useState, useEffect } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  ExternalLink
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
}

interface CobradorInfo {
  id: string
  firstName: string
  lastName: string
  name: string
}

export default function RutaDelDiaClient({ session }: RutaDelDiaClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { format: formatCurrency } = useCurrency()
  const user = session?.user

  // Estados de datos
  const [porCobrar, setPorCobrar] = useState<PrestamoConDetalles[]>([])
  const [cobrados, setCobrados] = useState<PrestamoConDetalles[]>([])
  const [cobradores, setCobradores] = useState<CobradorInfo[]>([])
  
  // Filtros
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split("T")[0])
  const [selectedCobradorId, setSelectedCobradorId] = useState<string>("")
  
  // UI States
  const [loading, setLoading] = useState(true)
  const [savingOrder, setSavingOrder] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  // Modal Pago Rápido
  const [selectedPrestamo, setSelectedPrestamo] = useState<any | null>(null)
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false)

  // Cargar datos
  const loadRuta = async () => {
    setLoading(true)
    try {
      let url = `/api/ruta-del-dia?fecha=${fecha}`
      if (selectedCobradorId) {
        url += `&userId=${selectedCobradorId}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("No se pudo cargar la ruta del día")
      }
      
      const data = await response.json()
      setPorCobrar(data.porCobrar || [])
      setCobrados(data.cobrados || [])
      if (data.cobradores) {
        setCobradores(data.cobradores)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Error al cargar la ruta del día",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRuta()
  }, [fecha, selectedCobradorId])

  // Guardar orden en BD
  const saveOrder = async (updatedList: PrestamoConDetalles[]) => {
    setSavingOrder(true)
    try {
      const ids = updatedList.map(item => item.id)
      const response = await fetch("/api/ruta-del-dia", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orden: ids,
          fecha,
          userId: selectedCobradorId || undefined
        })
      })
      
      if (!response.ok) {
        throw new Error("No se pudo guardar el orden de la ruta")
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error de Guardado",
        description: "No se pudo sincronizar el nuevo orden con el servidor.",
        variant: "destructive"
      })
    } finally {
      setSavingOrder(false)
    }
  }

  // Funciones de movimiento con flechas (Móvil)
  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...porCobrar]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    setPorCobrar(updated)
    saveOrder(updated)
  }

  const moveDown = (index: number) => {
    if (index === porCobrar.length - 1) return
    const updated = [...porCobrar]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    setPorCobrar(updated)
    saveOrder(updated)
  }

  // Eventos de Drag & Drop (HTML5)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return
    
    const updated = [...porCobrar]
    const [draggedItem] = updated.splice(draggedIndex, 1)
    updated.splice(targetIndex, 0, draggedItem)
    
    setDraggedIndex(null)
    setPorCobrar(updated)
    saveOrder(updated)
  }

  const handleRegistrarPago = (prestamo: PrestamoConDetalles) => {
    // Adaptar formato a PrestamoConCliente que requiere el modal
    const adaptedPrestamo = {
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
    }
    setSelectedPrestamo(adaptedPrestamo)
    setIsPagoModalOpen(true)
  }

  const handlePagoSuccess = () => {
    setIsPagoModalOpen(false)
    loadRuta()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Cabecera superior */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            {/* Título y botón atrás */}
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Ruta del Día 🗺️
                </h1>
                <p className="text-xs text-gray-500">
                  Organiza y registra los cobros de tus rutas
                </p>
              </div>
            </div>

            {/* Selectores de Filtro */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Botón Ver Pagados (útil en móvil) */}
              <Button 
                variant="outline" 
                className="flex items-center space-x-2 text-green-700 bg-green-50 border-green-200 hover:bg-green-100 lg:hidden"
                onClick={() => {
                  document.getElementById('seccion-cobrados')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Ver Pagados ({cobrados.length})</span>
              </Button>

              {/* Selector de fecha */}
              <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input 
                  type="date" 
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
                />
              </div>

              {/* Selector de Cobrador (Sólo Admin/Supervisor) */}
              {(user?.role === "ADMINISTRADOR" || user?.role === "SUPERVISOR") && cobradores.length > 0 && (
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                  <User className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedCobradorId}
                    onChange={(e) => setSelectedCobradorId(e.target.value)}
                    className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="">Mi Ruta (Cobrador)</option>
                    {cobradores.map(cob => (
                      <option key={cob.id} value={cob.id}>
                        {cob.firstName || cob.name} {cob.lastName || ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            <p className="text-gray-500 text-sm">Cargando listado de la ruta...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Columna 1: Por Cobrar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-600 text-white rounded-full px-2.5 py-0.5 font-bold text-sm">
                    {porCobrar.length}
                  </Badge>
                  <h2 className="text-lg font-bold text-gray-800">Por Cobrar</h2>
                </div>
                {savingOrder && (
                  <span className="text-xs text-gray-400 animate-pulse">Sincronizando ruta...</span>
                )}
              </div>

              {porCobrar.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">¡Ruta limpia para hoy!</p>
                  <p className="text-gray-500 text-xs mt-1">No hay cobros programados o todos ya fueron saldados.</p>
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
                        className={`bg-white border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing flex ${
                          esMora ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-teal-500'
                        }`}
                      >
                        {/* Control de arrastre */}
                        <div className="flex flex-col items-center justify-center px-2 text-gray-300 border-r border-gray-100 hover:text-gray-500 transition-colors">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        {/* Contenido de la card */}
                        <div className="flex-1 p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-gray-900 text-base leading-tight">
                                {item.cliente.nombre} {item.cliente.apellido}
                              </h3>
                              
                              <div className="flex flex-wrap gap-2 mt-1">
                                {esMora ? (
                                  <Badge variant="destructive" className="bg-red-100 text-red-800 text-[10px] py-0 px-2 font-semibold">
                                    Mora: {item.diasMora} días
                                  </Badge>
                                ) : (
                                  <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 text-[10px] py-0 px-2 font-semibold border-none">
                                    Cobro Regular
                                  </Badge>
                                )}
                                <span className="text-[11px] text-gray-400 capitalize bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                  {item.tipoPago.toLowerCase().replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                            
                            {/* D&D Flechas para Móviles */}
                            <div className="flex items-center space-x-1 border border-gray-100 rounded-lg p-0.5 bg-gray-50 sm:hidden">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-gray-500"
                                onClick={() => moveUp(index)}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-gray-500"
                                onClick={() => moveDown(index)}
                                disabled={index === porCobrar.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* D&D Flechas para computadoras (visibles al hover o siempre al lado) */}
                            <div className="hidden sm:flex items-center space-x-1 border border-gray-100 rounded-lg p-0.5 bg-gray-50">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-gray-400 hover:text-gray-700"
                                onClick={() => moveUp(index)}
                                disabled={index === 0}
                                title="Subir"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-gray-400 hover:text-gray-700"
                                onClick={() => moveDown(index)}
                                disabled={index === porCobrar.length - 1}
                                title="Bajar"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Detalles del pago */}
                          <div className="grid grid-cols-2 gap-4 mt-3 bg-gray-50 rounded-lg p-3 text-xs border border-gray-100">
                            <div>
                              <span className="text-gray-500 block">Cuota sugerida:</span>
                              <span className="font-bold text-gray-900 text-sm">
                                {formatCurrency(item.valorCuota)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">Saldo pendiente:</span>
                              <span className="font-bold text-red-600 text-sm">
                                {formatCurrency(item.saldoPendiente)}
                              </span>
                            </div>
                          </div>

                          {/* Dirección / Ubicación */}
                          {(item.cliente.direccionCobro || item.cliente.direccionCliente) && (
                            <div className="flex items-start space-x-1.5 mt-3 text-xs text-gray-500">
                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">
                                {item.cliente.direccionCobro || item.cliente.direccionCliente}
                              </span>
                            </div>
                          )}

                          {/* Enlaces de comunicación */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                            <div className="flex space-x-2">
                              {/* Llamar */}
                              {item.cliente.telefono && (
                                <a href={`tel:${item.cliente.telefono}`}>
                                  <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">
                                    <Phone className="h-3.5 w-3.5 text-blue-600 mr-1.5" />
                                    Llamar
                                  </Button>
                                </a>
                              )}
                              
                              {/* WhatsApp */}
                              {item.cliente.telefono && (
                                <a 
                                  href={`https://wa.me/${item.cliente.telefono.replace(/\D/g, "")}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">
                                    <MessageCircle className="h-3.5 w-3.5 text-green-600 mr-1.5" />
                                    WhatsApp
                                  </Button>
                                </a>
                              )}

                              {/* Google Maps link */}
                              {item.cliente.mapLink && (
                                <a href={item.cliente.mapLink} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">
                                    <Navigation className="h-3.5 w-3.5 text-red-600 mr-1.5" />
                                    Ubicación
                                  </Button>
                                </a>
                              )}
                            </div>

                            <Button 
                              size="sm" 
                              className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium"
                              onClick={() => handleRegistrarPago(item)}
                            >
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              Pagar
                            </Button>
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Columna 2: Cobrados */}
            <div id="seccion-cobrados">
              <div className="flex items-center space-x-2 mb-4">
                <Badge className="bg-green-600 text-white rounded-full px-2.5 py-0.5 font-bold text-sm">
                  {cobrados.length}
                </Badge>
                <h2 className="text-lg font-bold text-gray-800">Cobrados / Abonaron</h2>
              </div>

              {cobrados.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-gray-500 text-sm">Aún no se registran cobros</p>
                  <p className="text-xs mt-1">Los clientes pagados aparecerán aquí.</p>
                </div>
              ) : (
                <div className="space-y-3 opacity-90">
                  {cobrados.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-green-500 shadow-sm bg-green-50/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-gray-900 text-base leading-tight">
                              {item.cliente.nombre} {item.cliente.apellido}
                            </h3>
                            <span className="text-[10px] text-gray-500 block mt-0.5">
                              ID Préstamo: {item.id.substring(0, 8)}...
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-gray-500 block">Abonado hoy:</span>
                            <span className="font-extrabold text-green-700 text-base">
                              {formatCurrency(item.pagadoHoyMonto)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 mt-3 text-xs text-green-700 bg-green-100/70 py-1.5 px-3 rounded-lg border border-green-200/50">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="font-medium">Cobro registrado exitosamente</span>
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

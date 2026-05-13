
"use client"

import { useState, useEffect } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  MapPin,
  DollarSign,
  RefreshCw,
  Filter,
  Search,
  Download,
  UserPlus,
  CreditCard,
  Target,
  AlertCircle,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"

interface PrestamoDetallado {
  id: string
  cliente: string
  documento: string
  telefono?: string
  direccion?: string
  monto: number
  interes: number
  tipoPago: string
  valorCuota: number
  cuotas: number
  fechaInicio: string
  fechaFin: string
  totalPagado: number
  saldoPendiente: number
  cuotasPagadas: number
  porcentajePagado: string
  ultimoPago: string | null
  estaVencido?: boolean
  diasVencido?: number
  cuotasVencidas?: number
  fechaCompletado?: string
}

interface InformeClientes {
  fecha: string
  resumen: {
    totalClientes: number
    totalPrestamos: number
    clientesVisitadosHoy: number
    clientesNoVisitadosHoy: number
    prestamosVencidos: number
    nuevosClientesHoy: number
    nuevosPrestamosHoy: number
    cobrosHoy: number
    totalCobradoHoy: number
    clientesConMora: number
    prestamosCancelados: number
    prestamosNuevosHoyCount: number
    prestamosVencidosCount: number
    prestamosEnMora: number
  }
  detalles: {
    clientesVisitados: Array<{
      id: string
      nombre: string
      documento: string
      telefono?: string
      direccion?: string
      ultimaVisita: string | null
      visitadoPor: string | null
      tipoVisita: string | null
      observaciones: string | null
      prestamosActivos: number
      totalPrestado: number
      totalPagado: number
      saldoPendiente: number
      prestamosVencidos: number
      diasMora: number
    }>
    clientesNoVisitados: Array<{
      id: string
      nombre: string
      documento: string
      telefono?: string
      direccion?: string
      prestamosActivos: number
      montoTotal: number
      totalPrestado: number
      totalPagado: number
      saldoPendiente: number
      prestamosVencidos: number
      ultimaVisita: string | null
      diasSinVisita: number | null
      diasMora: number
    }>
    prestamosVencidos: Array<{
      id: string
      cliente: string
      documento: string
      telefono?: string
      direccion?: string
      monto: number
      valorCuota: number
      cuotas: number
      fechaVencimiento: string
      diasVencido: number
      totalPagado: number
      saldoPendiente: number
      cuotasPagadas: number
      porcentajePagado: string
      ultimoPago: string | null
    }>
    nuevosClientes: Array<{
      id: string
      nombre: string
      documento: string
      telefono?: string
      direccion?: string
      fechaRegistro: string
      totalPrestamos: number
      prestamosActivos: number
      tienePrestamo: boolean
      montoPrimerPrestamo: number | null
      tipoPagoPrimerPrestamo: string | null
      interesPrimerPrestamo: number | null
    }>
    nuevosPrestamos: Array<{
      id: string
      cliente: string
      documento: string
      telefono?: string
      direccion?: string
      monto: number
      interes: number
      tipoPago: string
      valorCuota: number
      cuotas: number
      fechaInicio: string
      fechaFin: string
      creadoPor: string
      totalPagado: number
      cuotasPagadas: number
      porcentajePagado: string
      pagosRealizados: number
    }>
    cobrosHoy: Array<{
      id: string
      cliente: string
      documento: string
      telefono?: string
      monto: number
      fecha: string
      prestamoId: string
      montoPrestamo: number
      valorCuota: number
      cuotasTotales: number
      totalPagado: number
      saldoPendiente: number
      cuotasPagadas: number
      porcentajePagado: string
      cobradoPor: string
      observaciones?: string
    }>
    clientesConMora: Array<{
      id: string
      nombre: string
      documento: string
      telefono?: string
      direccion?: string
      prestamosEnMora: number
      montoTotal: number
      totalPrestado: number
      totalPagado: number
      saldoPendiente: number
      diasMora: number
      ultimaVisita: string | null
      diasSinGestion: number | null
      cuotasVencidas: number
    }>
    todosPrestamosTotales: PrestamoDetallado[]
    prestamosCanceladosLista: PrestamoDetallado[]
    prestamosEnMoraLista: PrestamoDetallado[]
  }
}

interface InformeClientesClientProps {
  session: Session
}

export default function InformeClientesClient({ session }: InformeClientesClientProps) {
  const [informe, setInforme] = useState<InformeClientes | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("resumen")
  const [activePrestamoTab, setActivePrestamoTab] = useState("nuevos")
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    // Usar fecha local para evitar problemas de zona horaria con toISOString()
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [filtroTexto, setFiltroTexto] = useState("")
  const { toast } = useToast()

  // Estado para el diálogo de confirmación de eliminación
  const [clienteAEliminar, setClienteAEliminar] = useState<{ id: string, nombre: string } | null>(null)
  const [eliminandoCliente, setEliminandoCliente] = useState(false)

  const fetchInforme = async (fecha: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/informe-clientes?fecha=${fecha}`)
      if (response.ok) {
        const data = await response.json()
        setInforme(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar el informe",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInforme(fechaSeleccionada)
  }, [fechaSeleccionada])

  // Auto-refresh when clients are added, updated, or deleted
  useEffect(() => {
    const handleClienteChange = () => {
      console.log('🔄 Cliente modificado, refrescando informe...')
      fetchInforme(fechaSeleccionada)
    }

    // Listen for custom events
    window.addEventListener('clienteCreado', handleClienteChange)
    window.addEventListener('clienteActualizado', handleClienteChange)
    window.addEventListener('clienteEliminado', handleClienteChange)

    // Cleanup
    return () => {
      window.removeEventListener('clienteCreado', handleClienteChange)
      window.removeEventListener('clienteActualizado', handleClienteChange)
      window.removeEventListener('clienteEliminado', handleClienteChange)
    }
  }, [fechaSeleccionada])

  const confirmarEliminacion = (clienteId: string, clienteNombre: string) => {
    setClienteAEliminar({ id: clienteId, nombre: clienteNombre })
  }

  const hacerEliminacion = async () => {
    if (!clienteAEliminar) return

    setEliminandoCliente(true)
    const { id: clienteId } = clienteAEliminar

    try {
      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Cliente eliminado",
          description: "El cliente ha sido eliminado permanentemente",
        })

        // Emitir evento para actualizar otros componentes
        window.dispatchEvent(new CustomEvent('clienteEliminado', { detail: { id: clienteId } }))

        // Refrescar el informe
        fetchInforme(fechaSeleccionada)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo eliminar el cliente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al eliminar:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setEliminandoCliente(false)
      setClienteAEliminar(null)
    }
  }

  const { format: formatCurrency } = useCurrency()

  const formatDate = (dateString: string) => {
    // Si la fecha viene como YYYY-MM-DD (longitud 10), agregar T00:00:00 para que
    // el navegador la interprete como hora local media noche, en lugar de UTC.
    // Esto evita que se muestre el día anterior por diferencias horarias.
    const dateToParse = dateString.length === 10 ? `${dateString}T00:00:00` : dateString

    return new Date(dateToParse).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Informe de Clientes</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInforme(fechaSeleccionada)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        {/* Selector de fecha */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="fecha">Fecha del informe</Label>
            <Input
              id="fecha"
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 max-w-xs">
            <Label htmlFor="filtro">Buscar en detalles</Label>
            <Input
              id="filtro"
              type="text"
              placeholder="Buscar cliente, documento..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {informe && (
          <div className="space-y-6">
            {/* Header del informe */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {formatDate(informe.fecha)}
              </h2>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1">
                <TabsTrigger value="resumen" className="text-xs sm:text-sm px-2 py-2 h-auto">Resumen</TabsTrigger>
                <TabsTrigger value="visitados" className="text-xs sm:text-sm px-2 py-2 h-auto">Visitados</TabsTrigger>
                <TabsTrigger value="no-visitados" className="text-xs sm:text-sm px-2 py-2 h-auto">No Visitados</TabsTrigger>
                <TabsTrigger value="vencidos" className="text-xs sm:text-sm px-2 py-2 h-auto">Vencidos</TabsTrigger>
                <TabsTrigger value="nuevos" className="text-xs sm:text-sm px-2 py-2 h-auto">Clientes</TabsTrigger>
                <TabsTrigger value="cobros" className="text-xs sm:text-sm px-2 py-2 h-auto">Cobros</TabsTrigger>
                <TabsTrigger value="mora" className="text-xs sm:text-sm px-2 py-2 h-auto">Con Mora</TabsTrigger>
                <TabsTrigger value="prestamos" className="text-xs sm:text-sm px-2 py-2 h-auto">Préstamos</TabsTrigger>
              </TabsList>

              {/* TAB RESUMEN */}
              <TabsContent value="resumen" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-medium leading-tight">Total Clientes</CardTitle>
                      <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-blue-600">
                        {informe.resumen.totalClientes}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow" style={{ animationDelay: '0.1s' }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-medium leading-tight">Préstamos Activos</CardTitle>
                      <CreditCard className="h-5 w-5 text-green-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-green-600">
                        {informe.resumen.totalPrestamos}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow" style={{ animationDelay: '0.2s' }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-medium leading-tight">Visitados Hoy</CardTitle>
                      <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-emerald-600">
                        {informe.resumen.clientesVisitadosHoy}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow" style={{ animationDelay: '0.3s' }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-medium leading-tight">No Visitados</CardTitle>
                      <XCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-orange-600">
                        {informe.resumen.clientesNoVisitadosHoy}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow" style={{ animationDelay: '0.4s' }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-xs sm:text-sm font-medium leading-tight">
                        Préstamos<br className="sm:hidden" /><span className="hidden sm:inline"> </span>Vencidos
                      </CardTitle>
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-red-600">
                        {informe.resumen.prestamosVencidos}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow" style={{ animationDelay: '0.5s' }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-medium leading-tight">Nuevos Clientes</CardTitle>
                      <UserPlus className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-purple-600">
                        {informe.resumen.nuevosClientesHoy}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow" style={{ animationDelay: '0.6s' }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-medium leading-tight">Nuevos Préstamos</CardTitle>
                      <TrendingUp className="h-5 w-5 text-teal-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-teal-600">
                        {informe.resumen.nuevosPrestamosHoy}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow" style={{ animationDelay: '0.7s' }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-medium leading-tight">Cobros Hoy</CardTitle>
                      <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-green-600">
                        {informe.resumen.cobrosHoy}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatCurrency(informe.resumen.totalCobradoHoy)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="animate-fadeInScale min-h-[120px] hover:shadow-lg transition-shadow" style={{ animationDelay: '0.8s' }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-xs sm:text-sm font-medium leading-tight">
                        Clientes<br className="sm:hidden" /><span className="hidden sm:inline"> </span>Con Mora
                      </CardTitle>
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-red-600">
                        {informe.resumen.clientesConMora}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* TAB CLIENTES VISITADOS */}
              <TabsContent value="visitados" className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Clientes Visitados Hoy</h3>
                  <Badge variant="secondary">{informe.detalles.clientesVisitados.length}</Badge>
                </div>
                <div className="space-y-3">
                  {informe.detalles.clientesVisitados
                    .filter(cliente =>
                      filtroTexto === "" ||
                      cliente.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                      cliente.documento.includes(filtroTexto)
                    )
                    .map((cliente, index) => (
                      <Card key={cliente.id} className="animate-fadeInScale" style={{ animationDelay: `${index * 0.1}s` }}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Encabezado del cliente */}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <h4 className="font-semibold text-gray-900">{cliente.nombre}</h4>
                                  <Badge variant="outline" className="bg-green-50 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Visitado
                                  </Badge>
                                  {cliente.prestamosVencidos > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {cliente.prestamosVencidos} vencido{cliente.prestamosVencidos !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{cliente.documento}</p>
                                {cliente.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{cliente.telefono}</span>
                                  </div>
                                )}
                                {cliente.direccion && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{cliente.direccion}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary">
                                  {cliente.prestamosActivos} préstamo{cliente.prestamosActivos !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </div>

                            {/* Información financiera */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-xs text-gray-500">Total Prestado</p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {formatCurrency(cliente.totalPrestado)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Total Pagado</p>
                                <p className="text-sm font-semibold text-green-600">
                                  {formatCurrency(cliente.totalPagado)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Saldo Pendiente</p>
                                <p className="text-sm font-semibold text-orange-600">
                                  {formatCurrency(cliente.saldoPendiente)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Porcentaje Pagado</p>
                                <p className="text-sm font-semibold text-purple-600">
                                  {((cliente.totalPagado / cliente.totalPrestado) * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>

                            {/* Información de la visita */}
                            <div className="pt-2 border-t space-y-1">
                              {cliente.ultimaVisita && (
                                <p className="text-sm text-green-600">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Visitado: {formatDateTime(cliente.ultimaVisita)}
                                </p>
                              )}
                              {cliente.visitadoPor && (
                                <p className="text-sm text-gray-600">
                                  Por: {cliente.visitadoPor}
                                </p>
                              )}
                              {cliente.tipoVisita && (
                                <Badge variant="outline" className="text-xs">
                                  {cliente.tipoVisita}
                                </Badge>
                              )}
                              {cliente.observaciones && (
                                <p className="text-sm text-gray-500 italic mt-1">
                                  "{cliente.observaciones}"
                                </p>
                              )}
                              {cliente.diasMora > 0 && (
                                <p className="text-sm text-red-600 font-medium">
                                  ⚠️ Mora de {cliente.diasMora} días
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {informe.detalles.clientesVisitados.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        No hay clientes visitados hoy
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* TAB CLIENTES NO VISITADOS */}
              <TabsContent value="no-visitados" className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Clientes No Visitados</h3>
                  <Badge variant="destructive">{informe.detalles.clientesNoVisitados.length}</Badge>
                </div>
                <div className="space-y-3">
                  {informe.detalles.clientesNoVisitados
                    .filter(cliente =>
                      filtroTexto === "" ||
                      cliente.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                      cliente.documento.includes(filtroTexto)
                    )
                    .map((cliente, index) => (
                      <Card key={cliente.id} className="animate-fadeInScale border-l-4 border-l-orange-400" style={{ animationDelay: `${index * 0.1}s` }}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Encabezado del cliente */}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <h4 className="font-semibold text-gray-900">{cliente.nombre}</h4>
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Pendiente
                                  </Badge>
                                  {cliente.prestamosVencidos > 0 && (
                                    <Badge variant="destructive" className="text-xs bg-red-600">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {cliente.prestamosVencidos} vencido{cliente.prestamosVencidos !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {cliente.diasSinVisita && cliente.diasSinVisita > 7 && (
                                    <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                                      {cliente.diasSinVisita} días sin visitar
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{cliente.documento}</p>
                                {cliente.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{cliente.telefono}</span>
                                  </div>
                                )}
                                {cliente.direccion && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{cliente.direccion}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary">
                                  {cliente.prestamosActivos} préstamo{cliente.prestamosActivos !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </div>

                            {/* Información financiera */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <div>
                                <p className="text-xs text-gray-600">Total Prestado</p>
                                <p className="text-sm font-semibold text-blue-700">
                                  {formatCurrency(cliente.totalPrestado)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Total Pagado</p>
                                <p className="text-sm font-semibold text-green-700">
                                  {formatCurrency(cliente.totalPagado)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Saldo Pendiente</p>
                                <p className="text-sm font-semibold text-red-700">
                                  {formatCurrency(cliente.saldoPendiente)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">% Pagado</p>
                                <p className="text-sm font-semibold text-purple-700">
                                  {cliente.totalPrestado > 0 ? ((cliente.totalPagado / cliente.totalPrestado) * 100).toFixed(1) : '0'}%
                                </p>
                              </div>
                            </div>

                            {/* Alertas y última visita */}
                            <div className="pt-2 border-t space-y-1">
                              {cliente.ultimaVisita && (
                                <p className="text-sm text-gray-600">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Última visita: {new Date(cliente.ultimaVisita).toLocaleDateString('es-CO')}
                                  {cliente.diasSinVisita && ` (hace ${cliente.diasSinVisita} días)`}
                                </p>
                              )}
                              {!cliente.ultimaVisita && (
                                <p className="text-sm text-orange-600 font-medium">
                                  ⚠️ Nunca ha sido visitado
                                </p>
                              )}
                              {cliente.diasMora > 0 && (
                                <p className="text-sm text-red-600 font-bold">
                                  🚨 Mora de {cliente.diasMora} días - REQUIERE ATENCIÓN URGENTE
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {informe.detalles.clientesNoVisitados.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                        ¡Excelente! Todos los clientes fueron visitados hoy
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* TAB PRÉSTAMOS VENCIDOS */}
              <TabsContent value="vencidos" className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Préstamos Vencidos</h3>
                  <Badge variant="destructive">{informe.detalles.prestamosVencidos.length}</Badge>
                </div>
                <div className="space-y-3">
                  {informe.detalles.prestamosVencidos
                    .filter(prestamo =>
                      filtroTexto === "" ||
                      prestamo.cliente.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                      prestamo.documento.includes(filtroTexto)
                    )
                    .map((prestamo, index) => (
                      <Card key={prestamo.id} className="animate-fadeInScale border-l-4 border-l-red-500" style={{ animationDelay: `${index * 0.1}s` }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-gray-900">{prestamo.cliente}</h4>
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {prestamo.diasVencido} días vencido
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{prestamo.documento}</p>
                              {prestamo.telefono && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm text-gray-600">{prestamo.telefono}</span>
                                </div>
                              )}
                              {prestamo.direccion && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <MapPin className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm text-gray-600">{prestamo.direccion}</span>
                                </div>
                              )}
                              <p className="text-sm text-red-600 mt-1">
                                Venció: {new Date(prestamo.fechaVencimiento).toLocaleDateString('es-CO')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-600">
                                {formatCurrency(prestamo.monto)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Cuota: {formatCurrency(prestamo.valorCuota)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {informe.detalles.prestamosVencidos.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                        No hay préstamos vencidos
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* TAB NUEVOS */}
              <TabsContent value="nuevos" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Nuevos Clientes */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Listado de Clientes</h3>
                      <Badge variant="secondary">{informe.detalles.nuevosClientes.length}</Badge>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {informe.detalles.nuevosClientes.map((cliente, index) => (
                        <Card key={cliente.id} className="animate-fadeInScale" style={{ animationDelay: `${index * 0.1}s` }}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-semibold text-gray-900">{cliente.nombre}</h4>

                                </div>
                                <p className="text-sm text-gray-600">{cliente.documento}</p>
                                {cliente.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{cliente.telefono}</span>
                                  </div>
                                )}
                                <p className="text-sm text-purple-600 mt-1">
                                  Registrado: {formatDateTime(cliente.fechaRegistro)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmarEliminacion(cliente.id, cliente.nombre)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Eliminar cliente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {informe.detalles.nuevosClientes.length === 0 && (
                        <Card>
                          <CardContent className="p-6 text-center text-gray-500">
                            <UserPlus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            No hay clientes registrados
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>


                </div>
              </TabsContent>

              {/* TAB COBROS */}
              <TabsContent value="cobros" className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Cobros de Hoy</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{informe.detalles.cobrosHoy.length}</Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {formatCurrency(informe.resumen.totalCobradoHoy)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  {informe.detalles.cobrosHoy
                    .filter(cobro =>
                      filtroTexto === "" ||
                      cobro.cliente.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                      cobro.documento.includes(filtroTexto)
                    )
                    .map((cobro, index) => (
                      <Card key={cobro.id} className="animate-fadeInScale border-l-4 border-l-green-400" style={{ animationDelay: `${index * 0.1}s` }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-gray-900">{cobro.cliente}</h4>
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Cobro
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{cobro.documento}</p>
                              <p className="text-sm text-gray-500">
                                Por: {cobro.cobradoPor}
                              </p>
                              <p className="text-sm text-green-600">
                                {formatDateTime(cobro.fecha)}
                              </p>
                              {cobro.observaciones && (
                                <p className="text-sm text-gray-500 italic mt-1">
                                  "{cobro.observaciones}"
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(cobro.monto)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {informe.detalles.cobrosHoy.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        No hay cobros registrados hoy
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* TAB CLIENTES CON MORA */}
              <TabsContent value="mora" className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Clientes con Mora</h3>
                  <Badge variant="destructive">{informe.detalles.clientesConMora.length}</Badge>
                </div>
                <div className="space-y-3">
                  {informe.detalles.clientesConMora
                    .filter(cliente =>
                      filtroTexto === "" ||
                      cliente.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                      cliente.documento.includes(filtroTexto)
                    )
                    .sort((a, b) => b.diasMora - a.diasMora)
                    .map((cliente, index) => (
                      <Card key={cliente.id} className="animate-fadeInScale border-l-4 border-l-red-500" style={{ animationDelay: `${index * 0.1}s` }}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Encabezado del cliente */}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <h4 className="font-semibold text-gray-900">{cliente.nombre}</h4>
                                  <Badge variant="destructive">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {cliente.diasMora} días mora
                                  </Badge>
                                  {cliente.cuotasVencidas > 0 && (
                                    <Badge variant="destructive" className="text-xs bg-red-700">
                                      {cliente.cuotasVencidas} cuotas vencidas
                                    </Badge>
                                  )}
                                  {cliente.diasSinGestion && cliente.diasSinGestion > 3 && (
                                    <Badge variant="outline" className="text-xs text-red-700 border-red-300">
                                      Sin gestión: {cliente.diasSinGestion} días
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{cliente.documento}</p>
                                {cliente.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{cliente.telefono}</span>
                                  </div>
                                )}
                                {cliente.direccion && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{cliente.direccion}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="mb-2">
                                  {cliente.prestamosEnMora} préstamo{cliente.prestamosEnMora !== 1 ? 's' : ''} en mora
                                </Badge>
                              </div>
                            </div>

                            {/* Información financiera detallada */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                              <div>
                                <p className="text-xs text-gray-600">Total Prestado</p>
                                <p className="text-sm font-semibold text-blue-700">
                                  {formatCurrency(cliente.totalPrestado)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Total Pagado</p>
                                <p className="text-sm font-semibold text-green-700">
                                  {formatCurrency(cliente.totalPagado)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Saldo Pendiente</p>
                                <p className="text-sm font-bold text-red-700">
                                  {formatCurrency(cliente.saldoPendiente)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">% Pagado</p>
                                <p className="text-sm font-semibold text-purple-700">
                                  {cliente.totalPrestado > 0 ? ((cliente.totalPagado / cliente.totalPrestado) * 100).toFixed(1) : '0'}%
                                </p>
                              </div>
                            </div>

                            {/* Estado de gestión */}
                            <div className="pt-2 border-t space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Días en mora:</span>
                                <span className="text-sm font-bold text-red-600">{cliente.diasMora} días</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Cuotas vencidas:</span>
                                <span className="text-sm font-bold text-red-600">{cliente.cuotasVencidas}</span>
                              </div>
                              {cliente.ultimaVisita ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Última gestión:</span>
                                  <span className="text-sm text-gray-900">
                                    {new Date(cliente.ultimaVisita).toLocaleDateString('es-CO')}
                                    {cliente.diasSinGestion && ` (hace ${cliente.diasSinGestion} días)`}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-sm text-red-600 font-bold">
                                  ⚠️ SIN GESTIÓN REGISTRADA
                                </p>
                              )}
                              {cliente.diasSinGestion && cliente.diasSinGestion > 7 && (
                                <p className="text-sm text-red-600 font-bold bg-red-100 p-2 rounded">
                                  🚨 REQUIERE GESTIÓN INMEDIATA - {cliente.diasSinGestion} días sin contacto
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {informe.detalles.clientesConMora.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                        No hay clientes con mora
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* TAB PRÉSTAMOS DE CLIENTES */}
              <TabsContent value="prestamos" className="space-y-6 mt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Gestión de Préstamos</h3>
                  <p className="text-sm text-gray-600">Visualiza todos los préstamos organizados por categoría</p>
                </div>

                {/* Sub-pestañas de préstamos */}
                <Tabs value={activePrestamoTab} onValueChange={setActivePrestamoTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 h-auto p-1">
                    <TabsTrigger value="nuevos" className="text-xs sm:text-sm px-2 py-2 h-auto">
                      Nuevos ({informe.detalles.nuevosPrestamos.length})
                    </TabsTrigger>
                    <TabsTrigger value="total" className="text-xs sm:text-sm px-2 py-2 h-auto">
                      Total ({informe.detalles.todosPrestamosTotales?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="cancelados" className="text-xs sm:text-sm px-2 py-2 h-auto">
                      Cancelados ({informe.detalles.prestamosCanceladosLista?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="vencidos" className="text-xs sm:text-sm px-2 py-2 h-auto">
                      Vencidos ({informe.detalles.prestamosVencidos.length})
                    </TabsTrigger>
                    <TabsTrigger value="mora" className="text-xs sm:text-sm px-2 py-2 h-auto">
                      En Mora ({informe.detalles.prestamosEnMoraLista?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  {/* SUB-TAB: Préstamos Nuevos */}
                  <TabsContent value="nuevos" className="mt-4">
                    <div className="mb-4">
                      <h4 className="text-md font-semibold">Préstamos Nuevos del Día</h4>
                      <p className="text-sm text-gray-600">Préstamos creados en la fecha seleccionada</p>
                    </div>
                    <div className="space-y-3">
                      {informe.detalles.nuevosPrestamos.map((prestamo, index) => (
                        <Card key={prestamo.id} className="animate-fadeInScale" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <h4 className="font-semibold text-gray-900">{prestamo.cliente}</h4>
                                  <Badge variant="outline" className="bg-teal-50 text-teal-700">
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Nuevo
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{prestamo.documento}</p>
                                {prestamo.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.telefono}</span>
                                  </div>
                                )}
                                {prestamo.direccion && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.direccion}</span>
                                  </div>
                                )}
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-600">
                                    Tipo: <span className="font-medium">{prestamo.tipoPago}</span> •
                                    Interés: <span className="font-medium">{prestamo.interes}%</span>
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Cuota: <span className="font-medium">{formatCurrency(prestamo.valorCuota)}</span> × {prestamo.cuotas}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Creado por: {prestamo.creadoPor}
                                  </p>
                                  <p className="text-sm text-teal-600">
                                    {formatDateTime(prestamo.fechaInicio)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-teal-600">
                                  {formatCurrency(prestamo.monto)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Monto total</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {informe.detalles.nuevosPrestamos.length === 0 && (
                        <Card>
                          <CardContent className="p-8 text-center text-gray-500">
                            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            No hay préstamos nuevos en esta fecha
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* SUB-TAB: Préstamos Total */}
                  <TabsContent value="total" className="mt-4">
                    <div className="mb-4">
                      <h4 className="text-md font-semibold">Todos los Préstamos Activos</h4>
                      <p className="text-sm text-gray-600">Listado completo de préstamos activos en el sistema</p>
                    </div>
                    <div className="space-y-3">
                      {informe.detalles.todosPrestamosTotales?.map((prestamo, index) => (
                        <Card key={prestamo.id} className="animate-fadeInScale" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <h4 className="font-semibold text-gray-900">{prestamo.cliente}</h4>
                                  <Badge variant="secondary">Activo</Badge>
                                  {prestamo.estaVencido && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Vencido {prestamo.diasVencido} días
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{prestamo.documento}</p>
                                {prestamo.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.telefono}</span>
                                  </div>
                                )}
                                {prestamo.direccion && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.direccion}</span>
                                  </div>
                                )}
                                <div className="mt-2 grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded">
                                  <div>
                                    <p className="text-xs text-gray-500">Cuotas pagadas</p>
                                    <p className="text-sm font-semibold">{prestamo.cuotasPagadas} / {prestamo.cuotas}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">% Pagado</p>
                                    <p className="text-sm font-semibold text-green-600">{prestamo.porcentajePagado}%</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Saldo pendiente</p>
                                    <p className="text-sm font-semibold text-orange-600">{formatCurrency(prestamo.saldoPendiente)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Vencimiento</p>
                                    <p className="text-sm font-semibold">{new Date(prestamo.fechaFin).toLocaleDateString('es-CO')}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-blue-600">
                                  {formatCurrency(prestamo.monto)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Monto total</p>
                                <p className="text-xs text-green-600 mt-1">
                                  Pagado: {formatCurrency(prestamo.totalPagado)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {(!informe.detalles.todosPrestamosTotales || informe.detalles.todosPrestamosTotales.length === 0) && (
                        <Card>
                          <CardContent className="p-8 text-center text-gray-500">
                            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            No hay préstamos activos en el sistema
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* SUB-TAB: Préstamos Cancelados */}
                  <TabsContent value="cancelados" className="mt-4">
                    <div className="mb-4">
                      <h4 className="text-md font-semibold">Préstamos Cancelados</h4>
                      <p className="text-sm text-gray-600">Préstamos completados exitosamente</p>
                    </div>
                    <div className="space-y-3">
                      {informe.detalles.prestamosCanceladosLista?.map((prestamo, index) => (
                        <Card key={prestamo.id} className="animate-fadeInScale border-l-4 border-l-green-400" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <h4 className="font-semibold text-gray-900">{prestamo.cliente}</h4>
                                  <Badge variant="outline" className="bg-green-50 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completado
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{prestamo.documento}</p>
                                {prestamo.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.telefono}</span>
                                  </div>
                                )}
                                {prestamo.direccion && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.direccion}</span>
                                  </div>
                                )}
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-600">
                                    Tipo: <span className="font-medium">{prestamo.tipoPago}</span> •
                                    Interés: <span className="font-medium">{prestamo.interes}%</span>
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Cuotas: <span className="font-medium">{prestamo.cuotas}</span>
                                  </p>
                                  <p className="text-sm text-green-600">
                                    ✓ Totalmente pagado: {formatCurrency(prestamo.totalPagado)}
                                  </p>
                                  {prestamo.fechaCompletado && (
                                    <p className="text-sm text-gray-500">
                                      Completado: {new Date(prestamo.fechaCompletado).toLocaleDateString('es-CO')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">
                                  {formatCurrency(prestamo.monto)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Monto total</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {(!informe.detalles.prestamosCanceladosLista || informe.detalles.prestamosCanceladosLista.length === 0) && (
                        <Card>
                          <CardContent className="p-8 text-center text-gray-500">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            No hay préstamos cancelados registrados
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* SUB-TAB: Préstamos Vencidos */}
                  <TabsContent value="vencidos" className="mt-4">
                    <div className="mb-4">
                      <h4 className="text-md font-semibold">Préstamos Vencidos</h4>
                      <p className="text-sm text-gray-600">Préstamos con fecha de finalización vencida</p>
                    </div>
                    <div className="space-y-3">
                      {informe.detalles.prestamosVencidos.map((prestamo, index) => (
                        <Card key={prestamo.id} className="animate-fadeInScale border-l-4 border-l-orange-400" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <h4 className="font-semibold text-gray-900">{prestamo.cliente}</h4>
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {prestamo.diasVencido} días vencido
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{prestamo.documento}</p>
                                {prestamo.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.telefono}</span>
                                  </div>
                                )}
                                {prestamo.direccion && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.direccion}</span>
                                  </div>
                                )}
                                <div className="mt-2 grid grid-cols-2 gap-2 p-2 bg-orange-50 rounded">
                                  <div>
                                    <p className="text-xs text-gray-600">Cuotas pagadas</p>
                                    <p className="text-sm font-semibold">{prestamo.cuotasPagadas} / {prestamo.cuotas}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">% Pagado</p>
                                    <p className="text-sm font-semibold text-green-600">{prestamo.porcentajePagado}%</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Saldo pendiente</p>
                                    <p className="text-sm font-semibold text-red-600">{formatCurrency(prestamo.saldoPendiente)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Venció el</p>
                                    <p className="text-sm font-semibold text-red-600">{new Date(prestamo.fechaVencimiento).toLocaleDateString('es-CO')}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-orange-600">
                                  {formatCurrency(prestamo.monto)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Monto total</p>
                                <p className="text-xs text-green-600 mt-1">
                                  Pagado: {formatCurrency(prestamo.totalPagado)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {informe.detalles.prestamosVencidos.length === 0 && (
                        <Card>
                          <CardContent className="p-8 text-center text-gray-500">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                            ¡Excelente! No hay préstamos vencidos
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* SUB-TAB: Préstamos en Mora */}
                  <TabsContent value="mora" className="mt-4">
                    <div className="mb-4">
                      <h4 className="text-md font-semibold">Préstamos en Mora</h4>
                      <p className="text-sm text-gray-600">Préstamos vencidos que requieren atención inmediata</p>
                    </div>
                    <div className="space-y-3">
                      {informe.detalles.prestamosEnMoraLista?.map((prestamo, index) => (
                        <Card key={prestamo.id} className="animate-fadeInScale border-l-4 border-l-red-500" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <h4 className="font-semibold text-gray-900">{prestamo.cliente}</h4>
                                  <Badge variant="destructive">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Mora {prestamo.diasVencido} días
                                  </Badge>
                                  {prestamo.cuotasVencidas && prestamo.cuotasVencidas > 0 && (
                                    <Badge variant="destructive" className="text-xs bg-red-700">
                                      {prestamo.cuotasVencidas} cuotas vencidas
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{prestamo.documento}</p>
                                {prestamo.telefono && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.telefono}</span>
                                  </div>
                                )}
                                {prestamo.direccion && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{prestamo.direccion}</span>
                                  </div>
                                )}
                                <div className="mt-2 grid grid-cols-2 gap-2 p-2 bg-red-50 rounded border border-red-200">
                                  <div>
                                    <p className="text-xs text-gray-600">Cuotas pagadas</p>
                                    <p className="text-sm font-semibold">{prestamo.cuotasPagadas} / {prestamo.cuotas}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">% Pagado</p>
                                    <p className="text-sm font-semibold text-green-600">{prestamo.porcentajePagado}%</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Saldo pendiente</p>
                                    <p className="text-sm font-bold text-red-700">{formatCurrency(prestamo.saldoPendiente)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Días en mora</p>
                                    <p className="text-sm font-bold text-red-700">{prestamo.diasVencido} días</p>
                                  </div>
                                </div>
                                {prestamo.diasVencido && prestamo.diasVencido > 30 && (
                                  <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                                    <p className="text-sm text-red-700 font-bold">
                                      🚨 ATENCIÓN URGENTE - Mora mayor a 30 días
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-red-600">
                                  {formatCurrency(prestamo.monto)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Monto total</p>
                                <p className="text-xs text-green-600 mt-1">
                                  Pagado: {formatCurrency(prestamo.totalPagado)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {(!informe.detalles.prestamosEnMoraLista || informe.detalles.prestamosEnMoraLista.length === 0) && (
                        <Card>
                          <CardContent className="p-8 text-center text-gray-500">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                            ¡Perfecto! No hay préstamos en mora
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <AlertDialog open={!!clienteAEliminar} onOpenChange={(open) => !open && setClienteAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a <strong>{clienteAEliminar?.nombre}</strong>.
              <br /><br />
              <span className="text-red-600 font-semibold">Esta acción es permanente y no se puede deshacer.</span>
              <br />
              El cliente se borrará de la base de datos definitivamente. Solo puedes eliminar clientes que no tengan préstamos activos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoCliente}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                hacerEliminacion()
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={eliminandoCliente}
            >
              {eliminandoCliente ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

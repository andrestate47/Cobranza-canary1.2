
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Plus, DollarSign, Users, History, TrendingUp, TrendingDown, Wallet, Trash2, Banknote, ArrowLeft, Calendar as CalendarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "react-hot-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useCurrency } from "@/hooks/use-currency"

interface Cobrador {
  id: string
  nombre: string
  numeroRuta: string | null
  saldoActual: number
}

interface Movimiento {
  id: string
  cobradorId: string | null
  cobrador: string
  tipo: string
  monto: number
  saldoAnterior: number
  saldoNuevo: number
  fecha: string
  observaciones: string | null
  asignadoPor: string | null
}

export function ViaticosAdmin() {
  const router = useRouter()
  const { format: formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [cobradores, setCobradores] = useState<Cobrador[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTipo, setDialogTipo] = useState<"INGRESO" | "EGRESO">("INGRESO")
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [movimientoAEliminar, setMovimientoAEliminar] = useState<string | null>(null)
  const [esMontoInicial, setEsMontoInicial] = useState(false)
  const [esEgresoGeneral, setEsEgresoGeneral] = useState(false)

  // Form state
  const [selectedCobrador, setSelectedCobrador] = useState("")
  const [monto, setMonto] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [fechaMovimiento, setFechaMovimiento] = useState("")

  // Totales Globales
  const [totalesGlobales, setTotalesGlobales] = useState({
    totalApertura: 0,
    totalEntregas: 0,
    totalDevoluciones: 0,
    totalEgresosGenerales: 0,
    totalGastosCobradores: 0
  })

  // Date Filter & Tabs
  const [fechaSeleccionada, setFechaSeleccionada] = useState("")
  const [activeTab, setActiveTab] = useState("cobradores")

  const fetchData = async () => {
    try {
      setLoading(true)
      const url = fechaSeleccionada ? `/api/caja-chica/todos?fecha=${fechaSeleccionada}` : "/api/caja-chica/todos"
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setCobradores(data.cobradores)
        setMovimientos(data.movimientosRecientes)
        if (data.totalesGlobales) {
          setTotalesGlobales(data.totalesGlobales)
        }
      }
    } catch (error) {
      console.error("Error al cargar datos de caja:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fechaSeleccionada])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Si es monto inicial o egreso general, no necesita cobrador
    if (!esMontoInicial && !esEgresoGeneral && !selectedCobrador) {
      toast.error("Por favor selecciona un cobrador")
      return
    }
    
    if (!monto) {
      toast.error("Por favor ingresa un monto")
      return
    }

    try {
      setSubmitting(true)
      
      // Convertir comas a puntos para decimales, y dejar que parseFloat haga el resto
      const montoLimpio = monto.replace(/,/g, '.')
      const montoNumerico = parseFloat(montoLimpio)
      
      if (isNaN(montoNumerico) || montoNumerico <= 0) {
        toast.error("Por favor ingresa un monto válido")
        setSubmitting(false)
        return
      }
      
      let tipo = ""
      let body: {
        monto: number
        observaciones: string
        tipo?: string
        cobradorId?: string
        fecha?: string
      } = {
        monto: montoNumerico,
        observaciones,
        fecha: fechaMovimiento || fechaSeleccionada || undefined,
      }
      
      if (esMontoInicial) {
        tipo = "APERTURA_CAJA"
        body.tipo = tipo
      } else if (esEgresoGeneral) {
        tipo = "EGRESO_GENERAL"
        body.tipo = tipo
      } else {
        tipo = dialogTipo === "INGRESO" ? "ENTREGA" : "GASTO"
        body.cobradorId = selectedCobrador
        body.tipo = tipo
      }
      
      const response = await fetch("/api/caja-chica", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        const mensaje = esMontoInicial 
          ? "Monto inicial registrado exitosamente"
          : esEgresoGeneral
            ? "Egreso general registrado exitosamente"
            : `${dialogTipo === "INGRESO" ? "Ingreso" : "Egreso"} registrado exitosamente`
        toast.success(mensaje)
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast.error(data.error || "Error al registrar movimiento")
      }
    } catch (error) {
      console.error("Error al registrar movimiento:", error)
      toast.error("Error al registrar movimiento")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedCobrador("")
    setMonto("")
    setObservaciones("")
    setFechaMovimiento("")
    setEsMontoInicial(false)
    setEsEgresoGeneral(false)
  }

  const abrirDialogIngreso = () => {
    resetForm()
    setDialogTipo("INGRESO")
    setEsMontoInicial(false)
    setDialogOpen(true)
  }

  const abrirDialogEgreso = () => {
    resetForm()
    setDialogTipo("EGRESO")
    setEsMontoInicial(false)
    setEsEgresoGeneral(false)
    setDialogOpen(true)
  }

  const confirmarEliminarMovimiento = (movimientoId: string) => {
    setMovimientoAEliminar(movimientoId)
    setDeleteDialogOpen(true)
  }

  const eliminarMovimiento = async () => {
    if (!movimientoAEliminar) return

    try {
      const response = await fetch(`/api/caja-chica/${movimientoAEliminar}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Movimiento eliminado exitosamente")
        setDeleteDialogOpen(false)
        setMovimientoAEliminar(null)
        fetchData()
      } else {
        toast.error(data.error || "Error al eliminar movimiento")
      }
    } catch (error) {
      console.error("Error al eliminar movimiento:", error)
      toast.error("Error al eliminar movimiento")
    }
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      ENTREGA: "Entrega",
      DEVOLUCION: "Devolución",
      AJUSTE: "Ajuste",
      GASTO: "Gasto",
      APERTURA_CAJA: "Monto Inicial",
      EGRESO_GENERAL: "Egreso General",
    }
    return labels[tipo] || tipo
  }

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ENTREGA: "default",
      DEVOLUCION: "secondary",
      AJUSTE: "outline",
      GASTO: "destructive",
      APERTURA_CAJA: "default",
      EGRESO_GENERAL: "destructive",
    }
    return variants[tipo] || "default"
  }

  const totalViaticos = cobradores.reduce((sum, c) => sum + c.saldoActual, 0)
  
  // Usar los totales globales del servidor para los cálculos (no los movimientos filtrados)
  const { totalApertura, totalEntregas, totalDevoluciones, totalEgresosGenerales, totalGastosCobradores } = totalesGlobales

  // 1. Caja Central (Admin): Dinero físico en poder de la administración.
  const saldoCajaAdmin = totalApertura - totalEntregas - totalEgresosGenerales + totalDevoluciones

  // 2. Caja en Cobradores: Dinero activo entregado a los cobradores.
  // totalViaticos ya representa la suma de los saldos actuales.

  // 3. Fondo Consolidado (Total de la Empresa): Saldo Caja Admin + Dinero en Cobradores.
  const saldoConsolidado = saldoCajaAdmin + totalViaticos
  
  // 4. Egresos Totales: Suma de salidas definitivas de dinero.
  const totalEgresos = totalGastosCobradores + totalEgresosGenerales

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-[#0E1F1C]/90 border-b border-gray-200 dark:border-[#1F3A36] shadow-sm mb-6">
        <div className="container-mobile">
          <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:h-16 md:py-0">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
              >
                <ArrowLeft className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                Volver
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Viáticos / Caja Cobradores</h1>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start md:self-auto">
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                <Input
                  id="fecha"
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => {
                    const val = e.target.value
                    setFechaSeleccionada(val)
                    if (val) setActiveTab("movimientos")
                  }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="pl-9 h-9 w-[150px] bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white text-sm cursor-pointer"
                />
              </div>
              {fechaSeleccionada && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFechaSeleccionada("")}
                  className="text-xs text-gray-500 dark:text-gray-400 px-2 h-9"
                >
                  Limpiar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#1A3330]"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile space-y-6">
        {/* Tarjetas de Resumen */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Caja Central (Admin) */}
          <Card className="border-l-4 border-l-blue-500 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Caja Central (Admin)
              </CardTitle>
              <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 leading-tight">
                {formatCurrency(saldoCajaAdmin)}
              </div>
              <div className="text-xs text-gray-500 dark:text-emerald-300/80 mt-2">
                Dinero físico del administrador.
              </div>
            </CardContent>
          </Card>

          {/* Caja en Cobradores */}
          <Card className="border-l-4 border-l-purple-500 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                En Cobradores (Viáticos)
              </CardTitle>
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 leading-tight">
                {formatCurrency(totalViaticos)}
              </div>
              <div className="text-xs text-gray-500 dark:text-emerald-300/80 mt-2">
                Efectivo activo en manos de los cobradores.
              </div>
            </CardContent>
          </Card>
          
          {/* Fondo Consolidado */}
          <Card className={`border-l-4 ${saldoConsolidado >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'} bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Fondo Total Consolidado
              </CardTitle>
              <DollarSign className={`h-5 w-5 ${saldoConsolidado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} flex-shrink-0`} />
            </CardHeader>
            <CardContent className="pb-4">
              <div className={`text-xl md:text-2xl font-bold ${saldoConsolidado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} leading-tight`}>
                {formatCurrency(saldoConsolidado)}
              </div>
              <div className="text-xs text-gray-500 dark:text-emerald-300/80 mt-2">
                Dinero total disponible en el sistema.
              </div>
            </CardContent>
          </Card>

          {/* Egresos Totales */}
          <Card className="border-l-4 border-l-amber-500 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Egresos Totales (Gastos)
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400 leading-tight">
                {formatCurrency(totalEgresos)}
              </div>
              <div className="text-xs text-gray-500 dark:text-emerald-300/80 mt-2">
                Salidas reales de efectivo de la empresa.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Rápidas */}
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 dark:text-white">Acciones Rápidas</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  Registra ingresos y egresos para cobradores
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#1A3330]"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                onClick={abrirDialogIngreso}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-medium shadow-sm"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Registrar Ingreso
              </Button>
              <Button 
                onClick={abrirDialogEgreso}
                className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 text-white font-medium shadow-sm"
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Registrar Egreso
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs para Cobradores y Movimientos */}
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Detalle de Viáticos</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-[#152e2a]">
                <TabsTrigger value="cobradores" className="dark:data-[state=active]:bg-[#0E1F1C] dark:data-[state=active]:text-white">
                  <Users className="h-4 w-4 mr-2" />
                  Cobradores
                </TabsTrigger>
                <TabsTrigger value="movimientos" className="dark:data-[state=active]:bg-[#0E1F1C] dark:data-[state=active]:text-white flex items-center justify-center gap-1.5">
                  <History className="h-4 w-4" />
                  <span>Historial</span>
                  {fechaSeleccionada && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      Filtrado
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cobradores" className="space-y-4 mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p>Cargando cobradores...</p>
                    </div>
                  ) : cobradores.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay cobradores registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cobradores.map((cobrador) => (
                        <div
                          key={cobrador.id}
                          className="border border-gray-200 dark:border-[#1F3A36] rounded-lg p-4 flex items-center justify-between bg-white dark:bg-[#152e2a] hover:bg-gray-50 dark:hover:bg-[#1A3330] transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{cobrador.nombre}</p>
                            {cobrador.numeroRuta && (
                              <p className="text-sm text-gray-500 dark:text-emerald-300/80">Ruta {cobrador.numeroRuta}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-bold ${
                              cobrador.saldoActual > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"
                            }`}>
                              {formatCurrency(cobrador.saldoActual)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Saldo actual</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="movimientos" className="space-y-4 mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p>Cargando movimientos...</p>
                    </div>
                  ) : movimientos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay movimientos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {movimientos.map((mov) => {
                        const isApertura = mov.tipo === "APERTURA_CAJA"
                        const isEgresoGeneral = mov.tipo === "EGRESO_GENERAL"
                        const isIngreso = mov.tipo === "ENTREGA" || isApertura
                        const borderColor = isApertura ? "border-blue-500" : isIngreso ? "border-emerald-500" : "border-rose-500"
                        const montoColor = isApertura ? "text-blue-600 dark:text-blue-400" : isIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        
                        return (
                          <div
                            key={mov.id}
                            className={`border-l-4 ${borderColor} border-gray-200 dark:border-y-[#1F3A36] dark:border-r-[#1F3A36] rounded-lg p-4 bg-white dark:bg-[#152e2a] shadow-sm hover:shadow-md transition-shadow relative`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {isApertura ? "Monto Inicial de Caja" : isEgresoGeneral ? "Egreso General" : mov.cobrador}
                                </p>
                                <Badge variant={getTipoBadge(mov.tipo)} className="mt-1 dark:bg-[#1F3A36] dark:text-emerald-200 border-none">
                                  {getTipoLabel(mov.tipo)}
                                </Badge>
                              </div>
                              <div className="text-right flex items-start gap-2">
                                <span className={`text-base font-bold ${montoColor} leading-tight`}>
                                  {isIngreso ? "+" : "-"}{formatCurrency(mov.monto).replace(/^[^\d-]+/, '')}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => confirmarEliminarMovimiento(mov.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 h-8 w-8 p-0 flex-shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {!isApertura && !isEgresoGeneral && (
                              <div className="text-sm space-y-1 mt-3">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-emerald-300/80 flex-wrap">
                                  <span className="font-medium">Saldo:</span>
                                  <span>{formatCurrency(mov.saldoAnterior)}</span>
                                  <span>→</span>
                                  <span className="font-semibold">{formatCurrency(mov.saldoNuevo)}</span>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                  {format(new Date(mov.fecha), "PPp", { locale: es })}
                                </p>
                                {mov.asignadoPor && (
                                  <p className="text-gray-500 dark:text-gray-400">
                                    Por: {mov.asignadoPor}
                                  </p>
                                )}
                                {mov.observaciones && (
                                  <p className="text-gray-700 dark:text-emerald-200 mt-2 p-2 bg-gray-50 dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded italic">
                                    "{mov.observaciones}"
                                  </p>
                                )}
                              </div>
                            )}
                            {(isApertura || isEgresoGeneral) && (
                              <div className="text-sm space-y-1 mt-3">
                                <p className="text-gray-500 dark:text-gray-400">
                                  {format(new Date(mov.fecha), "PPp", { locale: es })}
                                </p>
                                {mov.asignadoPor && (
                                  <p className="text-gray-500 dark:text-gray-400">
                                    Registrado por: {mov.asignadoPor}
                                  </p>
                                )}
                                {mov.observaciones && (
                                  <p className="text-gray-700 dark:text-emerald-200 mt-2 p-2 bg-gray-50 dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded italic">
                                    "{mov.observaciones}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dialog para Ingreso/Egreso */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {esMontoInicial 
                ? "Registrar Monto Inicial" 
                : esEgresoGeneral
                  ? "Registrar Egreso General"
                  : dialogTipo === "INGRESO" 
                    ? "Registrar Ingreso" 
                    : "Registrar Egreso"}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {esMontoInicial 
                ? "Ingresa el monto con el que inicias la caja del día"
                : esEgresoGeneral
                  ? "Registra un gasto general que no está asociado a un cobrador específico"
                  : dialogTipo === "INGRESO" 
                    ? "Agrega dinero al viático de un cobrador"
                    : "Registra un gasto del viático de un cobrador"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {dialogTipo === "INGRESO" && !esMontoInicial && (
              <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-md">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEsMontoInicial(true)}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700 hover:text-white border-blue-600"
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Monto Inicial
                </Button>
                <span className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-blue-200">
                  ¿Registrar monto inicial del día?
                </span>
              </div>
            )}

            {dialogTipo === "EGRESO" && !esEgresoGeneral && (
              <div className="flex gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-md">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEsEgresoGeneral(true)}
                  className="flex-1 bg-rose-600 text-white hover:bg-rose-700 hover:text-white border-rose-600"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Egreso General
                </Button>
                <span className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-rose-200">
                  ¿Gasto no asociado a cobrador?
                </span>
              </div>
            )}

            {esMontoInicial && (
              <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-md items-center">
                <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="flex-1 text-sm font-medium text-blue-900 dark:text-blue-200">
                  Registrando Monto Inicial de Caja
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEsMontoInicial(false)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                  Cambiar a ingreso normal
                </Button>
              </div>
            )}

            {esEgresoGeneral && (
              <div className="flex gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-md items-center">
                <DollarSign className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <span className="flex-1 text-sm font-medium text-rose-900 dark:text-rose-200">
                  Registrando Egreso General
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEsEgresoGeneral(false)}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-700"
                >
                  Cambiar a egreso normal
                </Button>
              </div>
            )}

            {!esMontoInicial && !esEgresoGeneral && (
              <div>
                <Label htmlFor="cobrador" className="text-gray-700 dark:text-gray-200 font-semibold">Cobrador</Label>
                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                  <SelectTrigger className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar cobrador" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    {cobradores.map((cobrador) => (
                      <SelectItem key={cobrador.id} value={cobrador.id} className="dark:focus:bg-[#152e2a] dark:focus:text-white">
                        {cobrador.nombre} {cobrador.numeroRuta ? `(Ruta ${cobrador.numeroRuta})` : ""} - Saldo: {formatCurrency(cobrador.saldoActual)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="monto" className="text-gray-700 dark:text-gray-200 font-semibold">Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">$</span>
                <Input
                  id="monto"
                  type="text"
                  placeholder="5000000 o 5000000.50"
                  value={monto}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, '')
                    setMonto(value)
                  }}
                  className="pl-7 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                  required
                />
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                💡 Ingresa solo números (sin separadores): 5000000 para cinco millones
              </p>
            </div>

            <div>
              <Label htmlFor="fechaMovimiento" className="text-gray-700 dark:text-gray-200 font-semibold">Fecha (opcional - hoy por defecto)</Label>
              <Input
                id="fechaMovimiento"
                type="date"
                value={fechaMovimiento}
                onChange={(e) => setFechaMovimiento(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white cursor-pointer"
              />
            </div>

            <div>
              <Label htmlFor="observaciones" className="text-gray-700 dark:text-gray-200 font-semibold">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas adicionales..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="dark:bg-[#152e2a] dark:text-gray-200 dark:border-[#1F3A36]"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className={esMontoInicial ? "bg-blue-600 hover:bg-blue-700" : dialogTipo === "INGRESO" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
              >
                {submitting 
                  ? "Guardando..." 
                  : esMontoInicial 
                    ? "Registrar Monto Inicial" 
                    : esEgresoGeneral
                      ? "Registrar Egreso General"
                      : `Registrar ${dialogTipo === "INGRESO" ? "Ingreso" : "Egreso"}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para Confirmar Eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-300">
              Esta acción no se puede deshacer. El movimiento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMovimientoAEliminar(null)} className="dark:bg-[#152e2a] dark:text-gray-200 dark:border-[#1F3A36]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarMovimiento}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


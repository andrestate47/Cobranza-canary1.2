
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
import { RefreshCw, Plus, DollarSign, Users, History, TrendingUp, TrendingDown, Wallet, Trash2, Banknote, ArrowLeft } from "lucide-react"
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

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/caja-chica/todos")
      const data = await response.json()

      if (data.success) {
        setCobradores(data.cobradores)
        setMovimientos(data.movimientosRecientes)
      }
    } catch (error) {
      console.error("Error al cargar datos de caja:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
      
      // Limpiar el monto: eliminar separadores de miles (puntos) y dejar solo dígitos y punto decimal
      const montoLimpio = monto.replace(/\./g, '').replace(/,/g, '.')
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
      } = {
        monto: montoNumerico,
        observaciones,
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
  
  // Desglosar los tipos de movimientos para cálculos exactos
  const totalApertura = movimientos
    .filter(m => m.tipo === "APERTURA_CAJA")
    .reduce((sum, m) => sum + m.monto, 0)
  
  const totalEntregas = movimientos
    .filter(m => m.tipo === "ENTREGA")
    .reduce((sum, m) => sum + m.monto, 0)
  
  const totalDevoluciones = movimientos
    .filter(m => m.tipo === "DEVOLUCION")
    .reduce((sum, m) => sum + m.monto, 0)
  
  const totalEgresosGenerales = movimientos
    .filter(m => m.tipo === "EGRESO_GENERAL")
    .reduce((sum, m) => sum + m.monto, 0)
  
  const totalGastosCobradores = movimientos
    .filter(m => m.tipo === "GASTO")
    .reduce((sum, m) => sum + m.monto, 0)

  // 1. Caja Central (Admin): Dinero físico en poder de la administración.
  const saldoCajaAdmin = totalApertura - totalEntregas - totalEgresosGenerales + totalDevoluciones

  // 2. Caja en Cobradores: Dinero activo entregado a los cobradores.
  // totalViaticos ya representa la suma de los saldos actuales.

  // 3. Fondo Consolidado (Total de la Empresa): Saldo Caja Admin + Dinero en Cobradores.
  const saldoConsolidado = saldoCajaAdmin + totalViaticos
  
  // 4. Egresos Totales: Suma de salidas definitivas de dinero.
  const totalEgresos = totalGastosCobradores + totalEgresosGenerales

  return (
    <div className="space-y-6">
      {/* Header con botón volver */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Viáticos</h1>
            <p className="text-sm text-muted-foreground">Control de montos iniciales, ingresos y egresos</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Caja Central (Admin) */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Caja Central (Admin)
            </CardTitle>
            <Banknote className="h-5 w-5 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold text-blue-600 break-words whitespace-normal overflow-wrap-anywhere leading-tight">
              {formatCurrency(saldoCajaAdmin)}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Dinero físico del administrador.</p>
              <div className="bg-slate-50 p-1.5 rounded text-[10px] text-gray-500 font-mono leading-tight">
                <div>Inicial: {formatCurrency(totalApertura)}</div>
                <div>Entregas: -{formatCurrency(totalEntregas)}</div>
                <div>Egresos Grales: -{formatCurrency(totalEgresosGenerales)}</div>
                <div>Devoluciones: +{formatCurrency(totalDevoluciones)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Caja en Cobradores */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              En Cobradores (Viáticos)
            </CardTitle>
            <Users className="h-5 w-5 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold text-purple-600 break-words whitespace-normal overflow-wrap-anywhere leading-tight">
              {formatCurrency(totalViaticos)}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Efectivo activo en manos de los cobradores para gastos de ruta.</p>
              <div className="bg-slate-50 p-1.5 rounded text-[10px] text-gray-500 font-mono leading-tight">
                <div>Cobradores activos: {cobradores.length}</div>
                <div>Entregado: {formatCurrency(totalEntregas)}</div>
                <div>Gastado: -{formatCurrency(totalGastosCobradores)}</div>
                <div>Devuelto: -{formatCurrency(totalDevoluciones)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Fondo Consolidado */}
        <Card className={`border-l-4 ${saldoConsolidado >= 0 ? 'border-l-green-500' : 'border-l-red-500'} shadow-sm`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Fondo Total Consolidado
            </CardTitle>
            <DollarSign className={`h-5 w-5 ${saldoConsolidado >= 0 ? 'text-green-600' : 'text-red-600'} flex-shrink-0`} />
          </CardHeader>
          <CardContent className="pb-4">
            <div className={`text-xl font-bold ${saldoConsolidado >= 0 ? 'text-green-600' : 'text-red-600'} break-words whitespace-normal overflow-wrap-anywhere leading-tight`}>
              {formatCurrency(saldoConsolidado)}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Dinero total disponible en el sistema (Caja + Cobradores).</p>
              <div className="bg-slate-50 p-1.5 rounded text-[10px] text-gray-500 font-mono leading-tight">
                <div>Caja Central: {formatCurrency(saldoCajaAdmin)}</div>
                <div>En Cobradores: +{formatCurrency(totalViaticos)}</div>
                <div className="border-t border-gray-200 mt-1 pt-1 font-semibold text-gray-700">
                  Total: {formatCurrency(saldoConsolidado)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Egresos Totales */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Egresos Totales (Gastos)
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-amber-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold text-amber-600 break-words whitespace-normal overflow-wrap-anywhere leading-tight">
              {formatCurrency(totalEgresos)}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Salidas reales de efectivo de la empresa (gastos definitivos).</p>
              <div className="bg-slate-50 p-1.5 rounded text-[10px] text-gray-500 font-mono leading-tight">
                <div>Gastos de Cobradores: {formatCurrency(totalGastosCobradores)}</div>
                <div>Egresos Generales: +{formatCurrency(totalEgresosGenerales)}</div>
                <div className="border-t border-gray-200 mt-1 pt-1 font-semibold text-gray-700">
                  Total: {formatCurrency(totalEgresos)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Registra ingresos y egresos para cobradores
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={abrirDialogIngreso}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Registrar Ingreso
            </Button>
            <Button 
              onClick={abrirDialogEgreso}
              variant="destructive"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Registrar Egreso
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Ingreso/Egreso */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {esMontoInicial 
                ? "Registrar Monto Inicial" 
                : esEgresoGeneral
                  ? "Registrar Egreso General"
                  : dialogTipo === "INGRESO" 
                    ? "Registrar Ingreso" 
                    : "Registrar Egreso"}
            </DialogTitle>
            <DialogDescription>
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
              <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
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
                <span className="flex items-center text-sm text-gray-600">
                  ¿Necesitas registrar el monto inicial del día?
                </span>
              </div>
            )}

            {dialogTipo === "EGRESO" && !esEgresoGeneral && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEsEgresoGeneral(true)}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Egreso General
                </Button>
                <span className="flex items-center text-sm text-gray-600">
                  ¿Es un gasto que no está asociado a un cobrador?
                </span>
              </div>
            )}

            {esMontoInicial && (
              <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md items-center">
                <Banknote className="h-5 w-5 text-blue-600" />
                <span className="flex-1 text-sm font-medium text-blue-900">
                  Registrando Monto Inicial de Caja
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEsMontoInicial(false)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Cambiar a ingreso normal
                </Button>
              </div>
            )}

            {esEgresoGeneral && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-md items-center">
                <DollarSign className="h-5 w-5 text-red-600" />
                <span className="flex-1 text-sm font-medium text-red-900">
                  Registrando Egreso General
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEsEgresoGeneral(false)}
                  className="text-red-600 hover:text-red-700"
                >
                  Cambiar a egreso normal
                </Button>
              </div>
            )}

            {!esMontoInicial && !esEgresoGeneral && (
              <div>
                <Label htmlFor="cobrador">Cobrador</Label>
                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cobrador" />
                  </SelectTrigger>
                  <SelectContent>
                    {cobradores.map((cobrador) => (
                      <SelectItem key={cobrador.id} value={cobrador.id}>
                        {cobrador.nombre} {cobrador.numeroRuta ? `(Ruta ${cobrador.numeroRuta})` : ""} - Saldo: {formatCurrency(cobrador.saldoActual)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="monto">Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <Input
                  id="monto"
                  type="text"
                  placeholder="5000000 o 5000000.50"
                  value={monto}
                  onChange={(e) => {
                    // Solo permitir números, punto y coma
                    const value = e.target.value.replace(/[^\d.,]/g, '')
                    setMonto(value)
                  }}
                  className="pl-7"
                  required
                />
              </div>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                💡 Ingresa solo números (sin separadores): 5000000 para cinco millones
              </p>
            </div>

            <div>
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas adicionales..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className={esMontoInicial ? "bg-blue-600 hover:bg-blue-700" : dialogTipo === "INGRESO" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={dialogTipo === "EGRESO" && !esMontoInicial && !esEgresoGeneral ? "destructive" : "default"}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMovimientoAEliminar(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarMovimiento}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tabs para Cobradores y Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Viáticos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cobradores" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cobradores">
                <Users className="h-4 w-4 mr-2" />
                Cobradores
              </TabsTrigger>
              <TabsTrigger value="movimientos">
                <History className="h-4 w-4 mr-2" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cobradores" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Cargando cobradores...</p>
                  </div>
                ) : cobradores.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay cobradores registrados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cobradores.map((cobrador) => (
                      <div
                        key={cobrador.id}
                        className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{cobrador.nombre}</p>
                          {cobrador.numeroRuta && (
                            <p className="text-sm text-gray-500">Ruta {cobrador.numeroRuta}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${
                            cobrador.saldoActual > 0 ? "text-green-600" : "text-gray-400"
                          }`}>
                            {formatCurrency(cobrador.saldoActual)}
                          </p>
                          <p className="text-xs text-gray-500">Saldo actual</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="movimientos" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Cargando movimientos...</p>
                  </div>
                ) : movimientos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay movimientos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {movimientos.map((mov) => {
                      const isApertura = mov.tipo === "APERTURA_CAJA"
                      const isEgresoGeneral = mov.tipo === "EGRESO_GENERAL"
                      const isIngreso = mov.tipo === "ENTREGA" || isApertura
                      const borderColor = isApertura ? "border-blue-500" : isIngreso ? "border-green-500" : "border-red-500"
                      const montoColor = isApertura ? "text-blue-600" : isIngreso ? "text-green-600" : "text-red-600"
                      
                      return (
                        <div
                          key={mov.id}
                          className={`border-l-4 ${borderColor} rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow relative`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                {isApertura ? "Monto Inicial de Caja" : isEgresoGeneral ? "Egreso General" : mov.cobrador}
                              </p>
                              <Badge variant={getTipoBadge(mov.tipo)} className="mt-1">
                                {getTipoLabel(mov.tipo)}
                              </Badge>
                            </div>
                            <div className="text-right flex items-start gap-2">
                              <span className={`text-base font-bold ${montoColor} break-words whitespace-normal overflow-wrap-anywhere leading-tight`}>
                                {isIngreso ? "+" : "-"}{formatCurrency(mov.monto).replace(/^[^\d-]+/, '')}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmarEliminarMovimiento(mov.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {!isApertura && !isEgresoGeneral && (
                            <div className="text-sm space-y-1 mt-3">
                              <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                                <span className="font-medium">Saldo:</span>
                                <span className="break-words">{formatCurrency(mov.saldoAnterior)}</span>
                                <span>→</span>
                                <span className="font-semibold break-words">{formatCurrency(mov.saldoNuevo)}</span>
                              </div>
                              <p className="text-gray-500">
                                {format(new Date(mov.fecha), "PPp", { locale: es })}
                              </p>
                              {mov.asignadoPor && (
                                <p className="text-gray-500">
                                  Por: {mov.asignadoPor}
                                </p>
                              )}
                              {mov.observaciones && (
                                <p className="text-gray-700 mt-2 p-2 bg-gray-50 rounded italic">
                                  "{mov.observaciones}"
                                </p>
                              )}
                            </div>
                          )}
                          {(isApertura || isEgresoGeneral) && (
                            <div className="text-sm space-y-1 mt-3">
                              <p className="text-gray-500">
                                {format(new Date(mov.fecha), "PPp", { locale: es })}
                              </p>
                              {mov.asignadoPor && (
                                <p className="text-gray-500">
                                  Registrado por: {mov.asignadoPor}
                                </p>
                              )}
                              {mov.observaciones && (
                                <p className="text-gray-700 mt-2 p-2 bg-gray-50 rounded italic">
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
  )
}

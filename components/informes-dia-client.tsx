
"use client"

import { useState, useEffect } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  Eye,
  Lock,
  CheckCircle,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"

interface InformeDelDia {
  fecha: string
  nombreCobrador: string
  numeroRuta: string
  nombreRuta: string
  cobradorId: string | null
  rutaId: string | null
  totalCobrado: number
  totalCobradoEfectivo: number
  totalCobradoTransferencia: number
  totalCobradoDeposito: number
  moraCobrada: number
  dineroTransferencia: number
  totalPrestado: number
  totalPrestadoEfectivo: number
  totalPrestadoTransferencia: number
  totalGastos: number
  saldoInicial: number
  saldoEfectivo: number
  totalPorCobrar: number
  expectativaCobroHoy: number
  cerrado: boolean
  cierreId?: string
  cantidadPagos: number
  cantidadPrestamos: number
  cantidadGastos: number
  resumenClientes: {
    clientesNuevos: number
    clientesVisitados: number
    clientesPendientes: number
    clientesPorVisitar: number
    clientesMora: number
  }
  resumenPrestamos: {
    nuevosPrestamos: number
    prestamosRealizados: number
  }
  resumenRenovaciones: {
    renovacionClientes: number
    clientesPorRenovar: number
    renovacionesPendientes: number
    renovacionesRealizadas: number
  }
  resumenTransferencias: {
    totalTransferencia: number
    transferenciasRealizadas: number
    transferenciasPendientes: number
  }
  detallePagos: Array<{
    id: string
    monto: number
    mora: number
    metodoPago: string
    fecha: string
    observaciones?: string
    cliente: {
      nombre: string
      apellido: string
      documento: string
    }
  }>
  detallePrestamos: Array<{
    id: string
    monto: number
    interes: number
    fechaInicio: string
    cliente: {
      nombre: string
      apellido: string
    }
  }>
  detalleGastos: Array<{
    id: string
    concepto: string
    monto: number
    fecha: string
    observaciones?: string
  }>
  detalleClientesNuevos: Array<{
    id: string
    nombre: string
    apellido: string
    documento: string
  }>
  detalleClientesMora: Array<{
    id: string
    nombre: string
    apellido: string
    telefono: string
    prestamoId: string
    saldoPendiente: number
    diasMora: number
  }>
}

interface Cobrador {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  rutaId: string | null
  numeroRuta: string | null
}

interface InformesDiaClientProps {
  session: Session
}

export default function InformesDiaClient({ session }: InformesDiaClientProps) {
  const [informe, setInforme] = useState<InformeDelDia | null>(null)
  const [loading, setLoading] = useState(true)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [showDetalle, setShowDetalle] = useState(false)
  const [cobradores, setCobradores] = useState<Cobrador[]>([])
  const [cobradorSeleccionado, setCobradorSeleccionado] = useState<string>("")
  const { toast } = useToast()
  const { format: formatCurrency } = useCurrency()

  // Cargar lista de cobradores (solo si es admin)
  const fetchCobradores = async () => {
    try {
      const response = await fetch('/api/usuarios?role=COBRADOR')
      if (response.ok) {
        const data = await response.json()
        setCobradores(data)
      }
    } catch (error) {
      console.error("Error cargando cobradores:", error)
    }
  }

  useEffect(() => {
    if (session.user.role === 'ADMINISTRADOR') {
      fetchCobradores()
    }
  }, [session.user.role])

  const fetchInforme = async (fecha: string, userId?: string) => {
    setLoading(true)
    try {
      const url = userId 
        ? `/api/informes?fecha=${fecha}&userId=${userId}`
        : `/api/informes?fecha=${fecha}`
      const response = await fetch(url)
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
    fetchInforme(fechaSeleccionada, cobradorSeleccionado)
  }, [fechaSeleccionada, cobradorSeleccionado])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleCerrarDia = async () => {
    if (!informe) return

    if (session.user.role !== "ADMINISTRADOR") {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden cerrar el día",
        variant: "destructive",
      })
      return
    }

    // Verificar que se haya seleccionado un cobrador si es un admin viendo todas las rutas
    if (session.user.role === "ADMINISTRADOR" && !cobradorSeleccionado) {
      toast({
        title: "Selecciona un cobrador",
        description: "Debes seleccionar un cobrador específico para cerrar su caja. No puedes hacer un cierre global.",
        variant: "destructive",
      })
      return
    }

    // Usar el cobradorId del informe, o el usuario logueado como fallback
    const cobradorId = informe.cobradorId || session.user.id

    try {
      const response = await fetch('/api/cierre-dia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha: fechaSeleccionada,
          totalCobrado: informe.totalCobrado,
          totalPrestado: informe.totalPrestado,
          totalGastos: informe.totalGastos,
          saldoEfectivo: informe.saldoEfectivo,
          cobradorId: cobradorId
        }),
      })

      if (response.ok) {
        toast({
          title: "Día cerrado",
          description: "El cierre del día se ha registrado exitosamente",
        })
        fetchInforme(fechaSeleccionada, cobradorSeleccionado) // Recargar informe
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo cerrar el día",
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
    }
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
                <h1 className="text-lg font-semibold text-gray-900">Informes del Día</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInforme(fechaSeleccionada, cobradorSeleccionado)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        {/* Selectores de fecha y cobrador */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fecha">Fecha del informe</Label>
            <Input
              id="fecha"
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Selector de cobrador (solo para administradores) */}
          {session.user.role === 'ADMINISTRADOR' && (
            <div>
              <Label htmlFor="cobrador" className="font-bold text-gray-900 dark:text-gray-100">Cobrador</Label>
              <Select
                value={cobradorSeleccionado || ""}
                onValueChange={(value) => setCobradorSeleccionado(value)}
              >
                <SelectTrigger className="mt-1 font-bold text-gray-900 dark:text-gray-100 border-gray-400">
                  <SelectValue placeholder="Seleccione un cobrador" />
                </SelectTrigger>
                <SelectContent>
                  {cobradores.map((cobrador) => (
                    <SelectItem key={cobrador.id} value={cobrador.id} className="font-bold text-gray-900 dark:text-gray-100">
                      {cobrador.firstName} {cobrador.lastName}
                      {cobrador.numeroRuta && ` - Ruta ${cobrador.numeroRuta}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {informe && (
          <div className="space-y-6">
            {/* Header del informe */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {formatDate(informe.fecha)}
              </h2>
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center space-x-2">
                  {informe.cerrado ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Día Cerrado
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      Día Abierto
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Cobrador:</strong> {informe.nombreCobrador} | <strong>Ruta:</strong> {informe.numeroRuta} - {informe.nombreRuta}
                </div>
              </div>
            </div>

            {/* Tarjetas de resumen principal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Meta de Cobro Hoy */}
              <Card className="animate-fadeInScale border-blue-200 bg-blue-50/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-900">Cobro Esperado Hoy</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(informe.expectativaCobroHoy)}
                  </div>
                  <p className="text-xs text-blue-600/80 mt-1">
                    Meta a recoger según cuotas programadas
                  </p>
                </CardContent>
              </Card>

              {/* Total Recaudado */}
              <Card className="animate-fadeInScale" style={{ animationDelay: '0.05s' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recaudado Hoy</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(informe.totalCobrado)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {informe.cantidadPagos} cobro{informe.cantidadPagos !== 1 ? 's' : ''} registrado{informe.cantidadPagos !== 1 ? 's' : ''} hoy
                  </p>
                </CardContent>
              </Card>

              {/* Saldo en Caja General */}
              <Card className="animate-fadeInScale" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Caja de Hoy (Efectivo y Bancos)</CardTitle>
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    informe.saldoEfectivo >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(informe.saldoEfectivo)}
                  </div>
                  
                  <details className="mt-3 text-xs group cursor-pointer" open={false}>
                    <summary className="flex items-center justify-between font-medium text-muted-foreground outline-none list-none [&::-webkit-details-marker]:hidden">
                      Ver detalle de caja
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 space-y-2 border-t pt-3 pb-1">
                      <div className="flex justify-between items-center text-green-600 font-medium">
                        <span>(+) Caja Anterior</span>
                        <span>{formatCurrency(informe.saldoInicial)}</span>
                      </div>
                      <div className="flex justify-between items-center text-green-600 font-medium">
                        <span>(+) Cobrado en Efectivo</span>
                        <span>{formatCurrency(informe.totalCobradoEfectivo)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600 font-medium">
                        <span>(+) Transferencias Recibidas</span>
                        <span>{formatCurrency(informe.totalCobradoTransferencia)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600 font-medium">
                        <span>(+) Depósitos Recibidos</span>
                        <span>{formatCurrency(informe.totalCobradoDeposito)}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-500 font-medium">
                        <span>(-) Préstamos en Efectivo</span>
                        <span>{formatCurrency(informe.totalPrestadoEfectivo)}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-500 font-medium">
                        <span>(-) Préstamos por Transferencia</span>
                        <span>{formatCurrency(informe.totalPrestadoTransferencia)}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-500 font-medium">
                        <span>(-) Gastos Registrados</span>
                        <span>{formatCurrency(informe.totalGastos)}</span>
                      </div>
                      <div className={`flex justify-between items-center border-t pt-2 font-bold ${informe.saldoEfectivo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span>Balance General</span>
                        <span>{formatCurrency(informe.saldoEfectivo)}</span>
                      </div>
                    </div>
                  </details>
                </CardContent>
              </Card>

              {/* Transferencias */}
              <Card className="animate-fadeInScale" style={{ animationDelay: '0.15s' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dinero en Banco</CardTitle>
                  <RefreshCw className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(informe.dineroTransferencia)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recaudado por transferencias/depósitos
                  </p>
                </CardContent>
              </Card>

              {/* Mora Cobrada */}
              <Card className="animate-fadeInScale" style={{ animationDelay: '0.2s' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recargo por Mora</CardTitle>
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(informe.moraCobrada)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interés adicional cobrado por retrasos
                  </p>
                </CardContent>
              </Card>

              {/* Total en Calle (Cartera) */}
              <Card className="animate-fadeInScale" style={{ animationDelay: '0.25s' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total en Calle (Cartera)</CardTitle>
                  <DollarSign className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-700">
                    {formatCurrency(informe.totalPorCobrar)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suma total de saldos de créditos activos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Resumen de Clientes y Créditos */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumen de Clientes y Créditos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="animate-fadeInScale">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes Nuevos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {informe.resumenClientes.clientesNuevos}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registrados hoy en la ruta
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.1s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes Visitados (Con Abonos)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {informe.resumenClientes.clientesVisitados}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registraron abono o pago hoy
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.2s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes Pendientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {informe.resumenClientes.clientesPendientes}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tienen crédito activo pero no abonaron hoy
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.3s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes Restantes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {informe.resumenClientes.clientesPorVisitar}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Préstamos activos por cobrar en esta fecha
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.4s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes en Mora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-700">
                      {informe.resumenClientes.clientesMora}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Con préstamos vencidos
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Resumen de Préstamos */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Préstamos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="animate-fadeInScale">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nuevos Préstamos</CardTitle>
                    <TrendingDown className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {informe.resumenPrestamos.nuevosPrestamos}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Créditos nuevos entregados hoy
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.1s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Créditos Totales Activos</CardTitle>
                    <Wallet className="h-4 w-4 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-indigo-600">
                      {informe.resumenPrestamos.prestamosRealizados}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total de préstamos no cancelados
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.2s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Dinero Colocado</CardTitle>
                    <TrendingDown className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(informe.totalPrestado)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {informe.cantidadPrestamos} préstamo{informe.cantidadPrestamos !== 1 ? 's' : ''} entregado{informe.cantidadPrestamos !== 1 ? 's' : ''} hoy
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.3s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gastos Operativos</CardTitle>
                    <DollarSign className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(informe.totalGastos)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gastos declarados hoy ({informe.cantidadGastos} registro{informe.cantidadGastos !== 1 ? 's' : ''})
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Resumen de Refinanciamientos */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Refinanciamientos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="animate-fadeInScale">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Refinanciamiento Clientes</CardTitle>
                    <RefreshCw className="h-4 w-4 text-cyan-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-cyan-600">
                      {informe.resumenRenovaciones.renovacionClientes}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clientes con refinanciamientos
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.1s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes por Refinanciar</CardTitle>
                    <Calendar className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {informe.resumenRenovaciones.clientesPorRenovar}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Próximos a vencer
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.2s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Refinanciamiento Pendientes</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {informe.resumenRenovaciones.renovacionesPendientes}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Préstamos vencidos
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.3s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Refinanciamientos Realizados</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {informe.resumenRenovaciones.renovacionesRealizadas}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Refinanciados hoy
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Resumen de Transferencias */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Transferencias</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="animate-fadeInScale">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Transferencias</CardTitle>
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(informe.resumenTransferencias.totalTransferencia)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Monto total
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.1s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transferencias Realizadas</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {informe.resumenTransferencias.transferenciasRealizadas}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Completadas hoy
                    </p>
                  </CardContent>
                </Card>

                <Card className="animate-fadeInScale" style={{ animationDelay: '0.2s' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transferencias Pendientes</CardTitle>
                    <TrendingDown className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {informe.resumenTransferencias.transferenciasPendientes}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Por confirmar
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowDetalle(!showDetalle)}
                variant="outline"
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showDetalle ? 'Ocultar' : 'Ver'} Detalle
              </Button>

              {!informe.cerrado && session.user.role === "ADMINISTRADOR" && (
                <Button
                  onClick={handleCerrarDia}
                  className="flex-1 btn-primary"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar Día
                </Button>
              )}

              <Link href="/cierres-dia" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Historial
                </Button>
              </Link>
            </div>

            {/* Detalle */}
            {showDetalle && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slideInUp">
                {/* Detalle de pagos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pagos del día</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                    {informe.detallePagos.length > 0 ? (
                      informe.detallePagos.map(pago => (
                        <div key={pago.id} className="border-l-4 border-green-400 pl-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">
                                {pago.cliente.nombre} {pago.cliente.apellido}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(pago.fecha).toLocaleTimeString('es-CO')}
                              </p>
                              <p className="text-xs text-gray-600">
                                {pago.metodoPago}
                                {pago.mora > 0 && ` | Mora: ${formatCurrency(pago.mora)}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                {formatCurrency(pago.monto)}
                              </p>
                            </div>
                          </div>
                          {pago.observaciones && (
                            <p className="text-xs text-gray-500 mt-1">
                              {pago.observaciones}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No hay pagos registrados
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Detalle de préstamos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Préstamos del día</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                    {informe.detallePrestamos.length > 0 ? (
                      informe.detallePrestamos.map(prestamo => (
                        <div key={prestamo.id} className="border-l-4 border-blue-400 pl-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">
                                {prestamo.cliente.nombre} {prestamo.cliente.apellido}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(prestamo.fechaInicio).toLocaleTimeString('es-CO')}
                              </p>
                              <p className="text-xs text-gray-600">
                                Interés: {prestamo.interes}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-blue-600">
                                {formatCurrency(prestamo.monto)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No hay préstamos registrados
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Detalle de clientes en mora */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg text-red-700 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Clientes en Mora ({informe.resumenClientes.clientesMora})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                    {informe.detalleClientesMora && informe.detalleClientesMora.length > 0 ? (
                      informe.detalleClientesMora.map(cliente => (
                        <div key={cliente.id} className="border-l-4 border-red-500 pl-3 py-2 bg-red-50/50 rounded-r-md">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-sm text-gray-900">
                                {cliente.nombre} {cliente.apellido}
                              </p>
                              {cliente.telefono && (
                                <p className="text-xs text-gray-600">
                                  Tel: {cliente.telefono}
                                </p>
                              )}
                              <p className="text-xs text-red-600 font-medium mt-1">
                                Retraso: {cliente.diasMora} día(s)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Saldo pendiente:</p>
                              <p className="font-bold text-red-700">
                                {formatCurrency(cliente.saldoPendiente)}
                              </p>
                              <Link href={`/clientes/${cliente.id}`}>
                                <Button variant="link" size="sm" className="h-6 px-0 text-blue-600">
                                  Ver cliente
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No hay clientes en mora
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Detalle de gastos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Gastos del día</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                    {informe.detalleGastos.length > 0 ? (
                      informe.detalleGastos.map(gasto => (
                        <div key={gasto.id} className="border-l-4 border-red-400 pl-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">
                                {gasto.concepto}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(gasto.fecha).toLocaleTimeString('es-CO')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">
                                {formatCurrency(gasto.monto)}
                              </p>
                            </div>
                          </div>
                          {gasto.observaciones && (
                            <p className="text-xs text-gray-500 mt-1">
                              {gasto.observaciones}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No hay gastos registrados
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Detalle de clientes nuevos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Clientes Nuevos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                    {informe.detalleClientesNuevos.length > 0 ? (
                      informe.detalleClientesNuevos.map(cliente => (
                        <div key={cliente.id} className="border-l-4 border-blue-400 pl-3">
                          <div>
                            <p className="font-medium text-sm">
                              {cliente.nombre} {cliente.apellido}
                            </p>
                            <p className="text-xs text-gray-500">
                              Doc: {cliente.documento}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No hay clientes nuevos
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

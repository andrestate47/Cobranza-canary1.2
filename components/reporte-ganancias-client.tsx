

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
  Download,
  Filter,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator,
  Repeat,
  Users,
  CreditCard,
  ArrowRightLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"


interface PeriodoHistRuta {
  cobrado: number
  gastos: number
  perdidas: number
  invertido: number
}

interface ReporteGanancias {
  periodo: {
    fechaInicio: string
    fechaFin: string
  }
  metricas: {
    capitalInvertido: number
    balancePendiente: number
    capitalRecuperado: number
    capitalNoRecuperado: number
    totalIntereses: number
    interesesCobrados: number
    totalGastos: number
    moraCobrada: number
    utilidadNeta: number
    roi: number
    expectativaCobroPeriodo: number
  }
  estadisticas: {
    cantidadPrestamos: number
    cantidadPagos: number
    cantidadGastos: number
    cantidadClientesActivos: number
    prestamosAlDia: number
    prestamosVencidos: number
    promedioPrestamosDia: number
    promedioPagosDia: number
  }
  renovaciones: {
    generales: number
    nuevas: number
    pendientes: number
    porRealizar: number
    realizadas: number
    detalles: Array<{
      id: string
      cliente: string
      documento: string
      montoOriginal: number
      montoNuevo: number
      estado: string
      fechaCreacion: string
    }>
  }
  intereses: {
    totalGenerado: number
    totalGanado: number
    porCliente: Array<{
      clienteId: string
      nombre: string
      documento: string
      interesGenerado: number
      interesGanado: number
    }>
  }
  microseguros: {
    cantidadDevoluciones: number
    totalDevoluciones: number
    cobrado: number
    generado: number
    gananciaNeta: number
  }
  transferencias: {
    realizadas: number
    pendientes: number
    clientesTotales: number
    valorTotal: number
    detalles: Array<{
      id: string
      cliente: string
      documento: string
      monto: number
      fecha: string
    }>
  }
  salarios: {
    administradores: Array<{
      id: string
      nombre: string
      apellido: string
      nombreCompleto: string
      email: string
      salario: number
      pagoSemanal: number
      pagoQuincenal: number
      pagoMensual: number
      comisionPorCobro: number
    }>
    supervisores: Array<{
      id: string
      nombre: string
      apellido: string
      nombreCompleto: string
      email: string
      salario: number
      pagoSemanal: number
      pagoQuincenal: number
      pagoMensual: number
      comisionPorCobro: number
    }>
    cobradores: Array<{
      id: string
      numeroRuta: string
      nombre: string
      apellido: string
      nombreCompleto: string
      email: string
      salario: number
      pagoSemanal: number
      pagoQuincenal: number
      pagoMensual: number
      comisionPorCobro: number
    }>
    totalSalarios: number
    cantidadUsuarios: number
    totalesPorRol: {
      administradores: number
      supervisores: number
      cobradores: number
    }
    promediosPorRol: {
      administradores: number
      supervisores: number
      cobradores: number
    }
    pagosGenerales: {
      semanal: number
      quincenal: number
      mensual: number
    }
    porcentajesPorRol: {
      administradores: number
      supervisores: number
      cobradores: number
    }
  }
  rutas: Array<{
    cobradorId: string
    nombreCobrador: string
    numeroRuta: string
    totalCobradoEfectivo: number
    totalPrestadoEfectivo: number
    gastosOperativos: number
    gastosSueldos: number
    ingresosExtra?: number
    egresosExtra?: number
    balancePeriodo: number
    capitalInvertidoRuta: number
    regadoCalleRuta: number
    interesProyectadoRuta: number
    interesCobradoRuta: number
    perdidasRutaPeriodo: number
    historico: {
      semanal: PeriodoHistRuta
      mensual: PeriodoHistRuta
      semestral: PeriodoHistRuta
      anual: PeriodoHistRuta
    }
    detallesPagos: Array<{ id: string, cliente: string, monto: number, fecha: string, observaciones?: string }>
    detallesPrestamos: Array<{ id: string, cliente: string, monto: number, fecha: string }>
    detallesGastos: Array<{ id: string, concepto: string, monto: number, fecha: string }>
    detallesSueldos: Array<{ id: string, descripcion: string, monto: number, fecha: string }>
  }>
  detalles?: {
    prestamos?: Array<{
      id: string
      cliente: string
      documento: string
      monto: number
      interes: number
      saldoPendiente: number
      fechaInicio: string
      fechaVencimiento: string
      pagosEnPeriodo: number
      montoPagado: number
    }>
    pagos?: Array<{
      id: string
      cliente: string
      monto: number
      fecha: string
      prestamoId: string
      observaciones?: string
    }>
    gastos?: Array<{
      id: string
      concepto: string
      monto: number
      fecha: string
      observaciones?: string
    }>
  }
}

interface ReporteGananciasClientProps {
  session: Session
}

export default function ReporteGananciasClient({ session }: ReporteGananciasClientProps) {
  const [reporte, setReporte] = useState<ReporteGanancias | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("resumen")
  const [fechaInicio, setFechaInicio] = useState(() => {
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return primerDiaMes.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(() => {
    const hoy = new Date()
    return hoy.toISOString().split('T')[0]
  })
  const [selectedRuta, setSelectedRuta] = useState<ReporteGanancias['rutas'][0] | null>(null)
  const { toast } = useToast()

  const fetchReporte = async (inicio: string, fin: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reportes/ganancias?fechaInicio=${inicio}&fechaFin=${fin}`)
      if (response.ok) {
        const data = await response.json()
        setReporte(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar el reporte de ganancias",
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
    fetchReporte(fechaInicio, fechaFin)
  }, [fechaInicio, fechaFin])

  const { format: formatCurrency } = useCurrency()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const aplicarFiltroRapido = (tipo: string) => {
    const hoy = new Date()
    let inicio: Date
    let fin: Date = new Date(hoy)

    switch (tipo) {
      case 'hoy':
        inicio = new Date(hoy)
        break
      case 'semana':
        inicio = new Date(hoy)
        inicio.setDate(hoy.getDate() - 7)
        break
      case 'mes':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        break
      case 'trimestre':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)
        break
      case 'año':
        inicio = new Date(hoy.getFullYear(), 0, 1)
        break
      default:
        return
    }

    setFechaInicio(inicio.toISOString().split('T')[0])
    setFechaFin(fin.toISOString().split('T')[0])
  }

  const exportarReporte = () => {
    if (!reporte) return

    try {
      // Crear datos para exportar
      const datosExportacion = {
        titulo: "Reporte de Ganancias",
        periodo: `${formatDate(reporte.periodo.fechaInicio)} - ${formatDate(reporte.periodo.fechaFin)}`,
        metricas: {
          "Cobro Esperado del Período": formatCurrency(reporte.metricas.expectativaCobroPeriodo),
          "Capital Invertido": formatCurrency(reporte.metricas.capitalInvertido),
          "Balance Pendiente": formatCurrency(reporte.metricas.balancePendiente),
          "Capital Recuperado": formatCurrency(reporte.metricas.capitalRecuperado),
          "Capital No Recuperado": formatCurrency(reporte.metricas.capitalNoRecuperado),
          "Total Intereses": formatCurrency(reporte.metricas.totalIntereses),
          "Intereses Cobrados": formatCurrency(reporte.metricas.interesesCobrados),
          "Total de Gastos": formatCurrency(reporte.metricas.totalGastos),
          "Mora Cobrada": formatCurrency(reporte.metricas.moraCobrada),
          "Utilidad Neta": formatCurrency(reporte.metricas.utilidadNeta),
          "ROI (%)": formatPercentage(reporte.metricas.roi)
        },
        estadisticas: reporte.estadisticas,
        generado: new Date().toLocaleString('es-CO')
      }

      // Convertir a JSON y crear archivo
      const dataStr = JSON.stringify(datosExportacion, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)

      // Crear link de descarga
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte_ganancias_${fechaInicio}_${fechaFin}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Exportación exitosa",
        description: "El reporte se ha descargado correctamente",
      })
    } catch (error) {
      console.error("Error al exportar:", error)
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#071311] transition-colors">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    )
  }

  if (!reporte) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#071311] transition-colors">
        <div className="container-mobile py-4">
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No se pudo cargar el reporte
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Inténtalo de nuevo más tarde
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-[#0E1F1C]/90 border-b border-gray-200 dark:border-[#1F3A36] shadow-sm">
        <div className="container-mobile">
          <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:h-16 md:py-0">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Reporte de Ganancias</h1>
                <p className="text-xs text-gray-500 dark:text-emerald-300/80">
                  {formatDate(reporte.periodo.fechaInicio)} - {formatDate(reporte.periodo.fechaFin)}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportarReporte}
              className="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#1A3330] self-start md:self-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="container-mobile py-6 space-y-6">
        {/* Filtros de fecha */}
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Filter className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Filtros de Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filtros rápidos */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Períodos rápidos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { key: 'hoy', label: 'Hoy' },
                    { key: 'semana', label: 'Última semana' },
                    { key: 'mes', label: 'Este mes' },
                    { key: 'trimestre', label: 'Último trimestre' },
                    { key: 'año', label: 'Este año' }
                  ].map(filtro => (
                    <Button
                      key={filtro.key}
                      variant="outline"
                      size="sm"
                      onClick={() => aplicarFiltroRapido(filtro.key)}
                      className="text-gray-700 dark:text-emerald-300 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#152e2a]"
                    >
                      {filtro.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Rango personalizado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fechaInicio" className="text-gray-700 dark:text-gray-200 font-semibold">Fecha de inicio</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="fechaFin" className="text-gray-700 dark:text-gray-200 font-semibold">Fecha de fin</Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen por Rutas */}
        {reporte.rutas && reporte.rutas.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reporte de Ruta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reporte.rutas.map((ruta) => (
                <Card 
                  key={ruta.cobradorId} 
                  className="animate-fadeInScale bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors shadow-sm"
                  onClick={() => setSelectedRuta(ruta)}
                >
                  <CardHeader className="bg-gray-50/50 dark:bg-[#152e2a]/50 border-b border-gray-100 dark:border-[#1F3A36] pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                          {ruta.nombreCobrador}
                        </CardTitle>
                        <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-0.5">
                          Ruta {ruta.numeroRuta}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 text-gray-700 dark:text-emerald-300 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#152e2a]">Ver Detalles</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Cobrado (Efectivo)</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(ruta.totalCobradoEfectivo)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Prestado (Efectivo)</span>
                      <span className="font-semibold text-rose-500 dark:text-rose-400">-{formatCurrency(ruta.totalPrestadoEfectivo)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Gastos y Sueldos</span>
                      <span className="font-semibold text-rose-500 dark:text-rose-400">-{formatCurrency((ruta.gastosOperativos || 0) + (ruta.gastosSueldos || 0))}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t pt-1.5 border-dashed border-gray-200 dark:border-[#1F3A36]">
                      <span className="text-gray-500 dark:text-gray-400">Capital Invertido (Período)</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(ruta.capitalInvertidoRuta)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Regado en Calle (Cartera)</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(ruta.regadoCalleRuta)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 border-gray-200 dark:border-[#1F3A36]">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">Flujo Efectivo del Período</span>
                        <span className={`font-bold ${ruta.balancePeriodo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatCurrency(ruta.balancePeriodo)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Cobro Esperado del Período */}
          <Card className="border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-[#0E1F1C]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-200">Cobro Esperado del Período</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatCurrency(reporte.metricas.expectativaCobroPeriodo)}
              </div>
              <p className="text-xs text-blue-600/80 dark:text-blue-300/70 mt-1">
                Meta de cobro programado para el rango de fechas
              </p>
            </CardContent>
          </Card>

          {/* Capital Invertido */}
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Capital Invertido</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(reporte.metricas.capitalInvertido)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                {reporte.estadisticas.cantidadPrestamos} créditos creados en el período
              </p>
            </CardContent>
          </Card>

          {/* Balance Pendiente */}
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Total en Calle (Cartera Activa)</CardTitle>
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(reporte.metricas.balancePendiente)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                {reporte.estadisticas.prestamosAlDia + reporte.estadisticas.prestamosVencidos} préstamos con saldo pendiente
              </p>
            </CardContent>
          </Card>

          {/* Capital Recuperado */}
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Capital Recuperado (Cobrado)</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(reporte.metricas.capitalRecuperado)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                {reporte.estadisticas.cantidadPagos} pagos registrados en el período
              </p>
            </CardContent>
          </Card>

          {/* Capital No Recuperado */}
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Capital No Recuperado</CardTitle>
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(reporte.metricas.capitalNoRecuperado)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                {reporte.estadisticas.prestamosVencidos} préstamos vencidos sin saldo cancelado
              </p>
            </CardContent>
          </Card>

          {/* Total Intereses Proyectados */}
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Total Intereses Proyectados</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(reporte.metricas.totalIntereses)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                Intereses esperados de los nuevos préstamos
              </p>
            </CardContent>
          </Card>

          {/* Intereses Cobrados */}
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Intereses Cobrados</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(reporte.metricas.interesesCobrados)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                {formatPercentage((reporte.metricas.interesesCobrados / Math.max(reporte.metricas.totalIntereses, 1)) * 100)} del total proyectado
              </p>
            </CardContent>
          </Card>

          {/* Total de Gastos */}
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Total de Gastos</CardTitle>
              <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(reporte.metricas.totalGastos)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                {reporte.estadisticas.cantidadGastos} egresos registrados en caja chica
              </p>
            </CardContent>
          </Card>

          {/* Mora Cobrada */}
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Mora Cobrada</CardTitle>
              <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(reporte.metricas.moraCobrada)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                Recargos cobrados por pagos tardíos
              </p>
            </CardContent>
          </Card>

          {/* Utilidad Neta */}
          <Card className="md:col-span-2 lg:col-span-3 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-200">Utilidad Neta</CardTitle>
              <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${reporte.metricas.utilidadNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                {formatCurrency(reporte.metricas.utilidadNeta)}
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-1">
                Rendimiento neto (ROI: {formatPercentage(reporte.metricas.roi)})
              </p>
              <Badge variant={reporte.metricas.utilidadNeta >= 0 ? "default" : "destructive"} className="mt-2">
                {reporte.metricas.utilidadNeta >= 0 ? "Ganancia" : "Pérdida"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Renovaciones */}
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Repeat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Reporte de Renovaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-blue-50/50 dark:bg-[#152e2a] border border-blue-100 dark:border-[#1F3A36] rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reporte.renovaciones?.generales || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Renovaciones Generales</p>
              </div>
              <div className="text-center p-3 bg-emerald-50/50 dark:bg-[#152e2a] border border-emerald-100 dark:border-[#1F3A36] rounded-lg">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reporte.renovaciones?.nuevas || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Renovaciones Nuevas</p>
              </div>
              <div className="text-center p-3 bg-amber-50/50 dark:bg-[#152e2a] border border-amber-100 dark:border-[#1F3A36] rounded-lg">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reporte.renovaciones?.pendientes || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Renovaciones Pendientes</p>
              </div>
              <div className="text-center p-3 bg-purple-50/50 dark:bg-[#152e2a] border border-purple-100 dark:border-[#1F3A36] rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{reporte.renovaciones?.porRealizar || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Por Realizar</p>
              </div>
              <div className="text-center p-3 bg-emerald-50/50 dark:bg-[#152e2a] border border-emerald-100 dark:border-[#1F3A36] rounded-lg">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reporte.renovaciones?.realizadas || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Renovaciones Realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección de Intereses */}
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Intereses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-purple-50 dark:bg-[#152e2a] border border-purple-100 dark:border-[#1F3A36] rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(reporte.intereses?.totalGenerado || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Interés Total Generado</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-[#152e2a] border border-emerald-100 dark:border-[#1F3A36] rounded-lg">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(reporte.intereses?.totalGanado || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Interés Total Ganado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección de Microseguros */}
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Microseguros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-[#152e2a] rounded-lg border border-blue-100 dark:border-[#1F3A36]">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(reporte.microseguros?.cobrado || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Microseguro Cobrado</p>
              </div>
              <div className="text-center p-4 bg-rose-50 dark:bg-[#152e2a] rounded-lg border border-rose-100 dark:border-[#1F3A36]">
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(reporte.microseguros?.totalDevoluciones || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Devoluciones ({reporte.microseguros?.cantidadDevoluciones || 0})</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-[#152e2a] rounded-lg border border-purple-100 dark:border-[#1F3A36]">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(reporte.microseguros?.generado || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Proyectado (Nuevos)</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-[#152e2a] rounded-lg border border-emerald-100 dark:border-[#1F3A36]">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(reporte.microseguros?.gananciaNeta || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Ganancia Neta</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección de Transferencias */}
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <ArrowRightLeft className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Transferencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-emerald-50/50 dark:bg-[#152e2a] rounded-lg border border-emerald-100 dark:border-[#1F3A36]">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reporte.transferencias?.realizadas || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Transferencias Realizadas</p>
              </div>
              <div className="text-center p-3 bg-amber-50/50 dark:bg-[#152e2a] rounded-lg border border-amber-100 dark:border-[#1F3A36]">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reporte.transferencias?.pendientes || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Transferencias Pendientes</p>
              </div>
              <div className="text-center p-3 bg-blue-50/50 dark:bg-[#152e2a] rounded-lg border border-blue-100 dark:border-[#1F3A36]">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reporte.transferencias?.clientesTotales || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Clientes por Transferencia</p>
              </div>
              <div className="text-center p-3 bg-emerald-50/50 dark:bg-[#152e2a] rounded-lg border border-emerald-100 dark:border-[#1F3A36]">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(reporte.transferencias?.valorTotal || 0)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección de Salarios de Usuarios - Vista General */}
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Reporte de Salario de Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-[#152e2a] border border-blue-100 dark:border-[#1F3A36] rounded-lg">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(reporte.salarios?.totalSalarios || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total en Salarios Mensuales</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{reporte.salarios?.cantidadUsuarios || 0} usuarios activos</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-rose-50 dark:bg-[#152e2a] rounded-lg border border-rose-100 dark:border-[#1F3A36]">
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{reporte.salarios?.administradores?.length || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Administradores</p>
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 mt-1">
                    {formatCurrency(reporte.salarios?.totalesPorRol?.administradores || 0)}
                  </p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-[#152e2a] rounded-lg border border-blue-100 dark:border-[#1F3A36]">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{reporte.salarios?.supervisores?.length || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Supervisores</p>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mt-1">
                    {formatCurrency(reporte.salarios?.totalesPorRol?.supervisores || 0)}
                  </p>
                </div>
                <div className="text-center p-3 bg-emerald-50 dark:bg-[#152e2a] rounded-lg border border-emerald-100 dark:border-[#1F3A36]">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{reporte.salarios?.cobradores?.length || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Cobradores</p>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatCurrency(reporte.salarios?.totalesPorRol?.cobradores || 0)}
                  </p>
                </div>
              </div>

              {/* Pagos Generales Totales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-purple-50 dark:bg-[#152e2a] rounded-lg border border-purple-200 dark:border-[#1F3A36]">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Pago Semanal Total</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(reporte.salarios?.pagosGenerales?.semanal || 0)}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-[#152e2a] rounded-lg border border-purple-200 dark:border-[#1F3A36]">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Pago Quincenal Total</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(reporte.salarios?.pagosGenerales?.quincenal || 0)}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-[#152e2a] rounded-lg border border-purple-200 dark:border-[#1F3A36]">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Pago Mensual Total</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(reporte.salarios?.pagosGenerales?.mensual || 0)}
                  </p>
                </div>
              </div>

              {/* Distribución Porcentual */}
              <div className="p-4 bg-gray-50 dark:bg-[#152e2a] border border-gray-100 dark:border-[#1F3A36] rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Distribución de Gastos por Perfil</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-rose-500 rounded"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Administradores</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPercentage(reporte.salarios?.porcentajesPorRol?.administradores || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Supervisores</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPercentage(reporte.salarios?.porcentajesPorRol?.supervisores || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Cobradores</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPercentage(reporte.salarios?.porcentajesPorRol?.cobradores || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs para detalles */}
        <div className="space-y-4">
          <div className="flex overflow-x-auto space-x-1 bg-gray-200/70 dark:bg-[#152e2a] p-1 rounded-lg border border-gray-200 dark:border-[#1F3A36]">
            {[
              { key: 'resumen', label: 'Resumen' },
              { key: 'prestamos', label: 'Préstamos' },
              { key: 'pagos', label: 'Pagos' },
              { key: 'gastos', label: 'Gastos' },
              { key: 'renovaciones', label: 'Renovaciones' },
              { key: 'intereses', label: 'Intereses' },
              { key: 'transferencias', label: 'Transferencias' },
              { key: 'salarios', label: 'Salarios' }
            ].map(tab => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 text-xs sm:text-sm font-medium ${activeTab === tab.key
                  ? 'bg-white dark:bg-[#0E1F1C] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-[#1A3330]'
                  }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {activeTab === "resumen" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Estadísticas generales */}
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Estadísticas Generales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Clientes activos:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{reporte.estadisticas.cantidadClientesActivos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Promedio préstamos:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(reporte.estadisticas.promedioPrestamosDia)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Promedio pagos:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(reporte.estadisticas.promedioPagosDia)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Préstamos al día:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{reporte.estadisticas.prestamosAlDia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Préstamos vencidos:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{reporte.estadisticas.prestamosVencidos}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Análisis de rentabilidad */}
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <PieChart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Análisis de Rentabilidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Ingresos totales:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(reporte.metricas.capitalRecuperado + reporte.metricas.interesesCobrados + reporte.metricas.moraCobrada)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Egresos totales:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {formatCurrency(reporte.metricas.capitalInvertido + reporte.metricas.totalGastos)}
                    </span>
                  </div>
                  <div className="border-t pt-2 border-gray-200 dark:border-[#1F3A36]">
                    <div className="flex justify-between">
                      <span className="text-gray-900 dark:text-white font-medium">Margen de ganancia:</span>
                      <span className={`font-bold ${reporte.metricas.utilidadNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                        {formatPercentage(reporte.metricas.roi)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "prestamos" && (
            <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  Detalle de Préstamos ({reporte.detalles?.prestamos?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reporte.detalles?.prestamos && reporte.detalles.prestamos.length > 0 ? (
                    reporte.detalles.prestamos.map(prestamo => (
                      <div key={prestamo.id} className="border border-gray-200 dark:border-[#1F3A36] bg-white dark:bg-[#152e2a] rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{prestamo.cliente}</p>
                            <p className="text-sm text-gray-500 dark:text-emerald-300/80">CC: {prestamo.documento}</p>
                          </div>
                          <Badge variant={prestamo.saldoPendiente > 0 ? "secondary" : "default"}>
                            {prestamo.saldoPendiente > 0 ? "Pendiente" : "Pagado"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Monto:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(prestamo.monto)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Interés:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{prestamo.interes}%</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Saldo:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(prestamo.saldoPendiente)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Pagado:</span>
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(prestamo.montoPagado)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-[#1F3A36]">
                          <span>Inicio: {formatDate(prestamo.fechaInicio)}</span>
                          <span>Vencimiento: {formatDate(prestamo.fechaVencimiento)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay préstamos en este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "pagos" && (
            <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  Detalle de Pagos ({reporte.detalles?.pagos?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reporte.detalles?.pagos && reporte.detalles.pagos.length > 0 ? (
                    reporte.detalles.pagos.map(pago => (
                      <div key={pago.id} className="border-l-4 border-emerald-500 bg-white dark:bg-[#152e2a] border-y border-r border-gray-200 dark:border-y-[#1F3A36] dark:border-r-[#1F3A36] rounded-r-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{pago.cliente}</p>
                            <p className="text-sm text-gray-500 dark:text-emerald-300/80">{formatDate(pago.fecha)}</p>
                            {pago.observaciones && (
                              <p className="text-xs text-gray-600 dark:text-emerald-200 mt-1 bg-gray-50 dark:bg-[#0E1F1C] p-1.5 rounded">{pago.observaciones}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(pago.monto)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay pagos en este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "gastos" && (
            <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  Detalle de Gastos ({reporte.detalles?.gastos?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reporte.detalles?.gastos && reporte.detalles.gastos.length > 0 ? (
                    reporte.detalles.gastos.map(gasto => (
                      <div key={gasto.id} className="border-l-4 border-rose-500 bg-white dark:bg-[#152e2a] border-y border-r border-gray-200 dark:border-y-[#1F3A36] dark:border-r-[#1F3A36] rounded-r-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{gasto.concepto}</p>
                            <p className="text-sm text-gray-500 dark:text-emerald-300/80">{formatDate(gasto.fecha)}</p>
                            {gasto.observaciones && (
                              <p className="text-xs text-gray-600 dark:text-emerald-200 mt-1 bg-gray-50 dark:bg-[#0E1F1C] p-1.5 rounded">{gasto.observaciones}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrency(gasto.monto)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay gastos en este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "renovaciones" && (
            <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Detalle de Renovaciones ({reporte.renovaciones?.detalles?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reporte.renovaciones?.detalles && reporte.renovaciones.detalles.length > 0 ? (
                    reporte.renovaciones.detalles.map(renovacion => (
                      <div key={renovacion.id} className="border border-gray-200 dark:border-[#1F3A36] bg-white dark:bg-[#152e2a] rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{renovacion.cliente}</p>
                            <p className="text-sm text-gray-500 dark:text-emerald-300/80">CC: {renovacion.documento}</p>
                          </div>
                          <Badge variant={renovacion.estado === 'REALIZADA' ? "default" : "secondary"}>
                            {renovacion.estado}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Monto Original:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(renovacion.montoOriginal)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Monto Nuevo:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(renovacion.montoNuevo)}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-[#1F3A36]">
                          <span>Fecha: {formatDate(renovacion.fechaCreacion)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay renovaciones en este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "intereses" && (
            <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Intereses por Cliente ({reporte.intereses?.porCliente?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reporte.intereses?.porCliente && reporte.intereses.porCliente.length > 0 ? (
                    reporte.intereses.porCliente.map((cliente, index) => (
                      <div key={cliente.clienteId || index} className="border-l-4 border-purple-500 bg-white dark:bg-[#152e2a] border-y border-r border-gray-200 dark:border-y-[#1F3A36] dark:border-r-[#1F3A36] rounded-r-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{cliente.nombre}</p>
                            <p className="text-sm text-gray-500 dark:text-emerald-300/80">CC: {cliente.documento}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Generado</p>
                            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(cliente.interesGenerado)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ganado</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(cliente.interesGanado)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay datos de intereses por cliente en este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "transferencias" && (
            <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Detalle de Transferencias ({reporte.transferencias?.detalles?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reporte.transferencias?.detalles && reporte.transferencias.detalles.length > 0 ? (
                    reporte.transferencias.detalles.map(transferencia => (
                      <div key={transferencia.id} className="border-l-4 border-indigo-500 bg-white dark:bg-[#152e2a] border-y border-r border-gray-200 dark:border-y-[#1F3A36] dark:border-r-[#1F3A36] rounded-r-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{transferencia.cliente}</p>
                            <p className="text-sm text-gray-500 dark:text-emerald-300/80">CC: {transferencia.documento}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(transferencia.fecha)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(transferencia.monto)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay transferencias en este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "salarios" && (
            <div className="space-y-4">
              {/* Estadísticas Generales de Salarios */}
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Calculator className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Estadísticas de Salarios por Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-rose-50/60 dark:bg-[#152e2a] rounded-lg border border-rose-200 dark:border-[#1F3A36]">
                      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-300 mb-3">Administradores</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Cantidad:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{reporte.salarios?.administradores?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Promedio:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(reporte.salarios?.promediosPorRol?.administradores || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Total:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(reporte.salarios?.totalesPorRol?.administradores || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50/60 dark:bg-[#152e2a] rounded-lg border border-blue-200 dark:border-[#1F3A36]">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Supervisores</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Cantidad:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{reporte.salarios?.supervisores?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Promedio:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(reporte.salarios?.promediosPorRol?.supervisores || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Total:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(reporte.salarios?.totalesPorRol?.supervisores || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/60 dark:bg-[#152e2a] rounded-lg border border-emerald-200 dark:border-[#1F3A36]">
                      <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-3">Cobradores</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Cantidad:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{reporte.salarios?.cobradores?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Promedio:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(reporte.salarios?.promediosPorRol?.cobradores || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Total:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(reporte.salarios?.totalesPorRol?.cobradores || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Administradores */}
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Users className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    Administradores ({reporte.salarios?.administradores?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reporte.salarios?.administradores && reporte.salarios.administradores.length > 0 ? (
                      reporte.salarios.administradores.map(admin => (
                        <div key={admin.id} className="border border-rose-200 dark:border-[#1F3A36] p-4 bg-rose-50/50 dark:bg-[#152e2a] rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {admin.nombre} {admin.apellido}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-emerald-300/80">{admin.email}</p>
                            </div>
                            <Badge className="bg-rose-600 dark:bg-rose-700">Administrador</Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Semanal</p>
                              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(admin.pagoSemanal)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Quincenal</p>
                              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(admin.pagoQuincenal)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Mensual</p>
                              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(admin.pagoMensual)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Comisión</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{admin.comisionPorCobro}%</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay administradores registrados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Supervisores */}
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Supervisores ({reporte.salarios?.supervisores?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reporte.salarios?.supervisores && reporte.salarios.supervisores.length > 0 ? (
                      reporte.salarios.supervisores.map(supervisor => (
                        <div key={supervisor.id} className="border border-blue-200 dark:border-[#1F3A36] p-4 bg-blue-50/50 dark:bg-[#152e2a] rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {supervisor.nombre} {supervisor.apellido}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-emerald-300/80">{supervisor.email}</p>
                            </div>
                            <Badge className="bg-blue-600 dark:bg-blue-700">Supervisor</Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Semanal</p>
                              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(supervisor.pagoSemanal)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Quincenal</p>
                              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(supervisor.pagoQuincenal)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Mensual</p>
                              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(supervisor.pagoMensual)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Comisión</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{supervisor.comisionPorCobro}%</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay supervisores registrados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cobradores */}
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Cobradores ({reporte.salarios?.cobradores?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reporte.salarios?.cobradores && reporte.salarios.cobradores.length > 0 ? (
                      reporte.salarios.cobradores.map(cobrador => (
                        <div key={cobrador.id} className="border border-emerald-200 dark:border-[#1F3A36] p-4 bg-emerald-50/50 dark:bg-[#152e2a] rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-300">
                                  {cobrador.numeroRuta}
                                </Badge>
                              </div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {cobrador.nombre} {cobrador.apellido}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-emerald-300/80">{cobrador.email}</p>
                            </div>
                            <Badge className="bg-emerald-600 dark:bg-emerald-700">Cobrador</Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Semanal</p>
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(cobrador.pagoSemanal)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Quincenal</p>
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(cobrador.pagoQuincenal)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pago Mensual</p>
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(cobrador.pagoMensual)}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-[#0E1F1C] border border-gray-100 dark:border-[#1F3A36] rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Comisión</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{cobrador.comisionPorCobro}%</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay cobradores registrados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Resumen Total de Salarios */}
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Calculator className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Resumen Total de Salarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-rose-50/60 dark:bg-[#152e2a] rounded-lg border border-rose-200 dark:border-[#1F3A36]">
                      <div>
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Total Administradores</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{reporte.salarios?.administradores?.length || 0} usuarios</p>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(reporte.salarios?.totalesPorRol?.administradores || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50/60 dark:bg-[#152e2a] rounded-lg border border-blue-200 dark:border-[#1F3A36]">
                      <div>
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Total Supervisores</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{reporte.salarios?.supervisores?.length || 0} usuarios</p>
                      </div>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(reporte.salarios?.totalesPorRol?.supervisores || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-emerald-50/60 dark:bg-[#152e2a] rounded-lg border border-emerald-200 dark:border-[#1F3A36]">
                      <div>
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Total Cobradores</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{reporte.salarios?.cobradores?.length || 0} usuarios</p>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(reporte.salarios?.totalesPorRol?.cobradores || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-purple-100/70 dark:bg-[#152e2a] rounded-lg border-2 border-purple-300 dark:border-[#1F3A36]">
                      <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Total General</span>
                        <p className="text-xs text-gray-600 dark:text-gray-300">{reporte.salarios?.cantidadUsuarios || 0} usuarios activos</p>
                      </div>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(reporte.salarios?.totalSalarios || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalles de Ruta */}
      {selectedRuta && (
        <Dialog open={!!selectedRuta} onOpenChange={(open) => !open && setSelectedRuta(null)}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 overflow-hidden flex flex-col bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white rounded-xl">
            <DialogHeader className="p-4 md:p-6 bg-white dark:bg-[#0E1F1C] border-b border-gray-200 dark:border-[#1F3A36] shrink-0 relative pb-4 md:pb-6">
              <DialogTitle className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white pr-8">
                {selectedRuta.nombreCobrador}
              </DialogTitle>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-sm font-medium text-gray-500 dark:text-emerald-300/80">Ruta {selectedRuta.numeroRuta}</span>
                <span className="text-xs text-gray-400 dark:text-gray-400">{formatDate(fechaInicio)} - {formatDate(fechaFin)}</span>
              </div>
            </DialogHeader>
 
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
              <div className="space-y-6">
                
                {/* Resumen en el modal */}
                <div className="bg-gray-50 dark:bg-[#152e2a] p-4 rounded-xl border border-gray-200 dark:border-[#1F3A36] shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-[#1F3A36] pb-2">Resumen de Caja</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Cobrado</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(selectedRuta.totalCobradoEfectivo)}</span>
                    </div>
                    {selectedRuta.ingresosExtra !== undefined && selectedRuta.ingresosExtra > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Ingresos Extra (Caja Chica)</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(selectedRuta.ingresosExtra)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Prestado</span>
                      <span className="font-semibold text-rose-500 dark:text-rose-400">-{formatCurrency(selectedRuta.totalPrestadoEfectivo)}</span>
                    </div>
                    {selectedRuta.egresosExtra !== undefined && selectedRuta.egresosExtra > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Egresos Extra (Caja Chica)</span>
                        <span className="font-semibold text-rose-500 dark:text-rose-400">-{formatCurrency(selectedRuta.egresosExtra)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Gastos y Sueldos</span>
                      <span className="font-semibold text-rose-500 dark:text-rose-400">-{formatCurrency((selectedRuta.gastosOperativos || 0) + (selectedRuta.gastosSueldos || 0))}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-[#1F3A36] pt-2 mt-2 flex justify-between items-center">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">Flujo Efectivo Neto</span>
                      <span className={`font-bold ${selectedRuta.balancePeriodo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(selectedRuta.balancePeriodo)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas Detalladas de la Ruta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-blue-50/60 dark:bg-[#152e2a] border border-blue-100 dark:border-[#1F3A36] p-3.5 rounded-xl">
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold uppercase tracking-wider">Capital Invertido</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">{formatCurrency(selectedRuta.capitalInvertidoRuta)}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-0.5">Total prestado</p>
                  </div>
                  <div className="bg-amber-50/60 dark:bg-[#152e2a] border border-amber-100 dark:border-[#1F3A36] p-3.5 rounded-xl">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold uppercase tracking-wider">Regado en Calle</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">{formatCurrency(selectedRuta.regadoCalleRuta)}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-300 mt-0.5">Saldo pendiente total por cobrar</p>
                  </div>
                  <div className="bg-emerald-50/60 dark:bg-[#152e2a] border border-emerald-100 dark:border-[#1F3A36] p-3.5 rounded-xl">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold uppercase tracking-wider">Intereses</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatCurrency(selectedRuta.interesProyectadoRuta)}
                      <span className="text-xs font-normal text-emerald-600 dark:text-emerald-300 ml-1">/ {formatCurrency(selectedRuta.interesCobradoRuta)}</span>
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-300 mt-0.5">Interés esperado vs recuperado en período</p>
                  </div>
                  <div className="bg-rose-50/60 dark:bg-[#152e2a] border border-rose-100 dark:border-[#1F3A36] p-3.5 rounded-xl">
                    <p className="text-xs text-rose-800 dark:text-rose-300 font-semibold uppercase tracking-wider">Pérdidas del Período</p>
                    <p className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">{formatCurrency(selectedRuta.perdidasRutaPeriodo)}</p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-300 mt-0.5">Saldo pendiente de préstamos vencidos en período</p>
                  </div>
                </div>

                {/* Historial por Períodos */}
                <div className="bg-gray-50 dark:bg-[#152e2a] p-4 rounded-xl border border-gray-200 dark:border-[#1F3A36] shadow-sm space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-[#1F3A36] pb-2 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Historial Desglosado por Períodos
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#1F3A36] text-gray-500 dark:text-gray-400 font-semibold">
                          <th className="py-2.5">Período</th>
                          <th className="py-2.5 text-right">Invertido</th>
                          <th className="py-2.5 text-right">Cobrado</th>
                          <th className="py-2.5 text-right">Gastos</th>
                          <th className="py-2.5 text-right">Pérdidas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-[#1F3A36] text-gray-700 dark:text-gray-300">
                        <tr className="hover:bg-gray-100/50 dark:hover:bg-[#0E1F1C]/50 transition-colors">
                          <td className="py-2.5 font-medium text-gray-900 dark:text-white">Semanal</td>
                          <td className="py-2.5 text-right text-blue-600 dark:text-blue-400 font-medium">{formatCurrency(selectedRuta.historico.semanal.invertido)}</td>
                          <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">+{formatCurrency(selectedRuta.historico.semanal.cobrado)}</td>
                          <td className="py-2.5 text-right text-rose-500 dark:text-rose-400">-{formatCurrency(selectedRuta.historico.semanal.gastos)}</td>
                          <td className="py-2.5 text-right text-rose-600 dark:text-rose-400">{formatCurrency(selectedRuta.historico.semanal.perdidas)}</td>
                        </tr>
                        <tr className="hover:bg-gray-100/50 dark:hover:bg-[#0E1F1C]/50 transition-colors">
                          <td className="py-2.5 font-medium text-gray-900 dark:text-white">Mensual</td>
                          <td className="py-2.5 text-right text-blue-600 dark:text-blue-400 font-medium">{formatCurrency(selectedRuta.historico.mensual.invertido)}</td>
                          <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">+{formatCurrency(selectedRuta.historico.mensual.cobrado)}</td>
                          <td className="py-2.5 text-right text-rose-500 dark:text-rose-400">-{formatCurrency(selectedRuta.historico.mensual.gastos)}</td>
                          <td className="py-2.5 text-right text-rose-600 dark:text-rose-400">{formatCurrency(selectedRuta.historico.mensual.perdidas)}</td>
                        </tr>
                        <tr className="hover:bg-gray-100/50 dark:hover:bg-[#0E1F1C]/50 transition-colors">
                          <td className="py-2.5 font-medium text-gray-900 dark:text-white">Semestral</td>
                          <td className="py-2.5 text-right text-blue-600 dark:text-blue-400 font-medium">{formatCurrency(selectedRuta.historico.semestral.invertido)}</td>
                          <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">+{formatCurrency(selectedRuta.historico.semestral.cobrado)}</td>
                          <td className="py-2.5 text-right text-rose-500 dark:text-rose-400">-{formatCurrency(selectedRuta.historico.semestral.gastos)}</td>
                          <td className="py-2.5 text-right text-rose-600 dark:text-rose-400">{formatCurrency(selectedRuta.historico.semestral.perdidas)}</td>
                        </tr>
                        <tr className="hover:bg-gray-100/50 dark:hover:bg-[#0E1F1C]/50 transition-colors">
                          <td className="py-2.5 font-medium text-gray-900 dark:text-white">Anual</td>
                          <td className="py-2.5 text-right text-blue-600 dark:text-blue-400 font-medium">{formatCurrency(selectedRuta.historico.anual.invertido)}</td>
                          <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">+{formatCurrency(selectedRuta.historico.anual.cobrado)}</td>
                          <td className="py-2.5 text-right text-rose-500 dark:text-rose-400">-{formatCurrency(selectedRuta.historico.anual.gastos)}</td>
                          <td className="py-2.5 text-right text-rose-600 dark:text-rose-400">{formatCurrency(selectedRuta.historico.anual.perdidas)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
 
                {/* Detalle de Cobros */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Cobros Recibidos
                    </h4>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(selectedRuta.totalCobradoEfectivo)}</span>
                  </div>
                  {selectedRuta.detallesPagos.length > 0 ? (
                    <div className="bg-white dark:bg-[#152e2a] rounded-xl border border-gray-200 dark:border-[#1F3A36] shadow-sm divide-y divide-gray-100 dark:divide-[#1F3A36]">
                      {selectedRuta.detallesPagos.map(pago => (
                        <div key={pago.id} className="p-3 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{pago.cliente}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(pago.fecha).toLocaleDateString('es-CO')}</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(pago.monto)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">No hay cobros en efectivo.</p>
                  )}
                </div>
 
                {/* Detalle de Préstamos */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      Préstamos Entregados
                    </h4>
                    <span className="text-sm font-bold text-rose-500 dark:text-rose-400">-{formatCurrency(selectedRuta.totalPrestadoEfectivo)}</span>
                  </div>
                  {selectedRuta.detallesPrestamos.length > 0 ? (
                    <div className="bg-white dark:bg-[#152e2a] rounded-xl border border-gray-200 dark:border-[#1F3A36] shadow-sm divide-y divide-gray-100 dark:divide-[#1F3A36]">
                      {selectedRuta.detallesPrestamos.map(prestamo => (
                        <div key={prestamo.id} className="p-3 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{prestamo.cliente}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(prestamo.fecha).toLocaleDateString('es-CO')}</span>
                          </div>
                          <span className="text-sm font-bold text-rose-500 dark:text-rose-400">-{formatCurrency(prestamo.monto)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">No hay préstamos entregados.</p>
                  )}
                </div>
 
                {/* Detalle de Gastos */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      Gastos Registrados
                    </h4>
                    <span className="text-sm font-bold text-amber-500 dark:text-amber-400">-{formatCurrency(selectedRuta.gastosOperativos)}</span>
                  </div>
                  {selectedRuta.detallesGastos.length > 0 ? (
                    <div className="bg-white dark:bg-[#152e2a] rounded-xl border border-gray-200 dark:border-[#1F3A36] shadow-sm divide-y divide-gray-100 dark:divide-[#1F3A36]">
                      {selectedRuta.detallesGastos.map(gasto => (
                        <div key={gasto.id} className="p-3 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{gasto.concepto}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(gasto.fecha).toLocaleDateString('es-CO')}</span>
                          </div>
                          <span className="text-sm font-bold text-amber-500 dark:text-amber-400">-{formatCurrency(gasto.monto)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">No hay gastos operativos.</p>
                  )}
                </div>
 
                {/* Detalle de Sueldos y Viáticos */}
                <div className="space-y-3 pb-8">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                      Sueldos y Viáticos
                    </h4>
                    <span className="text-sm font-bold text-purple-500 dark:text-purple-400">-{formatCurrency(selectedRuta.gastosSueldos)}</span>
                  </div>
                  {selectedRuta.detallesSueldos.length > 0 ? (
                    <div className="bg-white dark:bg-[#152e2a] rounded-xl border border-gray-200 dark:border-[#1F3A36] shadow-sm divide-y divide-gray-100 dark:divide-[#1F3A36]">
                      {selectedRuta.detallesSueldos.map(sueldo => (
                        <div key={sueldo.id} className="p-3 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{sueldo.descripcion}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(sueldo.fecha).toLocaleDateString('es-CO')}</span>
                          </div>
                          <span className="text-sm font-bold text-purple-500 dark:text-purple-400">-{formatCurrency(sueldo.monto)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">No hay registros de sueldos o viáticos.</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}



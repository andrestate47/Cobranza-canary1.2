"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import { 
  Users, 
  Calendar, 
  RefreshCw, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Repeat, 
  RefreshCcw, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Filter,
  ArrowUpRight,
  Receipt,
  Plus
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface ReporteItem {
  cobradorId: string
  cobradorNombre: string
  numeroRuta: string | null
  prestamos: { count: number; monto: number }
  refinanciamiento: { count: number; monto: number }
  renovaciones: { count: number; monto: number }
  gastosCobrador: number
  cobrosPendientes: { count: number; monto: number }
  clientesVisitados: number
  clientesPorVisitar: number
  clientesConMora: number
  saldoPendientePorCobrar: number
  cobradoHoy: number
  entregaHoy: number
}

interface CobradorOption {
  id: string
  nombre: string
  numeroRuta: string | null
}

interface ReporteCobradoresProps {
  userRole?: string
}

export default function ReporteCobradores({ userRole }: ReporteCobradoresProps) {
  const { toast } = useToast()
  const { format: formatCurrency } = useCurrency()

  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState("")
  const [selectedCobradorId, setSelectedCobradorId] = useState("all")

  const [cobradores, setCobradores] = useState<CobradorOption[]>([])
  const [reportes, setReportes] = useState<ReporteItem[]>([])
  const [resumenGlobal, setResumenGlobal] = useState<any>(null)

  const isCobrador = userRole === "COBRADOR"

  // Estados para Modal de Carga de Entrega
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false)
  const [cobradorEntregaTarget, setCobradorEntregaTarget] = useState<{ id: string; nombre: string; ruta: string | null } | null>(null)
  const [montoEntregaInput, setMontoEntregaInput] = useState("")
  const [guardandoEntrega, setGuardandoEntrega] = useState(false)

  const handleOpenEntregaModal = (id: string, nombre: string, ruta: string | null, montoActual?: number) => {
    setCobradorEntregaTarget({ id, nombre, ruta })
    setMontoEntregaInput(montoActual && montoActual > 0 ? String(montoActual) : "")
    setModalEntregaOpen(true)
  }

  const handleSaveEntrega = async () => {
    if (!cobradorEntregaTarget) return
    const parsedMonto = parseFloat(montoEntregaInput)
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      toast({
        title: "Monto inválido",
        description: "Por favor ingrese un monto válido mayor a 0",
        variant: "destructive"
      })
      return
    }

    try {
      setGuardandoEntrega(true)
      const res = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cobradorId: cobradorEntregaTarget.id,
          tipo: "ENTREGA",
          monto: parsedMonto,
          descripcion: "Entrega de efectivo (Caja)",
          observaciones: `Entrega asignada manualmente desde Reporte de Cobradores`,
          ...(fecha ? { fecha } : {})
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Error al registrar la entrega")
      }

      toast({
        title: "Entrega registrada",
        description: `Se asignó la entrega de ${formatCurrency(parsedMonto)} a ${cobradorEntregaTarget.nombre}`
      })

      setModalEntregaOpen(false)
      setCobradorEntregaTarget(null)
      setMontoEntregaInput("")
      
      // Recargar datos
      fetchReporte()
    } catch (err: any) {
      console.error("Error guardando entrega:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo registrar la entrega",
        variant: "destructive"
      })
    } finally {
      setGuardandoEntrega(false)
    }
  }

  const fetchReporte = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (fecha) params.append("fecha", fecha)
      if (selectedCobradorId) params.append("cobradorId", selectedCobradorId)

      const response = await fetch(`/api/reportes/cobradores?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar reporte de cobradores")

      const data = await response.json()
      setCobradores(data.cobradores || [])
      setReportes(data.reportes || [])
      setResumenGlobal(data.resumenGlobal || null)
    } catch (error) {
      console.error("Error cargando reporte:", error)
      toast({
        title: "Error",
        description: "No se pudo obtener el reporte de cobradores",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReporte()
  }, [fecha, selectedCobradorId])

  // Datos del cobrador seleccionado o datos globales
  const reporteSeleccionado = useMemo(() => {
    if (selectedCobradorId !== "all" && reportes.length > 0) {
      return reportes.find(r => r.cobradorId === selectedCobradorId) || reportes[0]
    }
    return null
  }, [selectedCobradorId, reportes])

  if (loading && reportes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Bar de Filtros Responsivo */}
      <div className="bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] p-4 rounded-2xl shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Selector de Cobrador */}
          {!isCobrador && (
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
                Seleccionar Cobrador
              </Label>
              <Select value={selectedCobradorId} onValueChange={setSelectedCobradorId}>
                <SelectTrigger className="h-10 bg-slate-50 dark:bg-[#152e2a] border-gray-200 dark:border-[#1F3A36] rounded-xl font-medium">
                  <SelectValue placeholder="Todos los cobradores" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#0E1F1C] dark:border-[#1F3A36]">
                  <SelectItem value="all">Todos los cobradores ({cobradores.length})</SelectItem>
                  {cobradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} {c.numeroRuta ? `(Ruta ${c.numeroRuta})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selector de Fecha */}
          <div className="w-full sm:w-48">
            <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
              Fecha del Reporte
            </Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-10 bg-slate-50 dark:bg-[#152e2a] border-gray-200 dark:border-[#1F3A36] rounded-xl font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* Acciones principales / Cargar Entrega */}
        <div className="flex items-center gap-2 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
          {fecha && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFecha("")}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              Hoy
            </Button>
          )}

          {!isCobrador && (
            <Button
              type="button"
              onClick={() => {
                if (reporteSeleccionado) {
                  handleOpenEntregaModal(reporteSeleccionado.cobradorId, reporteSeleccionado.cobradorNombre, reporteSeleccionado.numeroRuta, reporteSeleccionado.entregaHoy)
                } else if (cobradores.length > 0) {
                  handleOpenEntregaModal(cobradores[0].id, cobradores[0].nombre, cobradores[0].numeroRuta)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
            >
              <Plus className="h-4 w-4" />
              <span>Cargar Entrega Manual</span>
            </Button>
          )}
        </div>
      </div>

      {/* Banner Principal / Hero Financial Cards (4 Cards Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Cobrado Hoy */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold">
            <span>Cobrado Hoy</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
            {formatCurrency(reporteSeleccionado ? reporteSeleccionado.cobradoHoy : resumenGlobal?.totalCobradoHoy || 0)}
          </div>
          <span className="text-[11px] text-emerald-100/90 mt-1 font-medium">
            Entradas reales de pagos
          </span>
        </div>

        {/* Entrega hoy */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between text-blue-100 text-xs font-semibold">
            <span>Entrega hoy</span>
            <Wallet className="h-4 w-4" />
          </div>
          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {formatCurrency(reporteSeleccionado ? reporteSeleccionado.entregaHoy : resumenGlobal?.totalEntregaHoy || 0)}
            </span>
            {!isCobrador && (
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  if (reporteSeleccionado) {
                    handleOpenEntregaModal(reporteSeleccionado.cobradorId, reporteSeleccionado.cobradorNombre, reporteSeleccionado.numeroRuta, reporteSeleccionado.entregaHoy)
                  } else if (cobradores.length > 0) {
                    handleOpenEntregaModal(cobradores[0].id, cobradores[0].nombre, cobradores[0].numeroRuta)
                  }
                }}
                className="bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-[11px] h-7 px-3 rounded-lg shrink-0 shadow-sm transition-all"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Cargar Entrega
              </Button>
            )}
          </div>
          <span className="text-[11px] text-blue-100/90 mt-1 font-medium">
            Efectivo asignado de caja
          </span>
        </div>

        {/* Gastos Cobrador */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-100 text-xs font-semibold">
            <span>Gastos Cobrador</span>
            <Receipt className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
            {formatCurrency(reporteSeleccionado ? reporteSeleccionado.gastosCobrador : resumenGlobal?.totalGastosCobrador || 0)}
          </div>
          <span className="text-[11px] text-rose-100/90 mt-1 font-medium">
            Viáticos y egresos reportados
          </span>
        </div>

        {/* Saldo pendiente por cobrar */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300 text-xs font-semibold">
            <span>Saldo por cobrar</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
            {formatCurrency(reporteSeleccionado ? reporteSeleccionado.saldoPendientePorCobrar : resumenGlobal?.totalSaldoPendientePorCobrar || 0)}
          </div>
          <span className="text-[11px] text-slate-300/90 mt-1 font-medium">
            Capital e interés en cartera
          </span>
        </div>
      </div>

      {/* Sección 1: Operaciones de Crédito (3 Cards) */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
          Operaciones de Crédito
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Préstamos */}
          <div className="bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-sm font-bold">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span>Préstamos Nuevos</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                {reporteSeleccionado ? reporteSeleccionado.prestamos.count : resumenGlobal?.totalPrestamos.count || 0}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white pt-1">
              {formatCurrency(reporteSeleccionado ? reporteSeleccionado.prestamos.monto : resumenGlobal?.totalPrestamos.monto || 0)}
            </div>
          </div>

          {/* Refinanciamiento */}
          <div className="bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-sm font-bold">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <RefreshCcw className="h-4 w-4" />
                </div>
                <span>Refinanciamiento</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50">
                {reporteSeleccionado ? reporteSeleccionado.refinanciamiento.count : resumenGlobal?.totalRefinanciamiento.count || 0}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white pt-1">
              {formatCurrency(reporteSeleccionado ? reporteSeleccionado.refinanciamiento.monto : resumenGlobal?.totalRefinanciamiento.monto || 0)}
            </div>
          </div>

          {/* Renovaciones */}
          <div className="bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-sm font-bold">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Repeat className="h-4 w-4" />
                </div>
                <span>Renovaciones</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                {reporteSeleccionado ? reporteSeleccionado.renovaciones.count : resumenGlobal?.totalRenovaciones.count || 0}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white pt-1">
              {formatCurrency(reporteSeleccionado ? reporteSeleccionado.renovaciones.monto : resumenGlobal?.totalRenovaciones.monto || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Sección 2: Estado de Ruta & Clientes (4 Cards Grid) */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
          Gestión de Clientes & Ruta
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Clientes visitados */}
          <div className="bg-white dark:bg-[#0E1F1C] border border-emerald-100 dark:border-[#1F3A36] rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <UserCheck className="h-4 w-4" />
              <span>Clientes Visitados</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {reporteSeleccionado ? reporteSeleccionado.clientesVisitados : resumenGlobal?.totalClientesVisitados || 0}
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Abonaron o visitados hoy</p>
          </div>

          {/* Clientes por visitar */}
          <div className="bg-white dark:bg-[#0E1F1C] border border-blue-100 dark:border-[#1F3A36] rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold">
              <Clock className="h-4 w-4" />
              <span>Clientes Por Visitar</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {reporteSeleccionado ? reporteSeleccionado.clientesPorVisitar : resumenGlobal?.totalClientesPorVisitar || 0}
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Pendientes de cobro hoy</p>
          </div>

          {/* Clientes con mora */}
          <div className="bg-white dark:bg-[#0E1F1C] border border-rose-100 dark:border-[#1F3A36] rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold">
              <AlertTriangle className="h-4 w-4" />
              <span>Clientes Con Mora</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {reporteSeleccionado ? reporteSeleccionado.clientesConMora : resumenGlobal?.totalClientesConMora || 0}
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Con atraso de pagos</p>
          </div>

          {/* Cobros pendientes */}
          <div className="bg-white dark:bg-[#0E1F1C] border border-amber-100 dark:border-[#1F3A36] rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <Wallet className="h-4 w-4" />
              <span>Cobros Pendientes</span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {formatCurrency(reporteSeleccionado ? reporteSeleccionado.cobrosPendientes.monto : resumenGlobal?.totalCobrosPendientes.monto || 0)}
            </div>
            <p className="text-[11px] text-gray-400 font-medium">
              {reporteSeleccionado ? reporteSeleccionado.cobrosPendientes.count : resumenGlobal?.totalCobrosPendientes.count || 0} cuotas por cobrar
            </p>
          </div>
        </div>
      </div>

      {/* Tabla / Tarjetas de desglose de cada cobrador (cuando está en vista "Todos") */}
      {selectedCobradorId === "all" && reportes.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
            Desglose Individual por Cobrador
          </h2>

          <div className="space-y-3">
            {reportes.map(r => (
              <div
                key={r.cobradorId}
                onClick={() => setSelectedCobradorId(r.cobradorId)}
                className="bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer space-y-4"
              >
                {/* Header Card */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-[#1F3A36] pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-extrabold shrink-0">
                      {r.cobradorNombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-gray-900 dark:text-white text-base truncate">
                        {r.cobradorNombre}
                      </h3>
                      {r.numeroRuta && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          Ruta {r.numeroRuta}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                    Ver detalle <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>

                {/* Main Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 font-medium block">Cobrado Hoy</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                      +{formatCurrency(r.cobradoHoy)}
                    </span>
                  </div>

                  <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2 sm:p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-1">
                    <div>
                      <span className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 font-bold block leading-none mb-0.5">
                        Entrega Hoy
                      </span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                        +{formatCurrency(r.entregaHoy)}
                      </span>
                    </div>
                    {!isCobrador && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEntregaModal(r.cobradorId, r.cobradorNombre, r.numeroRuta, r.entregaHoy)
                        }}
                        title="Registrar o editar entrega de caja"
                        className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shrink-0 transition-all shadow-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Entrega
                      </Button>
                    )}
                  </div>

                  <div>
                    <span className="text-gray-400 font-medium block">Gastos Cobrador</span>
                    <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                      -{formatCurrency(r.gastosCobrador)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 font-medium block">Saldo por Cobrar</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                      {formatCurrency(r.saldoPendientePorCobrar)}
                    </span>
                  </div>
                </div>

                {/* Sub Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-[#152e2a]">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                    Préstamos: {r.prestamos.count} ({formatCurrency(r.prestamos.monto)})
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    Refinanciamiento: {r.refinanciamiento.count}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                    Renovaciones: {r.renovaciones.count}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                    Visitados: {r.clientesVisitados}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                    Con Mora: {r.clientesConMora}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para Cargar/Subir Entrega Hoy Manualmente */}
      <Dialog open={modalEntregaOpen} onOpenChange={setModalEntregaOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Wallet className="h-5 w-5" />
              </div>
              <span>Registrar Entrega de Efectivo</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 pt-1">
              Asigna manualmente la base / entrega inicial para el cobrador en el reporte del día.
            </DialogDescription>
          </DialogHeader>

          {cobradorEntregaTarget && (
            <div className="space-y-4 py-2">
              {/* Info Cobrador */}
              <div className="bg-slate-50 dark:bg-[#152e2a] border border-gray-200 dark:border-[#1F3A36] rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Cobrador</span>
                  <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                    {cobradorEntregaTarget.nombre}
                  </span>
                </div>
                {cobradorEntregaTarget.ruta && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Ruta {cobradorEntregaTarget.ruta}
                  </span>
                )}
              </div>

              {/* Campo de Monto */}
              <div>
                <Label htmlFor="montoEntrega" className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Monto a entregar ($)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="montoEntrega"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={montoEntregaInput}
                    onChange={(e) => setMontoEntregaInput(e.target.value)}
                    className="pl-9 h-11 text-base font-extrabold bg-slate-50 dark:bg-[#152e2a] border-gray-200 dark:border-[#1F3A36] rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Botones de Selección Rápida */}
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block mb-1.5">Montos Rápidos</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[50, 100, 200, 500].map((quickMonto) => (
                    <Button
                      key={quickMonto}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMontoEntregaInput(String(quickMonto))}
                      className="h-8 text-xs font-bold bg-slate-50 dark:bg-[#152e2a] border-gray-200 dark:border-[#1F3A36] hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 transition-all rounded-lg"
                    >
                      ${quickMonto}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalEntregaOpen(false)}
              disabled={guardandoEntrega}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveEntrega}
              disabled={guardandoEntrega}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10 shadow-sm"
            >
              {guardandoEntrega ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Entrega"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

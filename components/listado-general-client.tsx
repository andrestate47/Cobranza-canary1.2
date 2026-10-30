"use client"

import { useState, useEffect, useMemo, useCallback, useDeferredValue, memo } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import {
  ArrowLeft,
  Search,
  Phone,
  MapPin,
  DollarSign,
  User,
  Filter,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Copy,
  Shield,
  ShieldCheck,
  ShieldX
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import dynamic from "next/dynamic"
import { useInView } from "react-intersection-observer"
import { countDiasHabiles } from "@/lib/date-utils"
import { diaCalendario, diaReferencia } from "@/lib/prestamo-calc"
import { calcularCreditScore } from "@/lib/credit-score"
import CreditScoreBadge from "@/components/credit-score-badge"
import BackgroundHalo from "@/components/background-halo"

const PagoRapidoModal = dynamic(() => import("@/components/pago-rapido-modal"), { ssr: false })
const ImageViewerModal = dynamic(() => import("@/components/image-viewer-modal"), { ssr: false })

interface Prestamo {
  id: string
  monto: number
  interes: number
  cuotas: number
  valorCuota: number
  fechaInicio: string
  fechaFin: string
  estado: string
  tipoPago: string
  fechaActividadReciente: string
  saldoPendiente: number
  cuotasPagadas: number
  montoTotal: number
  observaciones?: string
  tipoCredito?: string
  diasGracia?: number
  moraCredito?: number
  multa?: number
  microseguroTipo?: string
  microseguroTotal?: number
  microseguroValor?: number
  seguroDevuelto?: number
}

interface ClienteConPrestamos {
  cliente: {
    id: string
    codigoCliente: string
    documento: string
    nombre: string
    apellido: string
    direccionCliente: string
    direccionCobro?: string
    telefono?: string
    foto?: string
    pais?: string
    ciudad?: string
    referenciasPersonales?: string
    mapLink?: string
    createdAt?: string
  }
  prestamos: Prestamo[]
  fechaActividadReciente: string
  saldoTotalPendiente: number
  cuotasTotalesPagadas: number
  montoTotalPrestado: number
}

interface ListadoGeneralClientProps {
  session: Session
}

// Map estático para días por tipo de pago
const DIAS_POR_TIPO_PAGO: Record<string, number> = {
  'DIARIO': 1,
  'SEMANAL': 7,
  'LUNES_A_VIERNES': 1,
  'LUNES_A_SABADO': 1,
  'QUINCENAL': 15,
  'CATORCENAL': 14,
  'FIN_DE_MES': 30,
  'MENSUAL': 30,
  'TRIMESTRAL': 90,
  'CUATRIMESTRAL': 120,
  'SEMESTRAL': 180,
  'ANUAL': 365
}

// Obtener badge del tipo de pago de forma inmutable y rápida
const getTipoPagoBadge = (clienteData: ClienteConPrestamos) => {
  if (!clienteData.prestamos || clienteData.prestamos.length === 0) {
    return { texto: 'Sin préstamos', color: 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-200' }
  }

  let masReciente = clienteData.prestamos[0]
  let maxTime = new Date(masReciente.fechaActividadReciente).getTime()

  for (let i = 1; i < clienteData.prestamos.length; i++) {
    const time = new Date(clienteData.prestamos[i].fechaActividadReciente).getTime()
    if (time > maxTime) {
      maxTime = time
      masReciente = clienteData.prestamos[i]
    }
  }

  const tipoPago = masReciente.tipoPago
  const badges = {
    'DIARIO': { texto: 'Diario', color: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700' },
    'SEMANAL': { texto: 'Semanal', color: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700' },
    'LUNES_A_VIERNES': { texto: 'Lun-Vie', color: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200 dark:border-cyan-700' },
    'LUNES_A_SABADO': { texto: 'Lun-Sáb', color: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700' },
    'QUINCENAL': { texto: 'Quincenal', color: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-200 dark:border-orange-700' },
    'CATORCENAL': { texto: 'Catorcenal', color: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700' },
    'FIN_DE_MES': { texto: 'Fin de Mes', color: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-700' },
    'MENSUAL': { texto: 'Mensual', color: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700' },
    'TRIMESTRAL': { texto: 'Trimestral', color: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700' },
    'CUATRIMESTRAL': { texto: 'Cuatrimestral', color: 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/80 dark:text-violet-200 dark:border-violet-700' },
    'SEMESTRAL': { texto: 'Semestral', color: 'bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-950/80 dark:text-pink-200 dark:border-pink-700' },
    'ANUAL': { texto: 'Anual', color: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-200 dark:border-yellow-700' }
  }

  return badges[tipoPago as keyof typeof badges] || {
    texto: tipoPago,
    color: 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-200'
  }
}

// Función para calcular el estado de alerta del cliente
const calcularEstadoCliente = (
  clienteData: ClienteConPrestamos,
  hoy: Date,
  hoyMidnight: Date,
  ayerMidnight: Date
) => {
  const esPrestamoCompletado = (p: Prestamo) => p.estado === 'CANCELADO' || p.estado === 'RENOVADO' || p.saldoPendiente <= 0.01 || p.cuotasPagadas >= p.cuotas

  // Si no tiene préstamos o todos están pagados/renovados, está Inactivo
  const inactivo = clienteData.prestamos.length === 0 || clienteData.prestamos.every(esPrestamoCompletado)
  if (inactivo) {
    return {
      estado: 'INACTIVO',
      icono: User,
      color: 'bg-gray-400',
      texto: 'Inactivo',
      colorTexto: 'text-white'
    }
  }

  const diaHoyEcuador = diaReferencia()

  // Verificar si algún préstamo está completamente vencido y no ha sido pagado
  const tienePrestamoVencido = clienteData.prestamos.some(prestamo => {
    if (esPrestamoCompletado(prestamo)) return false
    if (prestamo.estado === 'VENCIDO') return true
    
    // Un préstamo está vencido si su fecha fin es menor (anterior) a "hoy" en Ecuador
    return diaCalendario(prestamo.fechaFin) < diaHoyEcuador
  })

  if (tienePrestamoVencido) {
    return {
      estado: 'VENCIDO',
      icono: XCircle,
      color: 'bg-red-500',
      texto: 'Vencido',
      colorTexto: 'text-white'
    }
  }

  // Verificar morosidad (préstamos con pagos atrasados)
  const hoyMidnightTime = hoyMidnight.getTime()
  const tieneAtraso = clienteData.prestamos.some(prestamo => {
    if (esPrestamoCompletado(prestamo)) return false

    const diasEsperados = DIAS_POR_TIPO_PAGO[prestamo.tipoPago] || 1
    const fechaInicioStr = diaCalendario(prestamo.fechaInicio)
    const [inicioYear, inicioMonth, inicioDay] = fechaInicioStr.split('-').map(Number)
    const fechaInicioMidnight = new Date(inicioYear, inicioMonth - 1, inicioDay)

    let pagosEsperados = 0
    if (prestamo.tipoPago === 'LUNES_A_SABADO' || prestamo.tipoPago === 'LUNES_A_VIERNES' || prestamo.tipoPago === 'DIARIO') {
      pagosEsperados = countDiasHabiles(fechaInicioMidnight, hoyMidnight, prestamo.tipoPago)
    } else {
      pagosEsperados = Math.floor((hoyMidnightTime - fechaInicioMidnight.getTime()) / (1000 * 60 * 60 * 24 * diasEsperados))
    }

    const cuotasVencidasEfectivas = Math.max(0, pagosEsperados)
    return prestamo.cuotasPagadas < cuotasVencidasEfectivas
  })

  if (tieneAtraso) {
    return {
      estado: 'MOROSO',
      icono: AlertTriangle,
      color: 'bg-orange-500',
      texto: 'Moroso',
      colorTexto: 'text-white'
    }
  }

  // Verificar si el préstamo está próximo a vencer (su fechaFin es en los próximos 3 días)
  const proximoAVencer = clienteData.prestamos.some(prestamo => {
    if (esPrestamoCompletado(prestamo)) return false

    const fechaFinStr = diaCalendario(prestamo.fechaFin)
    const [year, month, day] = fechaFinStr.split('-').map(Number)
    const fechaFinMidnight = new Date(year, month - 1, day)

    const diferenciaDias = Math.ceil((fechaFinMidnight.getTime() - hoyMidnightTime) / (1000 * 60 * 60 * 24))
    return diferenciaDias <= 3 && diferenciaDias >= 0
  })

  if (proximoAVencer) {
    return {
      estado: 'PROXIMO_A_VENCER',
      icono: Clock,
      color: 'bg-yellow-500',
      texto: 'Próximo a vencer',
      colorTexto: 'text-white'
    }
  }

  // Cliente al día
  return {
    estado: 'OK',
    icono: CheckCircle,
    color: 'bg-green-500',
    texto: 'Al día',
    colorTexto: 'text-white'
  }
}

// Componente memoizado para renderizar cada tarjeta de cliente sin re-renders innecesarios
const ClienteCard = memo(function ClienteCard({
  clienteData,
  isExpanded,
  toggleCardExpansion,
  abrirImagenModal,
  abrirMapa,
  copiarDireccion,
  handlePagoRapido,
  formatCurrency
}: {
  clienteData: ClienteConPrestamos & { estadoAlerta: any, tipoPagoInfo: any, scoreData?: any }
  isExpanded: boolean
  toggleCardExpansion: (id: string) => void
  abrirImagenModal: (cliente: any) => void
  abrirMapa: (dir: string, tipo: string, link?: string | null) => void
  copiarDireccion: (dir: string, tipo: string) => void
  handlePagoRapido: (prestamo: Prestamo, cliente: ClienteConPrestamos) => void
  formatCurrency: (val: number) => string
}) {
  const estadoAlerta = clienteData.estadoAlerta
  const tipoPagoInfo = clienteData.tipoPagoInfo
  const IconoAlerta = estadoAlerta.icono
  const scoreCrediticio = useMemo(
    () => calcularCreditScore(clienteData.cliente, clienteData.prestamos),
    [clienteData.cliente, clienteData.prestamos]
  )

  return (
    <Card className="block list-none [list-style:none] [&::marker]:hidden [&::-webkit-details-marker]:hidden">
      <Collapsible
        open={isExpanded}
        onOpenChange={() => toggleCardExpansion(clienteData.cliente.id)}
      >
        <CardContent className="p-4">
          {/* Vista compacta del cliente - siempre visible y completamente clickeable */}
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full cursor-pointer select-none">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 pr-1">
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex flex-col items-center justify-center flex-shrink-0 p-0.5 shadow-sm">
                  {clienteData.cliente.foto ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        abrirImagenModal(clienteData.cliente)
                      }}
                      className="w-full h-full rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 active:scale-90 transition-all duration-200 touch-manipulation group"
                      title="Ver foto del cliente en pantalla completa"
                    >
                      <img
                        src={clienteData.cliente.foto}
                        alt={`${clienteData.cliente.nombre} ${clienteData.cliente.apellido}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ) : (
                    <User className="h-6 w-6 text-gray-400 dark:text-gray-300" />
                  )}
                  {/* Ícono de alerta superpuesto */}
                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 ${estadoAlerta.color}`}>
                    <IconoAlerta className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex flex-col mb-1 w-full">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate w-full" title={`${clienteData.cliente.nombre} ${clienteData.cliente.apellido}`}>
                      {clienteData.cliente.nombre} {clienteData.cliente.apellido}
                    </h3>
                    <div className="flex items-center flex-wrap gap-x-1 gap-y-1 mt-1 shrink-0">
                      <CreditScoreBadge scoreData={scoreCrediticio} />
                      <Badge
                        className={`text-[10px] px-1 py-0 h-4 min-h-[16px] leading-[14px] ${estadoAlerta.color} ${estadoAlerta.colorTexto} hover:opacity-80 ${
                          estadoAlerta.estado === 'MOROSO' || estadoAlerta.estado === 'VENCIDO' ? 'animate-pulse' : ''
                        }`}
                      >
                        {estadoAlerta.texto}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 h-4 min-h-[16px] leading-[14px] ${tipoPagoInfo.color}`}
                      >
                        {tipoPagoInfo.texto}
                      </Badge>
                      {clienteData.prestamos.length > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 min-h-[16px] leading-[14px] bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700 font-bold">
                          {clienteData.prestamos.length} ptmos
                        </Badge>
                      )}
                      {clienteData.prestamos.some(p => p.microseguroTipo && p.microseguroTipo !== 'NINGUNO' && p.microseguroTotal) && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 min-h-[16px] leading-[14px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 font-medium gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                          Seguro
                        </Badge>
                      )}
                      {clienteData.prestamos.some(p => Number(p.multa || 0) > 0) && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 min-h-[16px] leading-[14px] bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 font-bold gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
                          Multa: {formatCurrency(clienteData.prestamos.reduce((sum, p) => sum + (Number(p.multa) || 0), 0))}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
                    <span className="text-[13px] sm:text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap truncate block">
                      Saldo: <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(clienteData.saldoTotalPendiente)}</span>
                    </span>
                    <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap hidden sm:block">
                      {Number(clienteData.cuotasTotalesPagadas.toFixed(2))} {clienteData.cuotasTotalesPagadas === 1 ? 'cuota' : 'cuotas'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-400 truncate">
                      Total prestado: {formatCurrency(clienteData.montoTotalPrestado)}
                    </span>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="ml-1 p-1 sm:p-2 sm:ml-2 flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CollapsibleTrigger>

          {/* Vista expandida - historial de préstamos */}
          <CollapsibleContent className="space-y-3">
            <div className="pt-3 border-t mt-3">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                  Préstamos de {clienteData.cliente.nombre} ({clienteData.prestamos.length})
                </h4>

                {clienteData.prestamos.map((prestamo, prestamoIndex) => {
                  const formatFechaUTC = (dateString: string) => {
                    try {
                      const [y, m, d] = String(dateString).split('T')[0].split('-').map(Number)
                      const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
                      return date.toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC'
                      })
                    } catch (e) {
                      return String(dateString).split('T')[0]
                    }
                  }

                  const fechaInicio = formatFechaUTC(prestamo.fechaInicio)
                  const fechaFin = formatFechaUTC(prestamo.fechaFin)

                  const getProgressPercentage = (cuotasPagadas: number, totalCuotas: number) => {
                    return Math.min((cuotasPagadas / totalCuotas) * 100, 100)
                  }

                  return (
                    <div key={prestamo.id} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800/90 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-slate-700 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                          <Badge variant="outline" className="text-xs font-bold bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                            Préstamo #{prestamoIndex + 1}
                          </Badge>
                          <Badge
                            variant="default"
                            className={`text-xs font-bold text-slate-950 ${
                              prestamo.tipoPago === 'DIARIO' ? 'bg-blue-300' :
                              prestamo.tipoPago === 'SEMANAL' ? 'bg-emerald-400' :
                              prestamo.tipoPago === 'LUNES_A_VIERNES' ? 'bg-cyan-300' :
                              prestamo.tipoPago === 'LUNES_A_SABADO' ? 'bg-sky-300' :
                              prestamo.tipoPago === 'QUINCENAL' ? 'bg-orange-300' :
                              prestamo.tipoPago === 'CATORCENAL' ? 'bg-amber-300' :
                              prestamo.tipoPago === 'FIN_DE_MES' ? 'bg-teal-300' :
                              prestamo.tipoPago === 'MENSUAL' ? 'bg-purple-300' :
                              prestamo.tipoPago === 'TRIMESTRAL' ? 'bg-indigo-300' :
                              prestamo.tipoPago === 'CUATRIMESTRAL' ? 'bg-violet-300' :
                              prestamo.tipoPago === 'SEMESTRAL' ? 'bg-pink-300' :
                              prestamo.tipoPago === 'ANUAL' ? 'bg-yellow-300' : 'bg-slate-300'
                            }`}
                          >
                            {prestamo.tipoPago === 'FIN_DE_MES' ? 'Fin de Mes' :
                              prestamo.tipoPago === 'LUNES_A_VIERNES' ? 'Lun-Vie' :
                              prestamo.tipoPago === 'LUNES_A_SABADO' ? 'Lun-Sáb' :
                              prestamo.tipoPago === 'CATORCENAL' ? 'Catorcenal' :
                              prestamo.tipoPago === 'CUATRIMESTRAL' ? 'Cuatrimestral' :
                              prestamo.tipoPago}
                          </Badge>
                          {prestamo.tipoCredito && (
                            <Badge variant="secondary" className="text-xs font-semibold bg-slate-900 text-white dark:bg-slate-700">
                              {prestamo.tipoCredito === 'EFECTIVO' ? '💵 Efectivo' : '🏦 Transferencia'}
                            </Badge>
                          )}
                          {prestamo.microseguroTipo && prestamo.microseguroTipo !== 'NINGUNO' && (Number(prestamo.microseguroTotal) > 0 || Number(prestamo.microseguroValor) > 0 || prestamo.microseguroTipo === 'DEVOLUCION') ? (
                            <Badge className={`text-xs font-bold border gap-1 shadow-sm ${
                              prestamo.microseguroTipo === 'DEVOLUCION'
                                ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700'
                                : 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700'
                            }`}>
                              <ShieldCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                              {prestamo.microseguroTipo === 'DEVOLUCION' ? 'Devolución' : 'Seguro'}: {formatCurrency(Number(prestamo.microseguroTotal || prestamo.microseguroValor || 0))}
                              {Number(prestamo.seguroDevuelto || 0) > 0 && (
                                <span className="ml-1 text-[11px] text-green-700 dark:text-green-300 font-bold">
                                  (Devuelto: {formatCurrency(prestamo.seguroDevuelto || 0)})
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-gray-500 border-gray-300 dark:text-gray-400 dark:border-gray-700 gap-1 bg-white dark:bg-slate-800">
                              <ShieldX className="h-3 w-3 text-gray-400" />
                              Sin seguro
                            </Badge>
                          )}
                          {Boolean(prestamo.multa && prestamo.multa > 0) && (
                            <Badge className="text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700 gap-1 shadow-sm">
                              <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                              Multa: {formatCurrency(prestamo.multa || 0)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          <Button
                            size="sm"
                            onClick={() => handlePagoRapido(prestamo, clienteData)}
                            className="btn-primary text-xs h-8 px-3 rounded-lg shadow-sm"
                            disabled={prestamo.saldoPendiente <= 0}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            <DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                            Pago
                          </Button>
                          <Button asChild variant="outline" size="sm" className="text-xs h-8 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Link href={`/prestamos/${prestamo.id}`}>
                              Ver
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800/90 rounded-lg p-3 border border-gray-300 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-sm text-gray-700 dark:text-slate-200 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {clienteData.cliente.nombre} {clienteData.cliente.apellido}
                          </h5>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {clienteData.cliente.codigoCliente} • {clienteData.cliente.documento}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {clienteData.cliente.telefono && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-green-600 dark:text-green-400" />
                              <a href={`tel:${clienteData.cliente.telefono}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                {clienteData.cliente.telefono}
                              </a>
                            </div>
                          )}
                          {(clienteData.cliente.pais || clienteData.cliente.ciudad) && (
                            <div className="flex items-center gap-1 text-gray-600 dark:text-slate-300">
                              <MapPin className="h-3 w-3" />
                              <span>{clienteData.cliente.ciudad || clienteData.cliente.pais}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-start gap-1 text-xs min-w-0">
                            <MapPin className="h-3 w-3 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => abrirMapa(clienteData.cliente.direccionCliente, 'cliente', clienteData.cliente.mapLink)}
                                className="text-blue-600 dark:text-blue-400 hover:underline text-left break-all font-medium block leading-tight max-w-full"
                              >
                                {clienteData.cliente.direccionCliente.startsWith('http') 
                                  ? "Ubicación en Google Maps" 
                                  : clienteData.cliente.direccionCliente}
                              </button>
                            </div>
                            <button
                              onClick={() => copiarDireccion(clienteData.cliente.direccionCliente, 'cliente')}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 shrink-0 ml-1"
                              title="Copiar"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>

                          {clienteData.cliente.direccionCobro && (
                            <div className="flex items-start gap-1 text-xs min-w-0">
                              <MapPin className="h-3 w-3 mt-0.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-500 dark:text-slate-400 mr-1 shrink-0 font-medium">Cobro:</span>
                                <button
                                  onClick={() => abrirMapa(clienteData.cliente.direccionCobro!, 'cobro')}
                                  className="text-orange-600 dark:text-orange-400 hover:underline text-left break-all font-medium inline-block leading-tight max-w-full"
                                >
                                  {clienteData.cliente.direccionCobro.startsWith('http') 
                                    ? "Ubicación en Google Maps" 
                                    : clienteData.cliente.direccionCobro}
                                </button>
                              </div>
                              <button
                                onClick={() => copiarDireccion(clienteData.cliente.direccionCobro!, 'cobro')}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 shrink-0 ml-1"
                                title="Copiar"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {clienteData.cliente.referenciasPersonales && (
                          <div className="text-xs bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800">
                            <span className="font-medium text-amber-800 dark:text-amber-300">📋 Referencias:</span>
                            <p className="text-gray-700 dark:text-slate-200 mt-0.5">{clienteData.cliente.referenciasPersonales}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-800/90 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Monto prestado</p>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatCurrency(prestamo.monto)}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Interés: {prestamo.interes}%</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800/90 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Saldo pendiente</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(prestamo.saldoPendiente)}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Total: {formatCurrency(prestamo.montoTotal)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-800/90 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                        <div>
                          <span className="text-gray-600 dark:text-slate-400">Valor por cuota:</span>
                          <p className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(prestamo.valorCuota)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-slate-400">Progreso:</span>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            {prestamo.cuotasPagadas}/{prestamo.cuotas} cuotas
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-slate-400">Fecha inicio:</span>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{fechaInicio}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-slate-400">Fecha fin:</span>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{fechaFin}</p>
                        </div>
                        {prestamo.diasGracia !== undefined && prestamo.diasGracia > 0 && (
                          <div>
                            <span className="text-gray-600 dark:text-slate-400">Días de gracia:</span>
                            <p className="font-medium text-blue-600 dark:text-blue-400">{prestamo.diasGracia} días</p>
                          </div>
                        )}
                        {prestamo.moraCredito !== undefined && prestamo.moraCredito > 0 && (
                          <div>
                            <span className="text-gray-600 dark:text-slate-400">Mora:</span>
                            <p className="font-medium text-orange-600 dark:text-orange-400">{prestamo.moraCredito}%</p>
                          </div>
                        )}
                        {prestamo.multa !== undefined && Number(prestamo.multa) > 0 && (
                          <div>
                            <span className="text-rose-600 dark:text-rose-400 font-medium">Multa / Penalidad:</span>
                            <p className="font-bold text-rose-600 dark:text-rose-400">+{formatCurrency(prestamo.multa)}</p>
                          </div>
                        )}
                      </div>

                      {/* Estado y detalle del Microseguro */}
                      {prestamo.microseguroTipo && prestamo.microseguroTipo !== 'NINGUNO' && (Number(prestamo.microseguroTotal) > 0 || Number(prestamo.microseguroValor) > 0 || prestamo.microseguroTipo === 'DEVOLUCION') ? (
                        <div className="bg-purple-50 dark:bg-purple-950/60 rounded-lg p-3 border border-purple-200 dark:border-purple-800 text-xs shadow-sm space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-300 shrink-0" />
                              <div>
                                <span className="text-purple-900 dark:text-purple-100 font-bold block sm:inline">Microseguro: </span>
                                <span className="text-purple-700 dark:text-purple-300 font-normal">
                                  ({prestamo.microseguroTipo === 'MONTO_FIJO' ? 'Monto fijo' : prestamo.microseguroTipo === 'DEVOLUCION' ? 'Devolución' : 'Porcentaje'})
                                </span>
                              </div>
                            </div>
                            <span className="font-extrabold text-sm text-purple-900 dark:text-purple-100 shrink-0">
                              {formatCurrency(Number(prestamo.microseguroTotal || prestamo.microseguroValor || 0))}
                            </span>
                          </div>

                          {Number(prestamo.seguroDevuelto || 0) > 0 && (
                            <div className="pt-2 border-t border-purple-200 dark:border-purple-800/70 grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 rounded p-1.5 px-2">
                                <span className="text-gray-600 dark:text-slate-300 font-medium">Devuelto:</span>
                                <span className="text-green-700 dark:text-green-400 font-bold">+{formatCurrency(prestamo.seguroDevuelto || 0)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 rounded p-1.5 px-2">
                                <span className="text-gray-600 dark:text-slate-300 font-medium">Por devolver:</span>
                                <span className="text-purple-800 dark:text-purple-200 font-bold">
                                  {formatCurrency(Math.max(0, Number(prestamo.microseguroTotal || 0) - Number(prestamo.seguroDevuelto || 0)))}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-800/90 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                            <span className="font-medium text-slate-700 dark:text-slate-200">Microseguro:</span>
                          </div>
                          <span className="font-medium text-slate-500 dark:text-slate-400">Sin seguro incluido</span>
                        </div>
                      )}

                      {prestamo.observaciones && (
                        <div className="bg-yellow-50 dark:bg-yellow-950/40 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800 text-xs">
                          <span className="text-yellow-700 dark:text-yellow-300 font-medium">📝 Observaciones: </span>
                          <p className="text-gray-700 dark:text-slate-200 mt-1">{prestamo.observaciones}</p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                          <span>Progreso del préstamo</span>
                          <span className="font-semibold text-gray-900 dark:text-slate-200">
                            {getProgressPercentage(prestamo.cuotasPagadas, prestamo.cuotas).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500 shadow-sm"
                            style={{
                              width: `${getProgressPercentage(prestamo.cuotasPagadas, prestamo.cuotas)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
})

export default function ListadoGeneralClient({ session }: ListadoGeneralClientProps) {
  const [clientes, setClientes] = useState<ClienteConPrestamos[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [activeTab, setActiveTab] = useState<'OK' | 'PROXIMO_A_VENCER' | 'MOROSO' | 'VENCIDO' | 'INACTIVO'>('OK')
  const [soloConSaldo, setSoloConSaldo] = useState(true)
  const [selectedPrestamo, setSelectedPrestamo] = useState<Prestamo | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<ClienteConPrestamos | null>(null)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string, title: string, subtitle?: string } | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)
  const { toast } = useToast()
  const { format: formatCurrency } = useCurrency()

  const { ref: observerRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  })

  // Cargar más al llegar al final
  useEffect(() => {
    if (inView) {
      setVisibleCount(prev => prev + 20)
    }
  }, [inView])

  // Resetear el conteo visible al cambiar los filtros
  useEffect(() => {
    setVisibleCount(20)
  }, [deferredSearchTerm, activeTab, soloConSaldo])

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/prestamos?conSaldo=${soloConSaldo}`)
      if (response.ok) {
        const data = await response.json()
        setClientes(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
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
  }, [soloConSaldo, toast])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  // Refrescar al recibir eventos de modificación de clientes
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Cliente modificado, refrescando listado...')
      fetchClientes()
    }

    window.addEventListener('clienteCreado', handleRefresh)
    window.addEventListener('clienteActualizado', handleRefresh)
    window.addEventListener('clienteEliminado', handleRefresh)

    return () => {
      window.removeEventListener('clienteCreado', handleRefresh)
      window.removeEventListener('clienteActualizado', handleRefresh)
      window.removeEventListener('clienteEliminado', handleRefresh)
    }
  }, [fetchClientes])

  const handlePagoRapido = useCallback((prestamo: Prestamo, cliente: ClienteConPrestamos) => {
    setSelectedPrestamo(prestamo)
    setSelectedCliente(cliente)
    setShowPagoModal(true)
  }, [])

  const onPagoSuccess = useCallback(() => {
    setShowPagoModal(false)
    setSelectedPrestamo(null)
    setSelectedCliente(null)
    fetchClientes()
    toast({
      title: "Pago registrado",
      description: "El pago se ha registrado exitosamente",
    })
  }, [fetchClientes, toast])

  const toggleCardExpansion = useCallback((clienteId: string) => {
    setExpandedCards(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(clienteId)) {
        newExpanded.delete(clienteId)
      } else {
        newExpanded.add(clienteId)
      }
      return newExpanded
    })
  }, [])

  const abrirImagenModal = useCallback((cliente: ClienteConPrestamos['cliente']) => {
    if (cliente.foto) {
      setSelectedImage({
        url: cliente.foto,
        title: `${cliente.nombre} ${cliente.apellido}`,
        subtitle: `Código: ${cliente.codigoCliente} • Doc: ${cliente.documento}`
      })
      setShowImageModal(true)
    }
  }, [])

  const abrirMapa = useCallback((direccion: string, tipo: string, mapLink?: string | null) => {
    try {
      if (mapLink && mapLink.startsWith('http')) {
        const nuevaVentana = window.open(mapLink, '_blank', 'noopener,noreferrer')
        if (!nuevaVentana || nuevaVentana.closed || typeof nuevaVentana.closed === 'undefined') {
          toast({
            title: "Ventana bloqueada",
            description: "Tu navegador bloqueó la ventana emergente. Abriendo en la misma pestaña...",
            variant: "default",
          })
          setTimeout(() => {
            window.location.href = mapLink
          }, 2000)
        } else {
          toast({
            title: "Mapa abierto",
            description: `Se abrió Google Maps con el link de ${tipo}`,
            variant: "default",
          })
        }
        return
      }

      const direccionLimpia = direccion.trim()
      if (!direccionLimpia) {
        toast({
          title: "Error",
          description: "La dirección está vacía",
          variant: "destructive",
        })
        return
      }

      if (direccionLimpia.startsWith('http')) {
        const nuevaVentana = window.open(direccionLimpia, '_blank', 'noopener,noreferrer')
        if (!nuevaVentana || nuevaVentana.closed || typeof nuevaVentana.closed === 'undefined') {
          toast({
            title: "Ventana bloqueada",
            description: "Tu navegador bloqueó la ventana emergente. Abriendo en la misma pestaña...",
            variant: "default",
          })
          setTimeout(() => {
            window.location.href = direccionLimpia
          }, 2000)
        } else {
          toast({
            title: "Mapa abierto",
            description: `Se abrió Google Maps con el link de ${tipo}`,
            variant: "default",
          })
        }
        return
      }

      const direccionFormateada = encodeURIComponent(direccionLimpia)
      const url = `https://www.google.com/maps/search/?api=1&query=${direccionFormateada}`

      const nuevaVentana = window.open(url, '_blank', 'noopener,noreferrer')

      if (!nuevaVentana || nuevaVentana.closed || typeof nuevaVentana.closed === 'undefined') {
        toast({
          title: "Ventana bloqueada",
          description: "Tu navegador bloqueó la ventana emergente. Abriendo en la misma pestaña...",
          variant: "default",
        })

        setTimeout(() => {
          window.location.href = url
        }, 2000)
      } else {
        toast({
          title: "Mapa abierto",
          description: `Se abrió Google Maps con la dirección de ${tipo}`,
          variant: "default",
        })
      }
    } catch (error) {
      console.error('Error al abrir mapa:', error)
      toast({
        title: "Error",
        description: "No se pudo abrir Google Maps. Intenta copiar la dirección manualmente.",
        variant: "destructive",
      })
    }
  }, [toast])

  const copiarDireccion = useCallback(async (direccion: string, tipo: string) => {
    try {
      await navigator.clipboard.writeText(direccion)
      toast({
        title: "Dirección copiada",
        description: `Se copió la dirección de ${tipo} al portapapeles`,
        variant: "default",
      })
    } catch (error) {
      console.error('Error al copiar:', error)
      toast({
        title: "Error",
        description: "No se pudo copiar la dirección",
        variant: "destructive",
      })
    }
  }, [toast])

  // 1. Pre-computar estado de alerta, tipo de pago e índice de búsqueda UNA SOLA VEZ cuando cambia la lista de clientes
  const clientesConMetadata = useMemo(() => {
    const hoy = new Date()
    const hoyMidnight = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const ayerMidnight = new Date(hoyMidnight.getTime() - 24 * 60 * 60 * 1000)

    return clientes.map((clienteData) => {
      const estadoAlerta = calcularEstadoCliente(clienteData, hoy, hoyMidnight, ayerMidnight)
      const tipoPagoInfo = getTipoPagoBadge(clienteData)
      const searchIndex = `${clienteData.cliente.nombre} ${clienteData.cliente.apellido} ${clienteData.cliente.documento} ${clienteData.cliente.codigoCliente} ${clienteData.cliente.telefono || ''}`.toLowerCase()

      return {
        ...clienteData,
        estadoAlerta,
        tipoPagoInfo,
        searchIndex
      }
    })
  }, [clientes])

  // 2. Conteo instantáneo O(N) por pestaña
  const tabCounts = useMemo(() => {
    const counts = { OK: 0, PROXIMO_A_VENCER: 0, MOROSO: 0, VENCIDO: 0, INACTIVO: 0 }
    for (const c of clientesConMetadata) {
      if (c.estadoAlerta?.estado && counts[c.estadoAlerta.estado as keyof typeof counts] !== undefined) {
        counts[c.estadoAlerta.estado as keyof typeof counts]++
      }
    }
    return counts
  }, [clientesConMetadata])

  // 3. Filtrado ultra-rápido en memoria (<1ms) sin recalcular fechas ni scores pesados
  const clientesFiltradosActivos = useMemo(() => {
    const searchLower = deferredSearchTerm.toLowerCase().trim()

    return clientesConMetadata.filter((c) => {
      if (c.estadoAlerta.estado !== activeTab) return false
      if (searchLower && !c.searchIndex.includes(searchLower)) return false
      return true
    })
  }, [clientesConMetadata, deferredSearchTerm, activeTab])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#071313]">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-[#071313] text-foreground transition-colors duration-200 overflow-x-hidden">
      <BackgroundHalo />
      {/* Header */}
      <div className="bg-white dark:bg-[#102525] shadow-sm border-b dark:border-[#34766D]">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="dark:text-[#F4FFFF] dark:hover:bg-[#173333]">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-[#F4FFFF] whitespace-nowrap">Listado General</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        {/* Filtros */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-[#9CB7B2]" />
            <Input
              placeholder="Buscar por nombre, código, documento o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 dark:bg-[#173333] dark:border-[#34766D] dark:text-[#F4FFFF] dark:placeholder-[#9CB7B2]"
            />
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant={soloConSaldo ? "default" : "outline"}
              onClick={() => setSoloConSaldo(!soloConSaldo)}
              className={`flex items-center space-x-2 ${soloConSaldo ? "dark:bg-[#36E2C2] dark:text-[#071313] dark:hover:bg-[#28CBAE]" : "dark:bg-[#173333] dark:border-[#34766D] dark:text-[#F4FFFF]"}`}
            >
              <Filter className="h-4 w-4" />
              <span>{soloConSaldo ? "Solo con saldo" : "Todos los préstamos"}</span>
            </Button>

            <div className="text-sm text-gray-500 dark:text-[#9CB7B2]">
              {clientesFiltradosActivos.length} cliente{clientesFiltradosActivos.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Custom Tabs - 5 Options */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-gray-100 dark:bg-[#102525] p-1 border dark:border-[#34766D] rounded-lg mb-6 w-full">
          <button
            onClick={() => setActiveTab('OK')}
            className={`py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'OK' 
                ? 'bg-white text-green-700 dark:bg-[#36E2C2] dark:text-[#071313] shadow-sm' 
                : 'text-gray-500 dark:text-[#9CB7B2] hover:text-gray-700 dark:hover:text-[#F4FFFF] hover:bg-gray-200/50 dark:hover:bg-[#173333]'
            }`}
          >
            <span>Al Día</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-green-100 dark:bg-[#173333] text-green-800 dark:text-[#36E2C2]">{tabCounts.OK}</span>
          </button>
          <button
            onClick={() => setActiveTab('PROXIMO_A_VENCER')}
            className={`py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PROXIMO_A_VENCER' 
                ? 'bg-white text-yellow-600 dark:bg-[#F5A623] dark:text-[#071313] shadow-sm' 
                : 'text-gray-500 dark:text-[#9CB7B2] hover:text-gray-700 dark:hover:text-[#F4FFFF] hover:bg-gray-200/50 dark:hover:bg-[#173333]'
            }`}
          >
            <span>Próx. Vencer</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-[#173333] text-amber-800 dark:text-[#F5A623]">{tabCounts.PROXIMO_A_VENCER}</span>
          </button>
          <button
            onClick={() => setActiveTab('MOROSO')}
            className={`py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'MOROSO' 
                ? 'bg-white text-orange-600 dark:bg-[#F5A623] dark:text-[#071313] shadow-sm' 
                : 'text-gray-500 dark:text-[#9CB7B2] hover:text-gray-700 dark:hover:text-[#F4FFFF] hover:bg-gray-200/50 dark:hover:bg-[#173333]'
            }`}
          >
            <span>Morosos</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-[#173333] text-orange-800 dark:text-[#F5A623]">{tabCounts.MOROSO}</span>
          </button>
          <button
            onClick={() => setActiveTab('VENCIDO')}
            className={`py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'VENCIDO' 
                ? 'bg-white text-red-700 dark:bg-[#FF5C5C] dark:text-[#F4FFFF] shadow-sm' 
                : 'text-gray-500 dark:text-[#9CB7B2] hover:text-gray-700 dark:hover:text-[#F4FFFF] hover:bg-gray-200/50 dark:hover:bg-[#173333]'
            }`}
          >
            <span>Vencidos</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-[#173333] text-red-800 dark:text-[#FF5C5C]">{tabCounts.VENCIDO}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('INACTIVO')
              if (soloConSaldo) setSoloConSaldo(false)
            }}
            className={`col-span-2 sm:col-span-1 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'INACTIVO' 
                ? 'bg-white text-gray-700 dark:bg-[#173333] dark:text-[#F4FFFF] shadow-sm' 
                : 'text-gray-500 dark:text-[#9CB7B2] hover:text-gray-700 dark:hover:text-[#F4FFFF] hover:bg-gray-200/50 dark:hover:bg-[#173333]'
            }`}
          >
            <span>Inactivos</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-[#254642] text-gray-700 dark:text-gray-200">{tabCounts.INACTIVO}</span>
          </button>
        </div>

        {/* Lista de préstamos */}
        <div className="space-y-3">
          {clientesFiltradosActivos.slice(0, visibleCount).map((clienteData) => (
            <ClienteCard
              key={clienteData.cliente.id}
              clienteData={clienteData}
              isExpanded={expandedCards.has(clienteData.cliente.id)}
              toggleCardExpansion={toggleCardExpansion}
              abrirImagenModal={abrirImagenModal}
              abrirMapa={abrirMapa}
              copiarDireccion={copiarDireccion}
              handlePagoRapido={handlePagoRapido}
              formatCurrency={formatCurrency}
            />
          ))}

          {visibleCount < clientesFiltradosActivos.length && (
            <div ref={observerRef} className="py-6 flex justify-center items-center text-sm text-gray-500">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Cargando más resultados...
            </div>
          )}

          {clientesFiltradosActivos.length === 0 && (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay clientes
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {soloConSaldo
                  ? "No se encontraron préstamos con saldo pendiente"
                  : "No se encontraron préstamos que coincidan con la búsqueda"
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de pago rápido */}
      {selectedPrestamo && selectedCliente && (
        <PagoRapidoModal
          isOpen={showPagoModal}
          onClose={() => setShowPagoModal(false)}
          prestamo={{
            ...selectedPrestamo,
            cliente: selectedCliente.cliente
          }}
          onSuccess={onPagoSuccess}
        />
      )}

      {/* Modal de imagen */}
      {selectedImage && (
        <ImageViewerModal
          isOpen={showImageModal}
          onClose={() => {
            setShowImageModal(false)
            setSelectedImage(null)
          }}
          imageUrl={selectedImage.url}
          title={selectedImage.title}
          subtitle={selectedImage.subtitle}
        />
      )}
    </div>
  )
}

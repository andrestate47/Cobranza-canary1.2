

"use client"

import { forwardRef } from "react"
import { Receipt, Calendar as CalendarIcon, User, DollarSign, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface BoletaPagoData {
  id: string
  monto: number
  fecha: string
  observaciones?: string
  numeroBoleta: string
  prestamo: {
    id: string
    monto: number
    interes: number
    valorCuota: number
    montoTotal: number
    saldoPendiente: number
    fechaInicio: string
    tipoPago: string
    cuotas: number
    microseguroTipo?: string
    microseguroValor?: number
    microseguroTotal?: number
    ultimoPago?: {
      fecha: string
      monto: number
    }
  }
  cliente: {
    nombre: string
    apellido: string
    documento: string
    telefono?: string
    direccionCliente: string
  }
  usuario: {
    nombre: string
  }
  // Nuevos campos adicionales
  tipoCredito?: string // 'efectivo' | 'transferencia'
  tipoPagoMetodo?: string // 'efectivo' | 'transferencia'
}

interface BoletaPagoProps {
  data: BoletaPagoData
  className?: string
}

const BoletaPago = forwardRef<HTMLDivElement, BoletaPagoProps>(
  ({ data, className = "" }, ref) => {
    console.log('📋 === BOLETA PAGO RENDER ===')
    console.log('📋 Data recibida:', data)
    console.log('📋 numeroBoleta:', data?.numeroBoleta)
    console.log('📋 cliente:', data?.cliente)
    console.log('📋 monto:', data?.monto)
    console.log('📋 === FIN BOLETA INFO ===')

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount)
    }

    const formatDate = (dateString: string) => {
      if (!dateString) return ''
      return format(new Date(dateString), "dd/MM/yyyy, hh:mm a", { locale: es })
    }

    const formatDateOnly = (dateString: string | Date) => {
      if (!dateString) return ''

      try {
        const fechaStr = String(dateString)
        const fechaIso = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr

        if (fechaIso.includes('-')) {
          const [year, month, day] = fechaIso.split('-')
          // Construir fecha UTC mediodía
          const fecha = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0))
          return new Intl.DateTimeFormat('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC'
          }).format(fecha)
        }
      } catch (e) {
        console.error("Error formatting date only:", e)
      }

      const date = new Date(dateString)
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)
    }

    // Función para obtener días entre pagos según el tipo
    const getDiasEntrePagos = (tipoPago: string): number => {
      const tiposMap: { [key: string]: number } = {
        'DIARIO': 1,
        'SEMANAL': 7,
        'LUNES_A_VIERNES': 1, // Se calculará con lógica especial
        'LUNES_A_SABADO': 1, // Se calculará con lógica especial
        'QUINCENAL': 15,
        'CATORCENAL': 14,
        'FIN_DE_MES': 30,
        'MENSUAL': 30,
        'TRIMESTRAL': 90,
        'CUATRIMESTRAL': 120,
        'SEMESTRAL': 180,
        'ANUAL': 365
      }
      return tiposMap[tipoPago] || 1
    }

    // Función para calcular cuotas atrasadas
    const calcularCuotasAtrasadas = (fechaInicio: string, tipoPago: string, cuotasPagadas: number, totalCuotas: number, fechaReferencia: string): number => {
      // Normalizar fecha de inicio usando componentes locales en UTC mediodía
      const fechaInicioStr = String(fechaInicio).split('T')[0]
      const [yI, mI, dI] = fechaInicioStr.split('-').map(Number)
      const inicioNormalized = new Date(Date.UTC(yI, mI - 1, dI, 12, 0, 0))

      // Normalizar fecha de referencia
      const fechaRefStr = String(fechaReferencia).split('T')[0]
      const [yR, mR, dR] = fechaRefStr.split('-').map(Number)
      const referenciaNormalized = new Date(Date.UTC(yR, mR - 1, dR, 12, 0, 0))

      // Si la referencia es anterior al inicio, no hay atraso
      if (referenciaNormalized < inicioNormalized) return 0

      // Si cuotas pagadas supera el total, no hay atraso
      if (cuotasPagadas >= totalCuotas) return 0

      let cuotasEsperadas = 0
      const oneDay = 1000 * 60 * 60 * 24
      const diasTranscurridos = Math.floor((referenciaNormalized.getTime() - inicioNormalized.getTime()) / oneDay)

      if (tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'LUNES_A_SABADO' || tipoPago === 'DIARIO') {
        let diasLaborales = 0
        const current = new Date(inicioNormalized)
        current.setUTCDate(current.getUTCDate() + 1)

        while (current < referenciaNormalized) {
          const day = current.getUTCDay()
          let valid = false
          if (tipoPago === 'LUNES_A_VIERNES' && day !== 0 && day !== 6) valid = true
          if (tipoPago === 'LUNES_A_SABADO' && day !== 0) valid = true
          if (tipoPago === 'DIARIO' && day !== 0) valid = true

          if (valid) {
            diasLaborales++
          }
          current.setUTCDate(current.getUTCDate() + 1)
        }
        cuotasEsperadas = diasLaborales
      } else {
        const diasEntrePagos = getDiasEntrePagos(tipoPago)
        cuotasEsperadas = Math.floor(diasTranscurridos / diasEntrePagos)
      }

      const atrasadas = Math.max(0, Math.min(cuotasEsperadas - cuotasPagadas, totalCuotas - cuotasPagadas))
      return atrasadas
    }

    // Función para calcular días vencidos
    const calcularDiasVencidos = (fechaInicio: string, tipoPago: string, cuotasPagadas: number, fechaReferencia: string): number => {
      const fechaInicioStr = String(fechaInicio).split('T')[0]
      const [yI, mI, dI] = fechaInicioStr.split('-').map(Number)
      const inicioNormalized = new Date(Date.UTC(yI, mI - 1, dI, 12, 0, 0))

      const fechaRefStr = String(fechaReferencia).split('T')[0]
      const [yR, mR, dR] = fechaRefStr.split('-').map(Number)
      const referenciaNormalized = new Date(Date.UTC(yR, mR - 1, dR, 12, 0, 0))

      if (tipoPago === 'LUNES_A_SABADO' || tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'DIARIO') {
        let diasLaboralesTranscurridos = 0
        const current = new Date(inicioNormalized)

        while (current < referenciaNormalized) {
          current.setUTCDate(current.getUTCDate() + 1)
          const day = current.getUTCDay()
          let valid = false
          if (tipoPago === 'LUNES_A_SABADO' && day !== 0) valid = true
          if (tipoPago === 'LUNES_A_VIERNES' && (day !== 0 && day !== 6)) valid = true
          if (tipoPago === 'DIARIO' && day !== 0) valid = true

          if (valid) {
            diasLaboralesTranscurridos++
          }
        }

        const diasCubiertos = cuotasPagadas // 1 cuota cubre 1 día laboral
        const diasVencidos = Math.max(0, diasLaboralesTranscurridos - diasCubiertos)
        return diasVencidos
      }

      // Para otros pagos (Diario, Semanal, etc)
      const diasEntrePagos = getDiasEntrePagos(tipoPago)
      const ultimaCuotaEsperada = new Date(inicioNormalized)
      ultimaCuotaEsperada.setUTCDate(ultimaCuotaEsperada.getUTCDate() + (cuotasPagadas * diasEntrePagos))

      if (referenciaNormalized > ultimaCuotaEsperada) {
        return Math.floor((referenciaNormalized.getTime() - ultimaCuotaEsperada.getTime()) / (1000 * 60 * 60 * 24))
      }

      return 0
    }

    // Función para calcular fecha del próximo pago
    const calcularFechaProximoPago = (fechaInicio: string, tipoPago: string, proximaCuota: number): Date => {
      // Normalizar fecha de inicio para evitar problemas de zona horaria
      // Asumimos que la fecha viene como YYYY-MM-DD o ISO. Tomamos los componentes locales.
      const fechaStr = String(fechaInicio).split('T')[0]
      const [year, month, day] = fechaStr.split('-').map(Number)
      const inicioDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

      // Si es cuota 0 o negativa, devolver inicio
      if (proximaCuota < 1) return inicioDate

      // Lógica precisa para días hábiles
      let fechaProximoPago: Date
      if (tipoPago === 'LUNES_A_SABADO' || tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'DIARIO') {
        const targetCuota = Math.floor(proximaCuota)
        let cuotasContadas = 0
        let diaActual = new Date(inicioDate)

        // Iterar hasta llegar a la cuota deseada
        while (cuotasContadas < targetCuota) {
          diaActual.setUTCDate(diaActual.getUTCDate() + 1)
          const diaSemana = diaActual.getUTCDay() // 0 = Domingo, 6 = Sábado

          let esDiaPago = true
          if (tipoPago === 'LUNES_A_SABADO' && diaSemana === 0) esDiaPago = false
          if (tipoPago === 'LUNES_A_VIERNES' && (diaSemana === 0 || diaSemana === 6)) esDiaPago = false
          if (tipoPago === 'DIARIO' && diaSemana === 0) esDiaPago = false

          if (esDiaPago) {
            cuotasContadas++
          }
        }
        return diaActual
      }

      const diasEntrePagos = getDiasEntrePagos(tipoPago)

      const fechaProxima = new Date(inicioDate)
      fechaProxima.setUTCDate(fechaProxima.getUTCDate() + (proximaCuota * diasEntrePagos))

      return fechaProxima
    }

    // Función para calcular días transcurridos consistentes con el detalle (días hábiles según tipo)
    const calcularDiasTranscurridosPro = (fechaInicio: string, fechaReferencia: string, tipoPago: string): number => {
      const fechaInicioStr = String(fechaInicio).split('T')[0]
      const [yI, mI, dI] = fechaInicioStr.split('-').map(Number)
      const inicioMid = new Date(Date.UTC(yI, mI - 1, dI, 12, 0, 0))

      const fechaRefStr = String(fechaReferencia).split('T')[0]
      const [yR, mR, dR] = fechaRefStr.split('-').map(Number)
      const referenciaMid = new Date(Date.UTC(yR, mR - 1, dR, 12, 0, 0))

      if (tipoPago === 'LUNES_A_SABADO' || tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'DIARIO') {
        let diasHabiles = 0
        let current = new Date(inicioMid)
        current.setUTCDate(current.getUTCDate() + 1)

        while (current <= referenciaMid) {
          const d = current.getUTCDay()
          let valid = true
          if (tipoPago === 'LUNES_A_SABADO' && d === 0) valid = false
          if (tipoPago === 'LUNES_A_VIERNES' && (d === 0 || d === 6)) valid = false
          if (tipoPago === 'DIARIO' && d === 0) valid = false

          if (valid) diasHabiles++
          current.setUTCDate(current.getUTCDate() + 1)
        }
        return diasHabiles
      }

      // Fallback para otros tipos: días calendario
      return Math.max(0, Math.floor((referenciaMid.getTime() - inicioMid.getTime()) / (1000 * 60 * 60 * 24)))
    }

    // Función para formatear el tipo de pago
    const formatTipoPago = (tipoPago: string): string => {
      const tiposMap: { [key: string]: string } = {
        'DIARIO': 'Diario',
        'SEMANAL': 'Semanal',
        'LUNES_A_VIERNES': 'Lunes a Viernes',
        'LUNES_A_SABADO': 'Lunes a Sábado',
        'QUINCENAL': 'Quincenal',
        'CATORCENAL': 'Catorcenal',
        'FIN_DE_MES': 'Fin de Mes',
        'MENSUAL': 'Mensual',
        'TRIMESTRAL': 'Trimestral',
        'CUATRIMESTRAL': 'Cuatrimestral',
        'SEMESTRAL': 'Semestral',
        'ANUAL': 'Anual'
      }
      return tiposMap[tipoPago] || tipoPago
    }

    // Calcular totales dinámicos
    const totalPagado = data.prestamo.montoTotal - data.prestamo.saldoPendiente
    const cuotasPagadas = data.prestamo.valorCuota > 0 ? totalPagado / data.prestamo.valorCuota : 0
    const totalCuotas = data.prestamo.cuotas || Math.ceil(data.prestamo.montoTotal / data.prestamo.valorCuota)
    const progresoPrecentaje = ((totalPagado / data.prestamo.montoTotal) * 100).toFixed(1)

    // Nuevos cálculos adicionales
    // Nuevos cálculos adicionales
    // IMPORTANTE: Usamos Math.floor para cuotasPagadas para cálculos de "cuotas completas" en la lógica de atraso
    // pero mantenemos el decimal para el progreso visual.
    const cuotasPagadasEnteras = Math.floor(cuotasPagadas)

    const cuotasPendientes = Math.max(0, totalCuotas - cuotasPagadas)

    // Calcular atraso REAL AL MOMENTO DEL PAGO
    // Si estamos viendo un recibo histórico, 'cuotasPagadas' debería ser el acumulado HASTA ese pago.
    // data.prestamo.saldoPendiente viene ya calculado para ese momento histórico en handleVerBoletaPago,
    // por lo tanto 'cuotasPagadas' derivada de ahí es correcta para ese momento.

    const cuotasAtrasadas = calcularCuotasAtrasadas(data.prestamo.fechaInicio, data.prestamo.tipoPago, cuotasPagadas, totalCuotas, data.fecha as string)

    // Para días vencidos, refinamos: solo si hay atraso
    let diasVencidos = 0
    if (cuotasAtrasadas > 0) {
      diasVencidos = calcularDiasVencidos(data.prestamo.fechaInicio, data.prestamo.tipoPago, cuotasPagadas, data.fecha as string)
    }

    const valorEnAtraso = cuotasAtrasadas * data.prestamo.valorCuota
    const fechaProximoPago = calcularFechaProximoPago(data.prestamo.fechaInicio, data.prestamo.tipoPago, Math.floor(cuotasPagadas) + 1)
    const diasTranscurridos = calcularDiasTranscurridosPro(data.prestamo.fechaInicio, data.fecha as string, data.prestamo.tipoPago)

    return (
      <div ref={ref} className={`bg-white ${className}`}>
        <div className="max-w-md mx-auto space-y-4">
          {/* Observaciones del Pago - Al principio */}
          {data.observaciones && (
            <Card className="shadow-sm border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <Receipt className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-800 mb-1">Observaciones</h3>
                    <p className="text-gray-700">{data.observaciones}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información del Cliente */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center mb-3">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Información del Cliente</h3>
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-bold text-gray-900">
                  {data.cliente.nombre} {data.cliente.apellido}
                </h4>
                <div className="flex items-center text-gray-600">
                  <CreditCard className="h-4 w-4 mr-2" />
                  <span>Documento: {data.cliente.documento}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>{data.cliente.direccionCliente}</span>
                </div>
                {data.cliente.telefono && (
                  <div className="flex items-center text-blue-600">
                    <span className="text-sm font-medium">{data.cliente.telefono}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información del Préstamo */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Información del Préstamo</h3>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Activo
                </span>
              </div>

              {/* Montos principales */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(data.prestamo.monto)}
                  </p>
                  <p className="text-sm text-gray-500">Monto Prestado</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalPagado)}
                  </p>
                  <p className="text-sm text-gray-500">Total Pagado</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(data.prestamo.saldoPendiente)}
                  </p>
                  <p className="text-sm text-gray-500">Saldo Pendiente</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(data.prestamo.valorCuota)}
                  </p>
                  <p className="text-sm text-gray-500">Valor Cuota</p>
                </div>
              </div>

              <Separator className="my-3" />

              {/* Detalles del préstamo */}
              <div className="space-y-2 text-sm">
                {/* Información básica */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de crédito:</span>
                  <span className="font-medium capitalize">{data.tipoCredito || 'Efectivo'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de pago:</span>
                  <span className="font-medium">{formatTipoPago(data.prestamo.tipoPago)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto total:</span>
                  <span className="font-medium">{formatCurrency(data.prestamo.montoTotal)}</span>
                </div>

                {/* Información del Microseguro */}
                {data.prestamo.microseguroTipo && data.prestamo.microseguroTipo !== 'NINGUNO' && data.prestamo.microseguroTotal && data.prestamo.microseguroTotal > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="bg-purple-50 rounded-lg p-2 space-y-1">
                      <div className="flex items-center mb-1">
                        <Receipt className="h-3 w-3 text-purple-600 mr-1" />
                        <span className="text-xs font-semibold text-purple-900">Microseguro</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium text-purple-700">
                          {data.prestamo.microseguroTipo === 'MONTO_FIJO' ? 'Monto Fijo' : 'Porcentaje'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {data.prestamo.microseguroTipo === 'MONTO_FIJO' ? 'Monto:' : 'Porcentaje:'}
                        </span>
                        <span className="font-medium text-purple-700">
                          {data.prestamo.microseguroTipo === 'MONTO_FIJO'
                            ? formatCurrency(data.prestamo.microseguroValor || 0)
                            : `${data.prestamo.microseguroValor}%`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-purple-200 pt-1">
                        <span className="text-gray-600 font-medium">Total microseguro:</span>
                        <span className="font-bold text-purple-900">
                          {formatCurrency(data.prestamo.microseguroTotal)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <Separator className="my-2" />

                {/* Estado de cuotas */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Total cuotas:</span>
                  <span className="font-medium">{totalCuotas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cuotas pagadas:</span>
                  <span className="font-medium text-green-600">{Number(cuotasPagadas.toFixed(2))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cuotas pendientes:</span>
                  <span className="font-medium text-orange-600">{cuotasPendientes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cuotas atrasadas:</span>
                  <span className={`font-medium ${cuotasAtrasadas > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Number(cuotasAtrasadas.toFixed(2))}
                  </span>
                </div>

                <Separator className="my-2" />

                {/* Estado de atraso */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Días vencidos:</span>
                  <span className={`font-medium ${diasVencidos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {diasVencidos} días
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor en atraso:</span>
                  <span className={`font-medium ${valorEnAtraso > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(valorEnAtraso)}
                  </span>
                </div>

                <Separator className="my-2" />

                {/* Información de fechas */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha inicio:</span>
                  <span className="font-medium">{formatDateOnly(data.prestamo.fechaInicio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Días transcurridos (al pago):</span>
                  <span className="font-medium">{diasTranscurridos} días</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha próximo pago:</span>
                  <span className="font-medium text-blue-600">{formatDateOnly(fechaProximoPago)}</span>
                </div>

                {/* Información del último pago */}
                {data.prestamo.ultimoPago && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-gray-600">Último pago:</span>
                      <span className="font-medium">
                        {formatCurrency(data.prestamo.ultimoPago.monto)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha último pago:</span>
                      <span className="font-medium">{formatDate(data.prestamo.ultimoPago.fecha)}</span>
                    </div>
                  </>
                )}

                <Separator className="my-2" />

                {/* Información del pago actual */}
                <div className="flex justify-between bg-blue-50 p-2 rounded-md mb-2">
                  <span className="text-blue-700 font-bold">Monto de este abono:</span>
                  <span className="font-bold text-blue-800 text-lg">{formatCurrency(data.monto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha del pago:</span>
                  <span className="font-medium text-blue-600">{formatDate(data.fecha)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Método de pago actual:</span>
                  <span className="font-medium capitalize">{data.tipoPagoMetodo || 'Efectivo'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Creado por:</span>
                  <span className="font-medium">{data.usuario.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Progreso del préstamo:</span>
                  <span className="font-medium text-purple-600">{progresoPrecentaje}%</span>
                </div>
              </div>

              {/* Número de boleta destacado */}
              <div className="mt-4 bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 mb-1">Número de Boleta</p>
                <p className="text-lg font-mono font-bold text-blue-600">
                  {data.numeroBoleta}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
)

BoletaPago.displayName = "BoletaPago"

export default BoletaPago


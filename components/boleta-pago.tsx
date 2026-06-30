

"use client"

import { forwardRef } from "react"
import { Receipt, Calendar as CalendarIcon, User, DollarSign, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCurrency } from "@/hooks/use-currency"

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
  metodoPago?: string
  fotoComprobante?: string | null
  fotoMiniatura?: string | null
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

    const { format: formatCurrency, logoUrl } = useCurrency()

    const formatDate = (dateString: string | Date | null | undefined) => {
      if (!dateString) return ''
      try {
        const d = new Date(dateString)
        if (isNaN(d.getTime())) return String(dateString)
        
        // Usa el huso horario local automático del teléfono del cobrador de forma robusta
        return new Intl.DateTimeFormat('es-CO', {
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true
        }).format(d)
      } catch (e) {
        return String(dateString)
      }
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

    // Convierte el timestamp del pago a la fecha local en formato YYYY-MM-DD
    const getLocalYYYYMMDD = (dateString: string | Date): string => {
      const str = String(dateString)
      if (str.includes('T') && str.length > 15) {
        const d = new Date(str)
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }
      }
      return str.split('T')[0]
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
      const fechaRefStr = getLocalYYYYMMDD(fechaReferencia)
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

        while (current <= referenciaNormalized) {
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

      const fechaRefStr = getLocalYYYYMMDD(fechaReferencia)
      const [yR, mR, dR] = fechaRefStr.split('-').map(Number)
      const referenciaNormalized = new Date(Date.UTC(yR, mR - 1, dR, 12, 0, 0))

      if (tipoPago === 'LUNES_A_SABADO' || tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'DIARIO') {
        let current = new Date(inicioNormalized)
        current.setUTCDate(current.getUTCDate() + 1)
        
        let cuotasEsperadasTotales = 0;
        while (current <= referenciaNormalized) {
          const day = current.getUTCDay()
          let valid = false
          if (tipoPago === 'LUNES_A_SABADO' && day !== 0) valid = true
          if (tipoPago === 'LUNES_A_VIERNES' && (day !== 0 && day !== 6)) valid = true
          if (tipoPago === 'DIARIO' && day !== 0) valid = true

          if (valid) cuotasEsperadasTotales++;
          current.setUTCDate(current.getUTCDate() + 1);
        }
        
        let cuotasAtrasadasCount = Math.max(0, cuotasEsperadasTotales - cuotasPagadas);
        return Math.floor(cuotasAtrasadasCount);
      }

      // Para otros pagos (Diario, Semanal, etc)
      const diasEntrePagos = getDiasEntrePagos(tipoPago)
      const ultimaCuotaEsperada = new Date(inicioNormalized)
      ultimaCuotaEsperada.setUTCDate(ultimaCuotaEsperada.getUTCDate() + (cuotasPagadas * diasEntrePagos))

      if (referenciaNormalized > ultimaCuotaEsperada) {
        let current = new Date(ultimaCuotaEsperada)
        let diasVencidosCount = 0
        while (current <= referenciaNormalized) {
          const day = current.getUTCDay()
          let valid = true
          if (day === 0) valid = false // Excluir domingos siempre
          if (tipoPago === 'LUNES_A_VIERNES' && day === 6) valid = false // Excluir sábados si es lunes a viernes

          if (valid) {
            diasVencidosCount++
          }
          current.setUTCDate(current.getUTCDate() + 1)
        }
        return diasVencidosCount
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

      fechaProximoPago = new Date(inicioDate)
      fechaProximoPago.setUTCDate(fechaProximoPago.getUTCDate() + (Math.floor(proximaCuota) * diasEntrePagos))
      return fechaProximoPago;
    }

    const consolidarProximoPago = (fechaCalculada: Date, fechaReferenciaStr: string, tipoPago: string, tienePagoMismoDia: boolean): Date => {
      const fechaRefStr = getLocalYYYYMMDD(fechaReferenciaStr);
      const [yR, mR, dR] = fechaRefStr.split('-').map(Number);
      const referenciaMid = new Date(Date.UTC(yR, mR - 1, dR, 12, 0, 0));

      if (fechaCalculada < referenciaMid) {
        let proximaFechalogica = new Date(referenciaMid);
        
        if (tienePagoMismoDia && (tipoPago === 'LUNES_A_SABADO' || tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'DIARIO')) {
          proximaFechalogica.setUTCDate(proximaFechalogica.getUTCDate() + 1);
          let valid = false;
          while (!valid) {
            const d = proximaFechalogica.getUTCDay();
            valid = true;
            if (tipoPago === 'LUNES_A_SABADO' && d === 0) valid = false;
            if (tipoPago === 'LUNES_A_VIERNES' && (d === 0 || d === 6)) valid = false;
            if (tipoPago === 'DIARIO' && d === 0) valid = false;
            if (!valid) proximaFechalogica.setUTCDate(proximaFechalogica.getUTCDate() + 1);
          }
        }
        return proximaFechalogica;
      }
      return fechaCalculada;
    }

    // Función para calcular días transcurridos consistentes con el detalle (días hábiles según tipo)
    const calcularDiasTranscurridosPro = (fechaInicio: string, fechaReferencia: string, tipoPago: string): number => {
      const fechaInicioStr = String(fechaInicio).split('T')[0]
      const [yI, mI, dI] = fechaInicioStr.split('-').map(Number)
      const inicioMid = new Date(Date.UTC(yI, mI - 1, dI, 12, 0, 0))

      const fechaRefStr = getLocalYYYYMMDD(fechaReferencia)
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
    const totalCuotas = data.prestamo.cuotas || Math.ceil(data.prestamo.montoTotal / data.prestamo.valorCuota)
    const progresoPrecentaje = ((totalPagado / data.prestamo.montoTotal) * 100).toFixed(1)

    const prestamoFlex = data.prestamo as any
    const cuotasPagadas = (prestamoFlex.cuotasPagadasManual !== null && prestamoFlex.cuotasPagadasManual !== undefined)
      ? Number(prestamoFlex.cuotasPagadasManual)
      : (data.prestamo.valorCuota > 0 ? totalPagado / data.prestamo.valorCuota : 0)

    // Nuevos cálculos adicionales
    // IMPORTANTE: Usamos Math.floor para cuotasPagadas para cálculos de "cuotas completas" en la lógica de atraso
    // pero mantenemos el decimal para el progreso visual.
    const cuotasPagadasEnteras = Math.floor(cuotasPagadas)

    const cuotasPendientes = (prestamoFlex.cuotasPendientesManual !== null && prestamoFlex.cuotasPendientesManual !== undefined)
      ? Number(prestamoFlex.cuotasPendientesManual)
      : Math.max(0, totalCuotas - cuotasPagadas)

    // Calcular atraso REAL AL MOMENTO DEL PAGO
    // Si estamos viendo un recibo histórico, 'cuotasPagadas' debería ser el acumulado HASTA ese pago.
    // data.prestamo.saldoPendiente viene ya calculado para ese momento histórico en handleVerBoletaPago,
    // por lo tanto 'cuotasPagadas' derivada de ahí es correcta para ese momento.

    const cuotasAtrasadas = (prestamoFlex.cuotasAtrasadasManual !== null && prestamoFlex.cuotasAtrasadasManual !== undefined)
      ? Number(prestamoFlex.cuotasAtrasadasManual)
      : calcularCuotasAtrasadas(data.prestamo.fechaInicio, data.prestamo.tipoPago, cuotasPagadas, totalCuotas, data.fecha as string)

    // Para días vencidos, refinamos: solo si hay atraso
    let diasVencidos = 0
    if (prestamoFlex.diasVencidosManual !== null && prestamoFlex.diasVencidosManual !== undefined) {
      diasVencidos = Number(prestamoFlex.diasVencidosManual)
    } else if (cuotasAtrasadas > 0) {
      diasVencidos = calcularDiasVencidos(data.prestamo.fechaInicio, data.prestamo.tipoPago, cuotasPagadas, data.fecha as string)
    }

    const valorEnAtraso = (prestamoFlex.valorEnAtrasoManual !== null && prestamoFlex.valorEnAtrasoManual !== undefined)
      ? Number(prestamoFlex.valorEnAtrasoManual)
      : cuotasAtrasadas * data.prestamo.valorCuota
    
    let fechaProximaTeorica = calcularFechaProximoPago(data.prestamo.fechaInicio, data.prestamo.tipoPago, Math.floor(cuotasPagadas) + 1)
    
    // Verificamos si hubo pago en el mismo día que la fecha de referencia
    let pagoMismoDia = false;
    if (data.fecha) {
      pagoMismoDia = true; // El recibo se generó el día "data.fecha" y ES el pago actual.
    }
    
    const fechaProximoPago = consolidarProximoPago(fechaProximaTeorica, data.fecha as string, data.prestamo.tipoPago, pagoMismoDia);
    
    const diasTranscurridos = calcularDiasTranscurridosPro(data.prestamo.fechaInicio, data.fecha as string, data.prestamo.tipoPago)

    return (
      <div ref={ref} className={`bg-white p-6 ${className}`} style={{ width: '800px', margin: '0 auto' }}>
        <div className="w-full space-y-4">
          {/* Header con Logo */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="flex-shrink-0 bg-white rounded-lg p-2 border border-gray-100 shadow-sm flex items-center justify-center" style={{ width: '80px', height: '80px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? (
                <img src={`/api/files/system/${encodeURIComponent(logoUrl)}`} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
                <Receipt className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0" />
                Comprobante de Pago
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                N° {data.numeroBoleta} • {formatDate(data.fecha)}
              </p>
            </div>
            {data.fotoMiniatura && (
              <div className="flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm h-40 w-32 flex items-center justify-center bg-gray-50 ml-auto mr-6 p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={data.fotoMiniatura} 
                  alt="Miniatura Boleta" 
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>

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

          {/* Fila Superior: Cliente y Montos */}
          <div className="grid grid-cols-2 gap-4">
            {/* Información del Cliente */}
            <Card className="shadow-sm">
              <CardContent className="p-4 h-full">
                <div className="flex items-center mb-3 pb-2 border-b border-gray-100">
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

            {/* Montos principales */}
            <Card className="shadow-sm">
              <CardContent className="p-4 h-full">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Montos del Préstamo</h3>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Activo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
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

                <div className="grid grid-cols-2 gap-4">
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
              </CardContent>
            </Card>
          </div>

          {/* Información del Préstamo y Pago Detallado */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
                <Receipt className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Detalles del Préstamo y Pago Actual</h3>
              </div>

              <Separator className="my-3" />

              {/* Detalles del préstamo en dos columnas */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                
                {/* Columna Izquierda */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de crédito:</span>
                    <span className="font-medium capitalize">{data.tipoCredito || 'Efectivo'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de pago:</span>
                    <span className="font-medium">{formatTipoPago(data.prestamo.tipoPago)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto total a pagar:</span>
                    <span className="font-medium">{formatCurrency(data.prestamo.montoTotal)}</span>
                  </div>

                  <Separator className="my-2" />

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

                  {data.prestamo.ultimoPago && (
                    <>
                      <Separator className="my-2" />
                      <div className="flex justify-between">
                        <span className="text-gray-600">Último pago anterior:</span>
                        <span className="font-medium">
                          {formatCurrency(data.prestamo.ultimoPago.monto)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha del último pago:</span>
                        <span className="font-medium">{formatDate(data.prestamo.ultimoPago.fecha)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Columna Derecha */}
                <div className="space-y-2 text-sm">
                  {/* Destacado: El Abono Actual */}
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-blue-800 font-bold uppercase text-xs">Monto de este abono</span>
                      <span className="font-black text-blue-900 text-xl">{formatCurrency(data.monto)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Progreso total:</span>
                      <span className="font-bold">{progresoPrecentaje}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha de inicio:</span>
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

                  <Separator className="my-2" />

                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha del abono:</span>
                    <span className="font-medium text-blue-600">
                      {(() => {
                        try {
                          const local = getLocalYYYYMMDD(data.fecha)
                          const [y, m, d] = local.split('-')
                          return `${d}/${m}/${y}`
                        } catch {
                          return formatDateOnly(data.fecha)
                        }
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hora de registro:</span>
                    <span className="font-medium text-gray-700">
                      {(data.fecha ? new Date(data.fecha) : new Date()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método de pago:</span>
                    <span className="font-medium capitalize">{data.tipoPagoMetodo || data.metodoPago || 'Efectivo'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cobrador:</span>
                    <span className="font-medium">{data.usuario.nombre}</span>
                  </div>

                  {data.prestamo.microseguroTipo && data.prestamo.microseguroTipo !== 'NINGUNO' && data.prestamo.microseguroTotal && data.prestamo.microseguroTotal > 0 && (
                    <div className="mt-4 bg-purple-50 rounded-lg p-2 space-y-1">
                      <div className="flex items-center mb-1">
                        <Receipt className="h-3 w-3 text-purple-600 mr-1" />
                        <span className="text-xs font-semibold text-purple-900">Microseguro</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Monto/Porcentaje:</span>
                        <span className="font-medium text-purple-700">
                          {data.prestamo.microseguroTipo === 'MONTO_FIJO'
                            ? formatCurrency(data.prestamo.microseguroValor || 0)
                            : `${data.prestamo.microseguroValor}%`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-purple-200 pt-1 text-xs">
                        <span className="text-gray-600 font-medium">Total microseguro:</span>
                        <span className="font-bold text-purple-900">
                          {formatCurrency(data.prestamo.microseguroTotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Número de boleta destacado */}
              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Comprobante / Número de Boleta</p>
                <p className="text-xl font-mono font-bold text-gray-800 tracking-widest">
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


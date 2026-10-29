

"use client"

import { forwardRef } from "react"
import { Receipt, Calendar as CalendarIcon, User, DollarSign, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
    fechaFin?: string | Date
    tipoPago: string
    cuotas: number
    microseguroTipo?: string
    microseguroValor?: number
    microseguroTotal?: number
    seguroDevuelto?: number
    multa?: number
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
  devolucionSeguro?: number
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

    // Convierte el timestamp del pago a la fecha local (America/Bogota GMT-5) en formato YYYY-MM-DD
    const getLocalYYYYMMDD = (dateString: string | Date): string => {
      if (!dateString) return ''
      const str = String(dateString)
      try {
        const d = new Date(str)
        if (!isNaN(d.getTime())) {
          const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).formatToParts(d)
          const year = parts.find(p => p.type === 'year')?.value
          const month = parts.find(p => p.type === 'month')?.value
          const day = parts.find(p => p.type === 'day')?.value
          if (year && month && day) return `${year}-${month}-${day}`
        }
      } catch (e) {
        console.error("Error in getLocalYYYYMMDD:", e)
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

    // Función para calcular cuotas atrasadas a la fecha de referencia
    const calcularCuotasAtrasadas = (fechaInicio: string, tipoPago: string, cuotasPagadas: number, totalCuotas: number, fechaReferencia: string): number => {
      const fechaInicioStr = String(fechaInicio).split('T')[0]
      const [yI, mI, dI] = fechaInicioStr.split('-').map(Number)
      const inicioNormalized = new Date(Date.UTC(yI, mI - 1, dI, 12, 0, 0))

      const fechaRefStr = getLocalYYYYMMDD(fechaReferencia)
      const [yR, mR, dR] = fechaRefStr.split('-').map(Number)
      const referenciaNormalized = new Date(Date.UTC(yR, mR - 1, dR, 12, 0, 0))

      if (referenciaNormalized < inicioNormalized) return 0
      if (cuotasPagadas >= totalCuotas) return 0

      let cuotasEsperadas = 0
      const oneDay = 1000 * 60 * 60 * 24
      const diasTranscurridos = Math.max(0, Math.floor((referenciaNormalized.getTime() - inicioNormalized.getTime()) / oneDay))

      if (tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'LUNES_A_SABADO' || tipoPago === 'DIARIO') {
        let diasLaborales = 0
        const current = new Date(inicioNormalized)
        current.setUTCDate(current.getUTCDate() + 1)

        while (current <= referenciaNormalized) {
          const day = current.getUTCDay()
          let valid = true
          if (tipoPago === 'LUNES_A_VIERNES' && (day === 0 || day === 6)) valid = false
          if (tipoPago === 'LUNES_A_SABADO' && day === 0) valid = false
          if (tipoPago === 'DIARIO' && day === 0) valid = false

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

    // Función para calcular días vencidos exactamente igual al Perfil del Cliente
    const calcularDiasVencidos = (fechaInicio: string, tipoPago: string, cuotasPagadas: number, fechaReferencia: string, diasGracia = 0): number => {
      const fechaInicioStr = String(fechaInicio).split('T')[0]
      const [yI, mI, dI] = fechaInicioStr.split('-').map(Number)
      const inicioNormalized = new Date(Date.UTC(yI, mI - 1, dI, 12, 0, 0))

      const fechaRefStr = getLocalYYYYMMDD(fechaReferencia)
      const [yR, mR, dR] = fechaRefStr.split('-').map(Number)
      const referenciaNormalized = new Date(Date.UTC(yR, mR - 1, dR, 12, 0, 0))

      const proximaCuotaIdx = Math.floor(cuotasPagadas) + 1
      let fechaReferenciaMora: Date | null = null

      if (tipoPago === 'LUNES_A_SABADO' || tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'DIARIO') {
        let current = new Date(inicioNormalized)
        let count = 0
        while (count < proximaCuotaIdx) {
          current.setUTCDate(current.getUTCDate() + 1)
          const d = current.getUTCDay()
          let valid = true
          if (tipoPago === 'LUNES_A_SABADO' && d === 0) valid = false
          if (tipoPago === 'LUNES_A_VIERNES' && (d === 0 || d === 6)) valid = false
          if (tipoPago === 'DIARIO' && d === 0) valid = false

          if (valid) {
            count++
          }
        }
        fechaReferenciaMora = current
      } else {
        const diasEntrePagos = getDiasEntrePagos(tipoPago)
        const oneDay = 1000 * 60 * 60 * 24
        fechaReferenciaMora = new Date(inicioNormalized.getTime() + (proximaCuotaIdx * diasEntrePagos * oneDay))
      }

      if (fechaReferenciaMora && fechaReferenciaMora <= referenciaNormalized) {
        let diasHabilesVencidos = 0
        let tempDate = new Date(fechaReferenciaMora)
        while (tempDate <= referenciaNormalized) {
          const d = tempDate.getUTCDay()
          let esDiaValido = true
          if (d === 0) esDiaValido = false
          if (tipoPago === 'LUNES_A_VIERNES' && d === 6) esDiaValido = false

          if (esDiaValido) diasHabilesVencidos++
          tempDate.setUTCDate(tempDate.getUTCDate() + 1)
        }
        return Math.max(0, diasHabilesVencidos - diasGracia)
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

    // Ocultar microseguro de la boleta visualmente a pedido del usuario (Ya no es necesario restarlo)
    const microseguroPorCuota = (data.prestamo.microseguroTipo && data.prestamo.microseguroTipo !== 'DEVOLUCION' && data.prestamo.microseguroTotal && data.prestamo.cuotas) 
      ? data.prestamo.microseguroTotal / data.prestamo.cuotas 
      : 0;
    
    const valorCuotaMostrar = totalCuotas > 0 ? (data.prestamo.montoTotal / totalCuotas) : data.prestamo.valorCuota;
    
    const montoAbonoMostrar = data.monto;

    // Cálculos de Microseguro y Devoluciones
    const tieneMicroseguro = Boolean(
      data.prestamo.microseguroTipo && 
      data.prestamo.microseguroTipo !== 'NINGUNO' && 
      (Number(data.prestamo.microseguroTotal || 0) > 0 || Number(data.prestamo.microseguroValor || 0) > 0)
    );
    const seguroTotal = tieneMicroseguro 
      ? Number(data.prestamo.microseguroTotal || data.prestamo.microseguroValor || 0) 
      : 0;
    const devolucionEnEstePago = Number(data.devolucionSeguro || (data as any)?.pago?.devolucionSeguro || 0);
    const seguroDevueltoAcumulado = Math.max(
      Number(data.prestamo.seguroDevuelto ?? ((data.prestamo as any)?.seguroDevuelto || 0)),
      devolucionEnEstePago
    );
    const seguroPendiente = Math.max(0, Math.round((seguroTotal - seguroDevueltoAcumulado) * 100) / 100);

    const getEstadoSeguro = () => {
      if (!tieneMicroseguro) return null;
      if (seguroPendiente <= 0.01 && seguroDevueltoAcumulado > 0) {
        return {
          texto: 'Devuelto por completo',
          color: 'bg-green-100 text-green-800 border-green-300'
        };
      }
      if (seguroDevueltoAcumulado > 0) {
        return {
          texto: 'Devolución parcial',
          color: 'bg-amber-100 text-amber-800 border-amber-300'
        };
      }
      return {
        texto: 'Activo / Sin devolución',
        color: 'bg-purple-100 text-purple-800 border-purple-300'
      };
    };
    const estadoSeguro = getEstadoSeguro();

    const prestamoFlex = data.prestamo as any
    const multa = Number(data.prestamo?.multa ?? prestamoFlex.multa ?? (data as any)?.multa ?? 0)
    const cuotasPagadas = (prestamoFlex.cuotasPagadasManual !== null && prestamoFlex.cuotasPagadasManual !== undefined)
      ? Number(prestamoFlex.cuotasPagadasManual)
      : (valorCuotaMostrar > 0 ? totalPagado / valorCuotaMostrar : 0)

    // Nuevos cálculos adicionales
    // IMPORTANTE: Usamos Math.floor para cuotasPagadas para cálculos de "cuotas completas" en la lógica de atraso
    // pero mantenemos el decimal para el progreso visual.
    const cuotasPagadasEnteras = Math.floor(cuotasPagadas)

    const totalPagadoHistorico = prestamoFlex.pagos?.reduce((sum: number, p: any) => sum + Number(p.monto), 0) || 0
    const montoTotalHistorico = (Number(prestamoFlex.monto || 0) * (1 + Number(prestamoFlex.interes || 0) / 100)) + multa
    const saldoPendienteHistorico = prestamoFlex.saldoPendiente !== undefined ? Number(prestamoFlex.saldoPendiente) : Math.max(0, montoTotalHistorico - totalPagadoHistorico)
    const estaCompletado = prestamoFlex.estado === 'CANCELADO' || prestamoFlex.estado === 'COMPLETADO' || saldoPendienteHistorico <= 0.01 || cuotasPagadas >= totalCuotas

    const cuotasPendientes = estaCompletado ? 0 : ((prestamoFlex.cuotasPendientesManual !== null && prestamoFlex.cuotasPendientesManual !== undefined)
      ? Number(prestamoFlex.cuotasPendientesManual)
      : Math.max(0, totalCuotas - cuotasPagadas))

    // 1. Cálculo del atraso ACTUAL (al día de hoy) para coincidir 100% con el perfil del cliente
    const hoyStr = getLocalYYYYMMDD(new Date())
    const cuotasAtrasadasActuales = estaCompletado ? 0 : ((prestamoFlex.cuotasAtrasadasManual !== null && prestamoFlex.cuotasAtrasadasManual !== undefined)
      ? Number(prestamoFlex.cuotasAtrasadasManual)
      : calcularCuotasAtrasadas(data.prestamo.fechaInicio, data.prestamo.tipoPago, cuotasPagadas, totalCuotas, hoyStr))

    let diasVencidosActuales = 0
    if (!estaCompletado) {
      if (prestamoFlex.diasVencidosManual !== null && prestamoFlex.diasVencidosManual !== undefined) {
        diasVencidosActuales = Number(prestamoFlex.diasVencidosManual)
      } else if (cuotasAtrasadasActuales > 0) {
        diasVencidosActuales = calcularDiasVencidos(data.prestamo.fechaInicio, data.prestamo.tipoPago, cuotasPagadas, hoyStr, (data.prestamo as any).diasGracia || 0)
      }
    }

    const valorEnAtrasoActual = estaCompletado ? 0 : ((prestamoFlex.valorEnAtrasoManual !== null && prestamoFlex.valorEnAtrasoManual !== undefined)
      ? Number(prestamoFlex.valorEnAtrasoManual)
      : cuotasAtrasadasActuales * valorCuotaMostrar)

    // 2. Cálculo del atraso HISTÓRICO (específico a la fecha del abono)
    const cuotasAtrasadasAlAbono = estaCompletado ? 0 : ((prestamoFlex.cuotasAtrasadasManual !== null && prestamoFlex.cuotasAtrasadasManual !== undefined)
      ? Number(prestamoFlex.cuotasAtrasadasManual)
      : calcularCuotasAtrasadas(data.prestamo.fechaInicio, data.prestamo.tipoPago, cuotasPagadas, totalCuotas, data.fecha as string))

    let diasVencidosAlAbono = 0
    if (!estaCompletado) {
      if (prestamoFlex.diasVencidosManual !== null && prestamoFlex.diasVencidosManual !== undefined) {
        diasVencidosAlAbono = Number(prestamoFlex.diasVencidosManual)
      } else if (cuotasAtrasadasAlAbono > 0) {
        diasVencidosAlAbono = calcularDiasVencidos(data.prestamo.fechaInicio, data.prestamo.tipoPago, cuotasPagadas, data.fecha as string, (data.prestamo as any).diasGracia || 0)
      }
    }

    const valorEnAtrasoAlAbono = estaCompletado ? 0 : ((prestamoFlex.valorEnAtrasoManual !== null && prestamoFlex.valorEnAtrasoManual !== undefined)
      ? Number(prestamoFlex.valorEnAtrasoManual)
      : cuotasAtrasadasAlAbono * valorCuotaMostrar)

    // Asignar los valores principales de mora consistentes con la fecha del abono de la boleta
    const cuotasAtrasadas = cuotasAtrasadasAlAbono
    const diasVencidos = diasVencidosAlAbono
    const valorEnAtraso = valorEnAtrasoAlAbono
    
    let fechaProximaTeorica = calcularFechaProximoPago(data.prestamo.fechaInicio, data.prestamo.tipoPago, Math.floor(cuotasPagadas) + 1)
    
    // Verificamos si hubo pago en el mismo día que la fecha de referencia
    let pagoMismoDia = false;
    if (data.fecha) {
      pagoMismoDia = true; // El recibo se generó el día "data.fecha" y ES el pago actual.
    }
    
    const fechaProximoPago = consolidarProximoPago(fechaProximaTeorica, data.fecha as string, data.prestamo.tipoPago, pagoMismoDia);
    
    const diasTranscurridos = calcularDiasTranscurridosPro(data.prestamo.fechaInicio, data.fecha as string, data.prestamo.tipoPago)

    const fechaFinCalculada = data.prestamo.fechaFin || (data.prestamo as any).fechaFinManual || (
      data.prestamo.fechaInicio && data.prestamo.tipoPago && totalCuotas
        ? calcularFechaProximoPago(data.prestamo.fechaInicio, data.prestamo.tipoPago, totalCuotas)
        : null
    )

    return (
      <div 
        ref={ref} 
        className={`bg-white dark:bg-white text-gray-900 dark:text-gray-900 p-6 ${className}`} 
        style={{ width: '800px', margin: '0 auto', backgroundColor: '#ffffff', color: '#111827' }}
      >
        <div className="w-full space-y-4">
          {/* Header con Logo */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-200">
            <div className="flex-shrink-0 bg-white dark:bg-white rounded-xl p-2 border border-gray-200 dark:border-gray-200 shadow-sm flex items-center justify-center" style={{ width: '90px', height: '90px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? (
                <img src={`/api/files/system/${encodeURIComponent(logoUrl)}`} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-black text-gray-900 dark:text-gray-900 tracking-tight flex items-center">
                <Receipt className="h-8 w-8 mr-2.5 text-blue-600 dark:text-blue-600 flex-shrink-0" />
                Comprobante de Pago
              </h2>
              <p className="text-xl text-gray-700 dark:text-gray-700 font-bold mt-1">
                N° {data.numeroBoleta} • {formatDate(data.fecha)}
              </p>
            </div>
            {data.fotoMiniatura && (
              <div className="flex-shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-200 shadow-sm h-36 w-28 flex items-center justify-center bg-gray-50 dark:bg-gray-50 ml-auto mr-4 p-1">
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
            <div 
              className="rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm border-l-4 border-l-amber-500 p-4"
              style={{ backgroundColor: '#ffffff', color: '#111827' }}
            >
              <div className="flex items-start">
                <Receipt className="h-7 w-7 text-amber-600 mr-2.5 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-black text-amber-800 mb-1">Observaciones</h3>
                  <p className="text-lg text-gray-900 font-semibold">{data.observaciones}</p>
                </div>
              </div>
            </div>
          )}

          {/* Fila Superior: Cliente y Montos */}
          <div className="grid grid-cols-2 gap-4">
            {/* Información del Cliente */}
            <div 
              className="rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm p-5 h-full"
              style={{ backgroundColor: '#ffffff', color: '#111827' }}
            >
              <div className="flex items-center mb-3 pb-2 border-b border-gray-100">
                <User className="h-7 w-7 text-blue-600 mr-2 flex-shrink-0" />
                <h3 className="text-2xl font-black text-gray-900">Información del Cliente</h3>
              </div>

              <div className="space-y-3">
                <h4 className="text-3xl font-black text-gray-900 leading-tight">
                  {data.cliente.nombre} {data.cliente.apellido}
                </h4>
                <div className="flex items-center text-lg text-gray-700 font-bold">
                  <CreditCard className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />
                  <span>Documento: <strong className="font-black text-gray-950">{data.cliente.documento}</strong></span>
                </div>
                <div className="flex items-start text-lg text-gray-700 font-bold">
                  <User className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span className="font-bold text-gray-900">{data.cliente.direccionCliente}</span>
                </div>
                {data.cliente.telefono && (
                  <div className="flex items-center text-blue-700 text-xl font-black">
                    <span>{data.cliente.telefono}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Montos principales */}
            <div 
              className="rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm p-5 h-full"
              style={{ backgroundColor: '#ffffff', color: '#111827' }}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center">
                  <DollarSign className="h-7 w-7 text-blue-600 mr-2 flex-shrink-0" />
                  <h3 className="text-2xl font-black text-gray-900">Montos del Préstamo</h3>
                </div>
                <span className={`text-sm font-black px-3.5 py-1 rounded-full ${estaCompletado ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {estaCompletado ? 'Completado' : 'Activo'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-3xl font-black text-blue-600 tracking-tight">
                    {formatCurrency(data.prestamo.monto)}
                  </p>
                  <p className="text-base font-bold text-gray-600 mt-0.5">Monto Prestado</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-green-600 tracking-tight">
                    {formatCurrency(totalPagado)}
                  </p>
                  <p className="text-base font-bold text-gray-600 mt-0.5">Total Pagado</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-black text-red-600 tracking-tight">
                    {formatCurrency(data.prestamo.saldoPendiente)}
                  </p>
                  <p className="text-base font-bold text-gray-600 mt-0.5">Saldo Pendiente</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-purple-600 tracking-tight">
                    {formatCurrency(valorCuotaMostrar)}
                  </p>
                  <p className="text-base font-bold text-gray-600 mt-0.5">Valor Cuota</p>
                </div>
              </div>

              {multa > 0 && (
                <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200">
                  <span className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    <span>⚠️</span> Multa / Penalidad:
                  </span>
                  <span className="text-base font-black text-rose-600">
                    +{formatCurrency(multa)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Información del Préstamo y Pago Detallado */}
          <div 
            className="rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm p-5"
            style={{ backgroundColor: '#ffffff', color: '#111827' }}
          >
            <div className="flex items-center mb-3 pb-2 border-b border-gray-100">
              <Receipt className="h-7 w-7 text-blue-600 mr-2 flex-shrink-0" />
              <h3 className="text-2xl font-black text-gray-900">Detalles del Préstamo y Pago Actual</h3>
            </div>

            {/* Detalles del préstamo en dos columnas */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              
              {/* Columna Izquierda */}
              <div className="space-y-3 text-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Tipo de crédito:</span>
                  <span className="font-black text-gray-950 capitalize">{data.tipoCredito || 'Efectivo'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Tipo de pago:</span>
                  <span className="font-black text-gray-950">{formatTipoPago(data.prestamo.tipoPago)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Monto total a pagar:</span>
                  <div className="text-right">
                    <span className="font-black text-gray-950">{formatCurrency(data.prestamo.montoTotal)}</span>
                    {multa > 0 && (
                      <span className="block text-xs font-bold text-rose-600">
                        (incluye multa)
                      </span>
                    )}
                  </div>
                </div>

                {tieneMicroseguro && (
                  <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-200 space-y-2 mt-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                        <span>🛡️</span> Microseguro ({data.prestamo.microseguroTipo === 'MONTO_FIJO' ? 'Monto Fijo' : data.prestamo.microseguroTipo === 'DEVOLUCION' ? 'Con Devolución' : 'Porcentaje'}):
                      </span>
                      <span className="font-black text-purple-900 text-xl">
                        {formatCurrency(seguroTotal)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm pt-1.5 border-t border-purple-200/80">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-bold">Devuelto:</span>
                        <span className="font-black text-green-700">
                          {seguroDevueltoAcumulado > 0 ? `+${formatCurrency(seguroDevueltoAcumulado)}` : formatCurrency(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-bold">Por devolver:</span>
                        <span className="font-black text-purple-950">
                          {formatCurrency(seguroPendiente)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-purple-200/80 text-sm">
                      <span className="text-gray-700 font-bold">Estado del seguro:</span>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${estadoSeguro?.color || 'bg-gray-100 text-gray-800'}`}>
                        {estadoSeguro?.texto}
                      </span>
                    </div>
                  </div>
                )}

                <div className="my-2.5 border-t border-gray-200" style={{ borderColor: '#e5e7eb' }} />

                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Total cuotas:</span>
                  <span className="font-black text-gray-950">{totalCuotas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Cuotas pagadas:</span>
                  <span className="font-black text-green-700 text-xl">{Number(cuotasPagadas.toFixed(2))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Cuotas pendientes:</span>
                  <span className="font-black text-orange-700 text-xl">{Number(cuotasPendientes.toFixed(2))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Cuotas atrasadas (al abono):</span>
                  <span className={`font-black text-xl ${cuotasAtrasadas > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {Number(cuotasAtrasadas.toFixed(2))}
                  </span>
                </div>

                <div className="my-2.5 border-t border-gray-200" style={{ borderColor: '#e5e7eb' }} />

                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Días vencidos (al abono):</span>
                  <span className={`font-black text-xl ${diasVencidos > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {diasVencidos} días
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Valor en atraso (al abono):</span>
                  <span className={`font-black text-xl ${valorEnAtraso > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatCurrency(valorEnAtraso)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Multa / Penalidad:</span>
                  <span className={`font-black text-xl ${multa > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {multa > 0 ? `+${formatCurrency(multa)}` : formatCurrency(0)}
                  </span>
                </div>

                {data.prestamo.ultimoPago && (
                  <>
                    <div className="my-2.5 border-t border-gray-200" style={{ borderColor: '#e5e7eb' }} />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-bold">Último pago anterior:</span>
                      <span className="font-black text-gray-950">
                        {formatCurrency(data.prestamo.ultimoPago.monto)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-bold">Fecha del último pago:</span>
                      <span className="font-black text-gray-950">{formatDate(data.prestamo.ultimoPago.fecha)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Columna Derecha */}
              <div className="space-y-3 text-lg">
                {/* Destacado: El Abono Actual */}
                <div className="border border-blue-200 p-3.5 rounded-xl mb-3 shadow-sm" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black uppercase text-base tracking-wider" style={{ color: '#1e3a8a' }}>
                      {montoAbonoMostrar === 0 && devolucionEnEstePago > 0 ? "Abono en efectivo" : "Monto de este abono"}
                    </span>
                    <span className="font-black text-3xl" style={{ color: '#1e3a8a' }}>{formatCurrency(montoAbonoMostrar)}</span>
                  </div>
                  {devolucionEnEstePago > 0 ? (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
                      <div className="flex flex-col">
                        <span className="font-black uppercase text-base tracking-wider" style={{ color: '#1e3a8a' }}>
                          Devolución microseguro
                        </span>
                        <span className="text-xs font-bold text-green-700">Abonado a deuda</span>
                      </div>
                      <span className="font-black text-green-700 text-3xl">+{formatCurrency(devolucionEnEstePago)}</span>
                    </div>
                  ) : null}
                  {devolucionEnEstePago > 0 && montoAbonoMostrar > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
                      <span className="font-black uppercase text-sm tracking-wider text-blue-900 font-bold">Total aplicado a deuda</span>
                      <span className="font-black text-blue-900 text-2xl">{formatCurrency(montoAbonoMostrar + devolucionEnEstePago)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold mt-2" style={{ color: '#1e40af' }}>
                    <span>Progreso total:</span>
                    <span className="font-black text-xl">{progresoPrecentaje}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Fecha de inicio:</span>
                  <span className="font-black text-gray-950">{formatDateOnly(data.prestamo.fechaInicio)}</span>
                </div>
                {fechaFinCalculada && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-bold">Fecha fin:</span>
                    <span className="font-black text-gray-950">{formatDateOnly(fechaFinCalculada)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Días transcurridos (al pago):</span>
                  <span className="font-black text-gray-950">{diasTranscurridos} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Fecha próximo pago:</span>
                  <span className="font-black text-xl text-blue-700">
                    {estaCompletado ? "Préstamo Finalizado" : formatDateOnly(fechaProximoPago)}
                  </span>
                </div>

                <div className="my-2.5 border-t border-gray-200" style={{ borderColor: '#e5e7eb' }} />

                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Fecha del abono:</span>
                  <span className="font-black text-xl text-blue-700">
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
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Hora de registro:</span>
                  <span className="font-black text-gray-950">
                    {(data.fecha ? new Date(data.fecha) : new Date()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Método de pago:</span>
                  <span className="font-black text-gray-950 capitalize">{data.tipoPagoMetodo || data.metodoPago || 'Efectivo'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Cobrador:</span>
                  <span className="font-black text-gray-950">{data.usuario.nombre}</span>
                </div>

              </div>
            </div>

            {/* Número de boleta destacado */}
            <div className="mt-6 border border-gray-200 rounded-xl p-3.5 text-center" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
              <p className="text-base text-gray-700 mb-1 uppercase tracking-wider font-black">Comprobante / Número de Boleta</p>
              <p className="text-3xl font-mono font-black text-gray-950 tracking-widest">
                {data.numeroBoleta}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

BoletaPago.displayName = "BoletaPago"

export default BoletaPago


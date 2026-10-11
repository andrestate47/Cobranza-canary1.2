import { diaCalendario, diaReferencia, esVencido, calcularSaldo } from "./prestamo-calc"
import { getDiasMoraSinDomingos } from "./date-utils"

export interface ScoreItem {
  puntos: number
  max: number
  porcentaje: number
}

export interface CreditScoreResult {
  score: number // 0 a 100
  nivel: "Excelente" | "Bueno" | "Regular" | "Riesgo"
  colorTexto: string
  colorBg: string
  colorBorder: string
  colorRing: string
  colorHex: string
  completados: number
  enMora: number
  activos: number
  puntualidad: ScoreItem
  historial: ScoreItem
  consistencia: ScoreItem
  antiguedad: ScoreItem
  montoMaximoSugerido: number
  totalPrestadoHistorico: number
  totalCobradoHistorico: number
  saldoPendienteHistorico: number
}

export interface PrestamoSimple {
  id?: string
  monto: number
  interes?: number
  saldoPendiente: number
  cuotas: number
  cuotasPagadas: number
  fechaInicio: Date | string
  fechaFin: Date | string
  estado: string
  tipoPago?: string
  moraCredito?: number
  pagos?: Array<{
    monto: number
    devolucionSeguro?: number
    fecha?: Date | string
  }>
  cuotasAtrasadasManual?: number | null
  diasVencidosManual?: number | null
}

export interface ClienteSimple {
  id?: string
  createdAt?: Date | string
  nombre?: string
  apellido?: string
  prestamos?: PrestamoSimple[]
}

/**
 * Motor de cálculo del Score Crediticio (0 a 100 puntos)
 * 
 * Pilares:
 * 1. Puntualidad (40 pts máx): Disciplina y ausencia de atrasos/mora.
 * 2. Historial de Pago (30 pts máx): Préstamos culminados exitosamente y % amortizado.
 * 3. Consistencia (20 pts máx): Regularidad del flujo de pagos según su frecuencia.
 * 4. Antigüedad (10 pts máx): Tiempo de relación comercial del cliente.
 */
export function calcularCreditScore(
  cliente: ClienteSimple,
  prestamosInput?: PrestamoSimple[]
): CreditScoreResult {
  const prestamos = prestamosInput || cliente.prestamos || []
  const hoyRef = diaReferencia()
  const now = new Date()

  // 1. Clasificación de préstamos
  let completados = 0
  let enMora = 0
  let activos = 0
  let totalPrestado = 0
  let totalCobrado = 0
  let saldoPendienteTotal = 0
  let maxMontoPrestado = 0

  prestamos.forEach((p) => {
    const monto = Number(p.monto) || 0
    totalPrestado += monto
    if (monto > maxMontoPrestado) maxMontoPrestado = monto

    const saldo = Number(p.saldoPendiente) || 0
    saldoPendienteTotal += saldo

    // Calcular total cobrado de los pagos si existen
    if (p.pagos && p.pagos.length > 0) {
      p.pagos.forEach((pago) => {
        totalCobrado += (Number(pago.monto) || 0) + (Number(pago.devolucionSeguro) || 0)
      })
    } else {
      // Estimación si no viene el desglose de pagos
      const valorCuota = p.cuotas > 0 ? (monto * (1 + (p.interes || 20) / 100)) / p.cuotas : 0
      totalCobrado += (p.cuotasPagadas || 0) * valorCuota
    }

    const estaCancelado =
      p.estado === "CANCELADO" || p.estado === "RENOVADO" || saldo <= 0.01 || p.cuotasPagadas >= p.cuotas

    if (estaCancelado) {
      completados++
    } else {
      activos++
      // Verificar si está vencido por fecha o en estado VENCIDO
      const vencido = p.estado === "VENCIDO" || (Boolean(p.fechaFin) && diaCalendario(p.fechaFin) < hoyRef)
      // Verificar cuotas atrasadas manuales o mora
      const cuotasAtrasadas = Number(p.cuotasAtrasadasManual) || 0
      const diasVencidos = Number(p.diasVencidosManual) || 0

      if (vencido || cuotasAtrasadas > 0 || diasVencidos > 0) {
        enMora++
      }
    }
  })

  // ----------------------------------------------------------------------
  // PILAR 1: PUNTUALIDAD (Máximo: 40 puntos)
  // ----------------------------------------------------------------------
  let puntosPuntualidad = 40

  if (prestamos.length === 0) {
    puntosPuntualidad = 30 // Cliente nuevo sin créditos previos
  } else if (enMora > 0) {
    // Penalizaciones severas por mora activa
    let peorAtrasoDias = 0
    let maxCuotasAtrasadas = 0

    prestamos.forEach((p) => {
      const saldo = Number(p.saldoPendiente) || 0
      if (saldo > 0.01) {
        const dias = Math.max(
          Number(p.diasVencidosManual) || 0,
          p.fechaFin && diaCalendario(p.fechaFin) < hoyRef
            ? getDiasMoraSinDomingos(p.fechaFin, now, p.tipoPago || "DIARIO")
            : 0
        )
        if (dias > peorAtrasoDias) peorAtrasoDias = dias
        const cAtrasadas = Number(p.cuotasAtrasadasManual) || 0
        if (cAtrasadas > maxCuotasAtrasadas) maxCuotasAtrasadas = cAtrasadas
      }
    })

    if (peorAtrasoDias > 30 || maxCuotasAtrasadas >= 5) {
      puntosPuntualidad = 0
    } else if (peorAtrasoDias > 15 || maxCuotasAtrasadas >= 3) {
      puntosPuntualidad = 8
    } else if (peorAtrasoDias > 5 || maxCuotasAtrasadas >= 2) {
      puntosPuntualidad = 16
    } else {
      puntosPuntualidad = 25
    }
  } else {
    // Al día en todos sus créditos
    puntosPuntualidad = 40
  }

  // ----------------------------------------------------------------------
  // PILAR 2: HISTORIAL DE PAGO (Máximo: 30 puntos)
  // ----------------------------------------------------------------------
  let puntosHistorial = 0

  if (completados >= 3) {
    puntosHistorial = 30
  } else if (completados === 2) {
    puntosHistorial = 25
  } else if (completados === 1) {
    puntosHistorial = 20
  } else {
    // 0 completados (Crédito actual en curso o primer crédito)
    // Calculamos el avance del crédito activo
    const prestamoActivo = prestamos.find(
      (p) => p.estado !== "CANCELADO" && (Number(p.saldoPendiente) || 0) > 0.01
    )
    if (prestamoActivo && prestamoActivo.cuotas > 0) {
      const ratioPago = Math.min(1, Math.max(0, prestamoActivo.cuotasPagadas / prestamoActivo.cuotas))
      // Entre 10 y 18 puntos si va avanzando normalmente
      puntosHistorial = Math.round(10 + ratioPago * 8)
    } else {
      puntosHistorial = 15 // Base neutra para crédito reciente en proceso (15/30)
    }
  }

  // ----------------------------------------------------------------------
  // PILAR 3: CONSISTENCIA (Máximo: 20 puntos)
  // ----------------------------------------------------------------------
  let puntosConsistencia = 20

  if (enMora > 0) {
    puntosConsistencia = Math.max(0, 20 - enMora * 10)
  } else if (prestamos.length === 0) {
    puntosConsistencia = 15
  } else {
    puntosConsistencia = 20
  }

  // ----------------------------------------------------------------------
  // PILAR 4: ANTIGÜEDAD (Máximo: 10 puntos)
  // ----------------------------------------------------------------------
  let puntosAntiguedad = 0
  let fechaInicioCliente: Date | null = null

  if (cliente.createdAt) {
    fechaInicioCliente = new Date(cliente.createdAt)
  } else if (prestamos.length > 0) {
    // Fecha del préstamo más antiguo
    const fechas = prestamos.map((p) => new Date(p.fechaInicio).getTime()).filter((t) => !isNaN(t))
    if (fechas.length > 0) {
      fechaInicioCliente = new Date(Math.min(...fechas))
    }
  }

  if (fechaInicioCliente && !isNaN(fechaInicioCliente.getTime())) {
    const diffDias = Math.floor((now.getTime() - fechaInicioCliente.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDias >= 180) {
      // >= 6 meses
      puntosAntiguedad = 10
    } else if (diffDias >= 90) {
      // >= 3 meses
      puntosAntiguedad = 8
    } else if (diffDias >= 60) {
      // >= 2 meses
      puntosAntiguedad = 6
    } else if (diffDias >= 30) {
      // >= 1 mes
      puntosAntiguedad = 4
    } else if (diffDias >= 15) {
      puntosAntiguedad = 2
    } else {
      puntosAntiguedad = 0 // Reciente (< 15 días)
    }
  }

  // ----------------------------------------------------------------------
  // SCORE FINAL Y CLASIFICACIÓN
  // ----------------------------------------------------------------------
  const totalScore = Math.min(
    100,
    Math.max(0, puntosPuntualidad + puntosHistorial + puntosConsistencia + puntosAntiguedad)
  )

  let nivel: "Excelente" | "Bueno" | "Regular" | "Riesgo" = "Bueno"
  let colorTexto = "text-blue-600 dark:text-blue-400"
  let colorBg = "bg-blue-50 dark:bg-blue-950/40"
  let colorBorder = "border-blue-200 dark:border-blue-800"
  let colorRing = "border-blue-500"
  let colorHex = "#2563EB"

  if (totalScore >= 80) {
    nivel = "Excelente"
    colorTexto = "text-emerald-600 dark:text-emerald-400"
    colorBg = "bg-emerald-50 dark:bg-emerald-950/40"
    colorBorder = "border-emerald-200 dark:border-emerald-800"
    colorRing = "border-emerald-500"
    colorHex = "#10B981"
  } else if (totalScore >= 65) {
    nivel = "Bueno"
    colorTexto = "text-blue-600 dark:text-blue-400"
    colorBg = "bg-blue-50 dark:bg-blue-950/40"
    colorBorder = "border-blue-200 dark:border-blue-800"
    colorRing = "border-blue-500"
    colorHex = "#2563EB"
  } else if (totalScore >= 50) {
    nivel = "Regular"
    colorTexto = "text-amber-600 dark:text-amber-400"
    colorBg = "bg-amber-50 dark:bg-amber-950/40"
    colorBorder = "border-amber-200 dark:border-amber-800"
    colorRing = "border-amber-500"
    colorHex = "#F59E0B"
  } else {
    nivel = "Riesgo"
    colorTexto = "text-red-600 dark:text-red-400"
    colorBg = "bg-red-50 dark:bg-red-950/40"
    colorBorder = "border-red-200 dark:border-red-800"
    colorRing = "border-red-500"
    colorHex = "#EF4444"
  }

  // ----------------------------------------------------------------------
  // CÁLCULO DEL MONTO MÁXIMO SUGERIDO
  // ----------------------------------------------------------------------
  const baseMonto = maxMontoPrestado > 0 ? maxMontoPrestado : 500000
  let factorMultiplicador = 1.0

  if (totalScore >= 80) {
    factorMultiplicador = 1.4 // Excelente: hasta 40% más
  } else if (totalScore >= 65) {
    factorMultiplicador = 1.2 // Bueno: 20% más (ej. 500.000 * 1.2 = 600.000)
  } else if (totalScore >= 50) {
    factorMultiplicador = 1.0 // Regular: mantener cupo actual
  } else {
    factorMultiplicador = 0.5 // Riesgo: reducir cupo al 50%
  }

  let montoMaximoSugerido = Math.round((baseMonto * factorMultiplicador) / 10000) * 10000
  if (montoMaximoSugerido <= 0) montoMaximoSugerido = 100000

  return {
    score: totalScore,
    nivel,
    colorTexto,
    colorBg,
    colorBorder,
    colorRing,
    colorHex,
    completados,
    enMora,
    activos,
    puntualidad: {
      puntos: puntosPuntualidad,
      max: 40,
      porcentaje: (puntosPuntualidad / 40) * 100
    },
    historial: {
      puntos: puntosHistorial,
      max: 30,
      porcentaje: (puntosHistorial / 30) * 100
    },
    consistencia: {
      puntos: puntosConsistencia,
      max: 20,
      porcentaje: (puntosConsistencia / 20) * 100
    },
    antiguedad: {
      puntos: puntosAntiguedad,
      max: 10,
      porcentaje: (puntosAntiguedad / 10) * 100
    },
    montoMaximoSugerido,
    totalPrestadoHistorico: totalPrestado,
    totalCobradoHistorico: totalCobrado,
    saldoPendienteHistorico: saldoPendienteTotal
  }
}

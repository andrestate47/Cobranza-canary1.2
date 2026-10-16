import { diaCalendario, diaReferencia } from "./prestamo-calc"
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
  valorCuota?: number
  saldoPendiente: number
  cuotas: number
  cuotasPagadas: number
  fechaInicio: Date | string
  fechaFin: Date | string
  estado: string
  tipoPago?: string
  moraCredito?: number
  diasGracia?: number | null
  renovadoDeId?: string | null
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

// ----------------------------------------------------------------------
// Utilidades de calendario (misma regla que el detalle del préstamo:
// DIARIO / LUNES_A_SABADO sin domingos, LUNES_A_VIERNES sin fines de semana,
// el resto cada N días calendario).
// ----------------------------------------------------------------------
const ONE_DAY = 1000 * 60 * 60 * 24
const TIPOS_DIARIOS = ["DIARIO", "LUNES_A_SABADO", "LUNES_A_VIERNES"]
const DIAS_POR_TIPO: Record<string, number> = {
  SEMANAL: 7, QUINCENAL: 15, CATORCENAL: 14, FIN_DE_MES: 30, MENSUAL: 30,
  TRIMESTRAL: 90, CUATRIMESTRAL: 120, SEMESTRAL: 180, ANUAL: 365
}

const aMedianocheUTC = (dia: string) => new Date(`${dia}T00:00:00Z`)

function esDiaCobro(fecha: Date, tipoPago: string): boolean {
  const d = fecha.getUTCDay()
  if (d === 0) return false
  if (tipoPago === "LUNES_A_VIERNES" && d === 6) return false
  return true
}

/** Cuotas que ya deberían estar pagadas a la fecha `hoy` (sin pasar del total). */
function cuotasEsperadas(inicio: Date, hoy: Date, tipoPago: string, totalCuotas: number): number {
  let esperadas = 0
  if (TIPOS_DIARIOS.includes(tipoPago)) {
    const cur = new Date(inicio)
    cur.setUTCDate(cur.getUTCDate() + 1)
    while (cur <= hoy && esperadas < totalCuotas) {
      if (esDiaCobro(cur, tipoPago)) esperadas++
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  } else {
    const dias = Math.max(0, Math.floor((hoy.getTime() - inicio.getTime()) / ONE_DAY))
    esperadas = Math.floor(dias / (DIAS_POR_TIPO[tipoPago] || 1))
  }
  return Math.min(esperadas, totalCuotas)
}

/** Fecha en que vence la cuota número `k` (1-based). */
function fechaCuota(inicio: Date, k: number, tipoPago: string): Date {
  if (TIPOS_DIARIOS.includes(tipoPago)) {
    const cur = new Date(inicio)
    let count = 0
    while (count < k) {
      cur.setUTCDate(cur.getUTCDate() + 1)
      if (esDiaCobro(cur, tipoPago)) count++
    }
    return cur
  }
  return new Date(inicio.getTime() + k * (DIAS_POR_TIPO[tipoPago] || 1) * ONE_DAY)
}

/** Días de cobro (sin domingos) desde `desde` hasta `hasta`, inclusive. */
function diasCobroEntre(desde: Date, hasta: Date, tipoPago: string): number {
  let n = 0
  const cur = new Date(desde)
  while (cur <= hasta) {
    if (esDiaCobro(cur, tipoPago)) n++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return n
}

interface AnalisisPrestamo {
  p: PrestamoSimple
  monto: number
  inicioTs: number
  cerrado: boolean // pagado, cancelado o renovado
  renovado: boolean
  saldo: number
  cuotasPagadas: number
  cuotasEsperadas: number
  cuotasAtrasadas: number
  diasMora: number
  enMora: boolean
  diasTardeAlCerrar: number // solo préstamos pagados: días de cobro después de su fecha fin
  diasDesdeUltimoPago: number | null
}

/**
 * Motor de cálculo del Score Crediticio (0 a 100 puntos)
 *
 * Pilares:
 * 1. Puntualidad (40 pts máx): atraso actual (cuotas atrasadas / días de mora reales)
 *    y penalización por préstamos anteriores que terminó de pagar tarde.
 * 2. Historial de Pago (30 pts máx): Préstamos culminados exitosamente y % amortizado.
 * 3. Consistencia (20 pts máx): Ritmo de pago de los créditos vigentes (cuotas pagadas vs.
 *    esperadas) y tiempo desde el último pago según su frecuencia.
 * 4. Antigüedad (10 pts máx): Tiempo de relación comercial del cliente.
 */
export function calcularCreditScore(
  cliente: ClienteSimple,
  prestamosInput?: PrestamoSimple[]
): CreditScoreResult {
  const prestamos = prestamosInput || cliente.prestamos || []
  const hoyRef = diaReferencia()
  const hoy = aMedianocheUTC(hoyRef)
  const now = new Date()

  // IDs que otro préstamo tiene como origen de renovación
  const idsRenovados = new Set(
    prestamos.map((p) => p.renovadoDeId).filter((x): x is string => Boolean(x))
  )

  // ----------------------------------------------------------------------
  // 1. Análisis individual de cada préstamo
  // ----------------------------------------------------------------------
  let totalPrestado = 0
  let totalCobrado = 0
  let saldoPendienteTotal = 0
  let maxMontoPrestado = 0
  let maxMontoCompletado = 0 // Mayor monto que el cliente pagó por completo (capacidad demostrada)
  let montoUltimoPrestamo = 0
  let fechaUltimoPrestamo = -Infinity

  const analisis: AnalisisPrestamo[] = prestamos.map((p) => {
    const monto = Number(p.monto) || 0
    const tipoPago = p.tipoPago || "DIARIO"
    const montoTotal = monto * (1 + (Number(p.interes) || 0) / 100)
    const valorCuota = Number(p.valorCuota) > 0 ? Number(p.valorCuota) : p.cuotas > 0 ? montoTotal / p.cuotas : 0

    totalPrestado += monto
    if (monto > maxMontoPrestado) maxMontoPrestado = monto
    const inicioTs = new Date(p.fechaInicio).getTime()
    if (!isNaN(inicioTs) && inicioTs > fechaUltimoPrestamo) {
      fechaUltimoPrestamo = inicioTs
      montoUltimoPrestamo = monto
    }

    // Total cobrado
    let pagado = 0
    let ultimoPagoTs = -Infinity
    if (p.pagos && p.pagos.length > 0) {
      for (const pago of p.pagos) {
        pagado += (Number(pago.monto) || 0) + (Number(pago.devolucionSeguro) || 0)
        const t = pago.fecha ? new Date(pago.fecha).getTime() : NaN
        if (!isNaN(t) && t > ultimoPagoTs) ultimoPagoTs = t
      }
    } else {
      pagado = (Number(p.cuotasPagadas) || 0) * valorCuota
    }
    totalCobrado += pagado

    // Un préstamo renovado no es deuda pendiente: su saldo pasó al préstamo nuevo
    const renovado = p.estado === "RENOVADO" || (Boolean(p.id) && idsRenovados.has(p.id as string))
    const saldoBruto =
      p.saldoPendiente !== undefined && p.saldoPendiente !== null
        ? Number(p.saldoPendiente) || 0
        : Math.max(0, montoTotal - pagado)
    const saldo = renovado ? 0 : saldoBruto
    saldoPendienteTotal += saldo

    const cuotasPagadas =
      p.cuotasPagadas !== undefined && p.cuotasPagadas !== null
        ? Number(p.cuotasPagadas) || 0
        : valorCuota > 0 ? pagado / valorCuota : 0

    const cerrado = renovado || p.estado === "CANCELADO" || saldo <= 0.01 || cuotasPagadas >= p.cuotas

    const inicio = aMedianocheUTC(diaCalendario(p.fechaInicio))
    const fin = aMedianocheUTC(diaCalendario(p.fechaFin))

    let esperadas = 0
    let atrasadas = 0
    let diasMora = 0
    let diasTardeAlCerrar = 0
    let diasDesdeUltimoPago: number | null = null

    if (!cerrado) {
      // La cuota de hoy todavía no está vencida (el cobrador puede pasar más tarde)
      const ayer = new Date(hoy.getTime() - ONE_DAY)
      esperadas = cuotasEsperadas(inicio, ayer, tipoPago, p.cuotas)
      atrasadas =
        p.cuotasAtrasadasManual !== null && p.cuotasAtrasadasManual !== undefined
          ? Number(p.cuotasAtrasadasManual) || 0
          : Math.max(0, esperadas - cuotasPagadas)

      if (p.diasVencidosManual !== null && p.diasVencidosManual !== undefined) {
        diasMora = Number(p.diasVencidosManual) || 0
      } else if (fin < hoy) {
        diasMora = getDiasMoraSinDomingos(p.fechaFin, now, tipoPago)
      } else if (atrasadas >= 1) {
        // Desde el vencimiento de la primera cuota no pagada
        const venc = fechaCuota(inicio, Math.floor(cuotasPagadas) + 1, tipoPago)
        diasMora = Math.max(0, diasCobroEntre(venc, hoy, tipoPago) - (Number(p.diasGracia) || 0))
      }

      if (ultimoPagoTs > -Infinity) {
        const ult = aMedianocheUTC(diaCalendario(new Date(ultimoPagoTs)))
        diasDesdeUltimoPago = Math.max(0, Math.round((hoy.getTime() - ult.getTime()) / ONE_DAY))
      } else if (inicio <= hoy) {
        diasDesdeUltimoPago = Math.max(0, Math.round((hoy.getTime() - inicio.getTime()) / ONE_DAY))
      }
    } else if (!renovado && ultimoPagoTs > -Infinity) {
      // ¿Terminó de pagar después de su fecha fin?
      const ult = aMedianocheUTC(diaCalendario(new Date(ultimoPagoTs)))
      if (ult > fin) {
        const desde = new Date(fin)
        desde.setUTCDate(desde.getUTCDate() + 1)
        diasTardeAlCerrar = Math.max(0, diasCobroEntre(desde, ult, tipoPago) - (Number(p.diasGracia) || 0))
      }
    }

    if (cerrado && monto > maxMontoCompletado) maxMontoCompletado = monto

    return {
      p, monto, inicioTs, cerrado, renovado, saldo,
      cuotasPagadas, cuotasEsperadas: esperadas, cuotasAtrasadas: atrasadas, diasMora,
      // Fracciones menores a una cuota no se consideran mora
      enMora: !cerrado && (atrasadas >= 1 || diasMora > 0),
      diasTardeAlCerrar, diasDesdeUltimoPago
    }
  })

  const vigentes = analisis.filter((a) => !a.cerrado)
  const cerrados = analisis.filter((a) => a.cerrado)
  const completados = cerrados.length
  const activos = vigentes.length
  const enMora = vigentes.filter((a) => a.enMora).length

  // ----------------------------------------------------------------------
  // PILAR 1: PUNTUALIDAD (Máximo: 40 puntos)
  // ----------------------------------------------------------------------
  let puntosPuntualidad = 40

  if (prestamos.length === 0) {
    puntosPuntualidad = 30 // Cliente nuevo sin créditos previos
  } else {
    // a) Atraso actual (peor préstamo vigente)
    const peorDias = Math.max(0, ...vigentes.map((a) => a.diasMora))
    const peorCuotas = Math.max(0, ...vigentes.map((a) => a.cuotasAtrasadas))

    if (peorDias > 30 || peorCuotas >= 5) puntosPuntualidad = 0
    else if (peorDias > 15 || peorCuotas >= 3) puntosPuntualidad = 8
    else if (peorDias > 5 || peorCuotas >= 2) puntosPuntualidad = 16
    else if (enMora > 0) puntosPuntualidad = 25
    else puntosPuntualidad = 40

    // b) Préstamos anteriores pagados tarde (máximo -15)
    let penalHistorica = 0
    for (const a of cerrados) {
      if (a.diasTardeAlCerrar > 15) penalHistorica += 8
      else if (a.diasTardeAlCerrar > 3) penalHistorica += 4
    }
    puntosPuntualidad = Math.max(0, puntosPuntualidad - Math.min(15, penalHistorica))
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
    // Sin préstamos completados: avance del crédito vigente más reciente
    const actual = [...vigentes].sort((a, b) => b.inicioTs - a.inicioTs)[0]
    if (actual && actual.p.cuotas > 0) {
      const ratioPago = Math.min(1, Math.max(0, actual.cuotasPagadas / actual.p.cuotas))
      // Entre 10 y 18 puntos según avance
      puntosHistorial = Math.round(10 + ratioPago * 8)
    } else {
      puntosHistorial = 15 // Base neutra
    }
  }

  // ----------------------------------------------------------------------
  // PILAR 3: CONSISTENCIA (Máximo: 20 puntos)
  // Ritmo de pago de los créditos vigentes y regularidad del último pago.
  // ----------------------------------------------------------------------
  let puntosConsistencia = 20

  if (prestamos.length === 0) {
    puntosConsistencia = 15
  } else if (vigentes.length === 0) {
    puntosConsistencia = 20 // Todo pagado
  } else {
    const conEsperadas = vigentes.filter((a) => a.cuotasEsperadas > 0)
    // Ritmo: cuotas pagadas / cuotas esperadas (promedio de los vigentes)
    const ritmo =
      conEsperadas.length > 0
        ? conEsperadas.reduce((s, a) => s + Math.min(1, a.cuotasPagadas / a.cuotasEsperadas), 0) /
          conEsperadas.length
        : 1 // Préstamos recién otorgados, aún sin cuotas vencidas
    puntosConsistencia = 20 * ritmo

    // Regularidad: días sin pagar vs. frecuencia esperada
    let penalRegularidad = 0
    for (const a of conEsperadas) {
      if (a.diasDesdeUltimoPago === null) continue
      const tipo = a.p.tipoPago || "DIARIO"
      const intervalo = TIPOS_DIARIOS.includes(tipo) ? 1 : DIAS_POR_TIPO[tipo] || 1
      const holgura = TIPOS_DIARIOS.includes(tipo) ? 2 : 0 // fines de semana / domingos
      if (a.diasDesdeUltimoPago > intervalo * 3 + holgura) penalRegularidad = Math.max(penalRegularidad, 8)
      else if (a.diasDesdeUltimoPago > intervalo * 2 + holgura) penalRegularidad = Math.max(penalRegularidad, 4)
    }
    puntosConsistencia = Math.max(0, Math.round(puntosConsistencia - penalRegularidad))
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
  // Base = capacidad de pago DEMOSTRADA por el cliente:
  //  - Si ya pagó préstamos completos: el mayor monto que terminó de pagar.
  //  - Si aún no completa ninguno: el monto de su préstamo más reciente.
  const baseMonto = maxMontoCompletado > 0 ? maxMontoCompletado : montoUltimoPrestamo || maxMontoPrestado

  // Factor continuo según el score (0 → x0.40 · 50 → x0.95 · 65 → x1.12 · 80 → x1.28 · 100 → x1.50)
  let factorMultiplicador = 0.4 + (totalScore / 100) * 1.1

  // Sin préstamos completados todavía: no se sugiere aumentar el cupo
  if (completados === 0) factorMultiplicador = Math.min(factorMultiplicador, 1.0)
  // Con mora activa: se reduce el cupo como mínimo un 20%
  if (enMora > 0) factorMultiplicador = Math.min(factorMultiplicador, 0.8)

  const montoMaximoSugerido = redondearMonto(baseMonto * factorMultiplicador)

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

/**
 * Redondea un monto a un paso proporcional a su magnitud para que
 * funcione tanto con montos pequeños (ej. 350) como grandes (ej. 1.500.000).
 */
function redondearMonto(valor: number): number {
  if (!isFinite(valor) || valor <= 0) return 0
  const paso = valor < 1000 ? 50 : valor < 10000 ? 100 : valor < 100000 ? 1000 : 10000
  return Math.max(paso, Math.round(valor / paso) * paso)
}

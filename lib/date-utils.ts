import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const ECUADOR_TZ = 'America/Guayaquil';

/**
 * Obtiene el rango de tiempo (inicio y fin) para un día específico en la zona horaria de Ecuador.
 * @param fechaStr Opcional. Cadena en formato 'YYYY-MM-DD'. Si no se provee, usa el momento actual.
 * @returns Un objeto con el inicio (00:00:00) y fin (23:59:59) del día en UTC.
 */
export function getEcuadorDayRange(fechaStr?: string | null) {
  let baseDate;
  
  if (fechaStr) {
    // Si viene YYYY-MM-DD, creamos un objeto dayjs en la zona de Ecuador
    baseDate = dayjs.tz(fechaStr, ECUADOR_TZ);
  } else {
    // Si no viene, tomamos el "ahora" real en Ecuador
    baseDate = dayjs().tz(ECUADOR_TZ);
  }

  const inicio = baseDate.startOf('day').toDate();
  const fin = baseDate.endOf('day').toDate();
  
  return {
    inicio,
    fin,
    fechaFormateada: baseDate.format('YYYY-MM-DD')
  };
}

/**
 * Normaliza una fecha para que sea guardada como la "Medianoche UTC" del día lógico.
 * Útil para cierres de día donde queremos una comparación única por fecha.
 */
export function normalizeToEcuadorMidnight(fechaStr?: string | null) {
  const { inicio } = getEcuadorDayRange(fechaStr);
  return inicio;
}

/**
 * Obtiene un rango de fechas (Inicio - Fin) en la zona de Ecuador.
 */
export function getEcuadorRange(inicioStr: string, finStr: string) {
  const inicio = dayjs.tz(inicioStr, ECUADOR_TZ).startOf('day').toDate();
  const fin = dayjs.tz(finStr, ECUADOR_TZ).endOf('day').toDate();
  
  return { inicio, fin };
}

/**
 * Determina si una fecha es un día de pago válido para el tipo de pago dado.
 */
export function esDiaDePago(tipoPago: string, fechaInicio: Date | string, fechaEvaluar: Date | string): boolean {
  const inicio = new Date(fechaInicio)
  const evaluar = new Date(fechaEvaluar)
  
  // Normalizar a fechas sin hora (12:00:00 UTC) para evitar desfases de zona horaria
  const inicioUTC = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate(), 12, 0, 0)
  const evaluarUTC = Date.UTC(evaluar.getUTCFullYear(), evaluar.getUTCMonth(), evaluar.getUTCDate(), 12, 0, 0)
  
  // El día de inicio NO es día de pago (los pagos empiezan el día hábil/periodo siguiente)
  if (evaluarUTC <= inicioUTC) return false
  
  const diffTime = evaluarUTC - inicioUTC
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  const diaSemana = evaluar.getUTCDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  
  if (tipoPago === 'DIARIO') {
    return diaSemana !== 0 // Domingo no se cobra
  }
  if (tipoPago === 'LUNES_A_SABADO') {
    return diaSemana !== 0 // Domingo no se cobra
  }
  if (tipoPago === 'LUNES_A_VIERNES') {
    return diaSemana !== 0 && diaSemana !== 6 // Sábado y Domingo no se cobra
  }
  if (tipoPago === 'SEMANAL') {
    return diffDays % 7 === 0
  }
  if (tipoPago === 'CATORCENAL') {
    return diffDays % 14 === 0
  }
  if (tipoPago === 'QUINCENAL') {
    return diffDays % 15 === 0
  }
  if (tipoPago === 'MENSUAL' || tipoPago === 'FIN_DE_MES') {
    return inicio.getUTCDate() === evaluar.getUTCDate()
  }
  
  return false
}

/**
 * Calcula la diferencia en días hábiles (excluyendo domingos) entre dos fechas.
 * Si tipoPago es 'LUNES_A_VIERNES', también excluye sábados.
 */
export function getDiasMoraSinDomingos(desde: Date | string, hasta: Date | string, tipoPago: string = 'DIARIO'): number {
  const dInicio = new Date(desde)
  const dFin = new Date(hasta)
  
  let currentUTC = Date.UTC(dInicio.getUTCFullYear(), dInicio.getUTCMonth(), dInicio.getUTCDate(), 12, 0, 0)
  const finUTC = Date.UTC(dFin.getUTCFullYear(), dFin.getUTCMonth(), dFin.getUTCDate(), 12, 0, 0)
  
  if (currentUTC >= finUTC) return 0
  
  let workingDays = 0
  while (currentUTC < finUTC) {
    currentUTC += 1000 * 60 * 60 * 24
    const d = new Date(currentUTC)
    const day = d.getUTCDay()
    
    let isWorkingDay = true
    if (tipoPago === 'LUNES_A_VIERNES') {
      isWorkingDay = (day !== 0 && day !== 6)
    } else {
      isWorkingDay = (day !== 0) // Excluye domingos
    }
    
    if (isWorkingDay) {
      workingDays++
    }
  }
  return workingDays
}


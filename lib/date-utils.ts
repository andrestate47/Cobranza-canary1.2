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

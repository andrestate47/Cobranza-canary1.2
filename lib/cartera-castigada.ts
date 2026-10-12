import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const ECUADOR_TZ = "America/Guayaquil"
export const DIAS_UMBRAL_CASTIGO = 30 // 1 mes sin abonos para pasar a cartera castigada

export interface PrestamoCastigoInput {
  id?: string
  monto: number | string | { toString(): string }
  interes?: number | string | { toString(): string }
  saldoPendiente?: number
  estado?: string | null
  fechaInicio: Date | string
  fechaFin?: Date | string
  datosRefinanciamiento?: any
  pagos?: Array<{
    monto: number | string | { toString(): string }
    fecha?: Date | string
  }>
}

/**
 * Calcula los días transcurridos desde el último abono (o desde fechaInicio si nunca abonó).
 */
export function calcularDiasSinAbono(
  prestamo: PrestamoCastigoInput,
  fechaUltimoPago?: Date | string | null,
  fechaRef?: Date | string
): { diasSinAbono: number; fechaReferencia: Date; tieneAbonosPrevios: boolean } {
  const now = fechaRef ? new Date(fechaRef) : new Date()

  let fechaBase: Date | null = null
  let tieneAbonosPrevios = false

  if (fechaUltimoPago) {
    fechaBase = new Date(fechaUltimoPago)
    tieneAbonosPrevios = true
  } else if (prestamo.pagos && prestamo.pagos.length > 0) {
    const fechas = prestamo.pagos
      .map((p) => (p.fecha ? new Date(p.fecha).getTime() : 0))
      .filter((t) => t > 0)
    if (fechas.length > 0) {
      fechaBase = new Date(Math.max(...fechas))
      tieneAbonosPrevios = true
    }
  }

  // Si nunca ha hecho abonos, la fecha de referencia es la fecha de inicio del crédito
  if (!fechaBase || isNaN(fechaBase.getTime())) {
    fechaBase = new Date(prestamo.fechaInicio)
    tieneAbonosPrevios = false
  }

  const diffMs = now.getTime() - fechaBase.getTime()
  const diasSinAbono = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  return {
    diasSinAbono,
    fechaReferencia: fechaBase,
    tieneAbonosPrevios
  }
}

/**
 * Determina si un préstamo clasifica como CARTERA CASTIGADA.
 * 
 * Reglas de negocio:
 * 1. Debe tener saldo pendiente (> 0.01) y no estar CANCELADO ni RENOVADO.
 * 2. Si el administrador lo marcó como "excluidoCastigo", no se castiga.
 * 3. Si el administrador lo marcó como "castigadoManual", se castiga inmediatamente.
 * 4. Automático: Si cumple 30 días o más (1 mes) sin recibir NINGÚN abono.
 */
export function esPrestamoCastigado(
  prestamo: PrestamoCastigoInput,
  fechaUltimoPago?: Date | string | null,
  idsRenovados?: Set<string>,
  fechaRef?: Date | string
): boolean {
  // Préstamos cancelados o renovados ya no deben
  if (prestamo.estado === "CANCELADO" || prestamo.estado === "RENOVADO") return false
  if (prestamo.id && idsRenovados?.has(prestamo.id)) return false

  const saldo = Number(prestamo.saldoPendiente) || 0
  if (saldo <= 0.01) return false

  // Verificar flags en datosRefinanciamiento o metadatos
  const meta = prestamo.datosRefinanciamiento || {}
  if (meta.excluidoCastigo === true) {
    return false
  }
  if (meta.castigadoManual === true) {
    return true
  }

  const { diasSinAbono } = calcularDiasSinAbono(prestamo, fechaUltimoPago, fechaRef)
  return diasSinAbono >= DIAS_UMBRAL_CASTIGO
}

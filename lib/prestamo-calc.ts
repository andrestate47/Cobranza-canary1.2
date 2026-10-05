/**
 * FUENTE ÚNICA DE VERDAD para los cálculos de préstamos.
 *
 * Todas las pantallas/APIs deben usar estas funciones para decidir si un préstamo
 * está vigente, vencido, en mora o cancelado. NO duplicar esta lógica en otros archivos.
 *
 * Reglas:
 *  - Saldo = monto * (1 + interés%) - (pagos + devolución de seguro). Redondeado a centavos.
 *  - Un préstamo está "vigente" si no está CANCELADO/RENOVADO, no fue renovado por otro
 *    préstamo y tiene saldo > 0.01.
 *  - Un préstamo está VENCIDO si está vigente y su fecha fin es ANTERIOR al día de hoy
 *    (calendario de Ecuador). Si vence hoy, todavía está al día.
 *  - Los días de mora no cuentan domingos (ni sábados en LUNES_A_VIERNES).
 */
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { getDiasMoraSinDomingos } from "@/lib/date-utils"

dayjs.extend(utc)
dayjs.extend(timezone)

const ECUADOR_TZ = "America/Guayaquil"
const TOLERANCIA = 0.01

type Num = number | string | { toString(): string } | null | undefined

export interface PagoCalc {
  monto: Num
  devolucionSeguro?: Num
}

export interface PrestamoCalc {
  id?: string
  monto: Num
  interes: Num
  estado?: string | null
  fechaFin: Date | string
  tipoPago?: string | null
  pagos?: PagoCalc[]
}

const n = (v: Num) => {
  const x = Number(v?.toString() ?? 0)
  return Number.isFinite(x) ? x : 0
}
const r2 = (x: number) => Math.round(x * 100) / 100

/** Día calendario (YYYY-MM-DD) de una fecha guardada en BD. */
export function diaCalendario(fecha: Date | string): string {
  // Las fechas de préstamos se guardan como medianoche (UTC o Ecuador); su día UTC es el día lógico.
  return dayjs.utc(fecha).format("YYYY-MM-DD")
}

/** Día calendario de "hoy" (o de la fecha de referencia) en Ecuador. */
export function diaReferencia(ref?: Date | string): string {
  return (ref ? dayjs(ref) : dayjs()).tz(ECUADOR_TZ).format("YYYY-MM-DD")
}

export function calcularMontoTotal(p: PrestamoCalc): number {
  return r2(n(p.monto) * (1 + n(p.interes) / 100))
}

export function calcularTotalPagado(p: PrestamoCalc): number {
  return r2((p.pagos || []).reduce((s, pago) => s + n(pago.monto) + n(pago.devolucionSeguro), 0))
}

export function calcularSaldo(p: PrestamoCalc) {
  const montoTotal = calcularMontoTotal(p)
  const totalPagado = calcularTotalPagado(p)
  const saldo = Math.max(0, r2(montoTotal - totalPagado))
  const porcentajePagado = montoTotal > 0 ? Math.min(100, (totalPagado / montoTotal) * 100) : 0
  return { montoTotal, totalPagado, saldo, porcentajePagado }
}

/**
 * ¿El préstamo sigue vivo (debe dinero y no fue cerrado/renovado)?
 * @param idsRenovados IDs de préstamos que otro préstamo tiene como `renovadoDeId`.
 */
export function esVigente(p: PrestamoCalc, idsRenovados?: Set<string>): boolean {
  if (p.estado === "CANCELADO" || p.estado === "RENOVADO") return false
  if (p.id && idsRenovados?.has(p.id)) return false
  return calcularSaldo(p).saldo > TOLERANCIA
}

/** ¿Vencido a la fecha de referencia (por defecto hoy en Ecuador)? */
export function esVencido(p: PrestamoCalc, idsRenovados?: Set<string>, ref?: Date | string): boolean {
  if (!esVigente(p, idsRenovados)) return false
  return diaCalendario(p.fechaFin) < diaReferencia(ref)
}

export function diasVencido(p: PrestamoCalc, ref?: Date | string): number {
  if (diaCalendario(p.fechaFin) >= diaReferencia(ref)) return 0
  return Math.max(0, getDiasMoraSinDomingos(p.fechaFin, ref ? new Date(ref) : new Date(), p.tipoPago || "DIARIO"))
}

export type EstadoReal = "AL_DIA" | "VENCIDO" | "CANCELADO" | "RENOVADO"

export function estadoReal(p: PrestamoCalc, idsRenovados?: Set<string>, ref?: Date | string): EstadoReal {
  if (p.estado === "RENOVADO" || (p.id && idsRenovados?.has(p.id))) return "RENOVADO"
  if (!esVigente(p, idsRenovados)) return "CANCELADO"
  return esVencido(p, idsRenovados, ref) ? "VENCIDO" : "AL_DIA"
}

/**
 * Inicio del día (Ecuador) para usar en filtros Prisma: `fechaFin: { lt: inicioDeHoy() }`.
 * Coincide con la regla de `esVencido` para no traer préstamos que vencen hoy.
 */
export function inicioDeHoy(ref?: Date | string): Date {
  return (ref ? dayjs(ref) : dayjs()).tz(ECUADOR_TZ).startOf("day").toDate()
}

/** Carga el set de IDs de préstamos que ya fueron renovados/refinanciados. */
export async function cargarIdsRenovados(prisma: any): Promise<Set<string>> {
  const rows: { renovadoDeId: string | null }[] = await prisma.prestamo.findMany({
    where: { renovadoDeId: { not: null } },
    select: { renovadoDeId: true },
  })
  return new Set(rows.map((r) => r.renovadoDeId as string))
}

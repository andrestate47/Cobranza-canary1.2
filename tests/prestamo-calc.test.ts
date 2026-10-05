/**
 * Pruebas de las reglas centrales de préstamos.
 * Ejecutar: npx tsx tests/prestamo-calc.test.ts
 */
import assert from "node:assert/strict"
import { calcularSaldo, esVigente, esVencido, diasVencido, estadoReal } from "../lib/prestamo-calc"

let ok = 0
const t = (nombre: string, fn: () => void) => {
  try { fn(); ok++; console.log("✔", nombre) }
  catch (e: any) { console.error("✘", nombre, "\n  ", e.message); process.exitCode = 1 }
}

// Hoy = 5 oct 2026 en Ecuador. 19:30 Ecuador = 00:30 UTC del día 6 (caso crítico)
const HOY_MANANA = new Date("2026-10-05T13:00:00Z") // 08:00 Ecuador
const HOY_NOCHE = new Date("2026-10-06T00:30:00Z")  // 19:30 Ecuador, todavía día 5

const base = { id: "p1", monto: 100, interes: 20, estado: "ACTIVO", tipoPago: "DIARIO" }

t("saldo incluye interés", () => {
  assert.equal(calcularSaldo({ ...base, fechaFin: "2026-10-10", pagos: [] }).saldo, 120)
})
t("saldo resta devolución de seguro", () => {
  assert.equal(calcularSaldo({ ...base, fechaFin: "2026-10-10", pagos: [{ monto: 100, devolucionSeguro: 20 }] }).saldo, 0)
})
t("decimales tipo Prisma (string) funcionan", () => {
  assert.equal(calcularSaldo({ ...base, monto: "100.00", interes: "20", fechaFin: "2026-10-10", pagos: [{ monto: "119.99" }] }).saldo, 0.01)
})
t("pagado completo no es vigente ni vencido", () => {
  const p = { ...base, fechaFin: "2026-09-01", pagos: [{ monto: 120 }] }
  assert.equal(esVigente(p), false)
  assert.equal(esVencido(p, undefined, HOY_MANANA), false)
})
t("renovado (otro préstamo lo apunta) no es vencido", () => {
  const p = { ...base, fechaFin: "2026-09-01", pagos: [] }
  assert.equal(esVencido(p, new Set(["p1"]), HOY_MANANA), false)
  assert.equal(estadoReal(p, new Set(["p1"]), HOY_MANANA), "RENOVADO")
})
t("estado CANCELADO/RENOVADO nunca vencido", () => {
  assert.equal(esVencido({ ...base, estado: "CANCELADO", fechaFin: "2026-09-01", pagos: [] }, undefined, HOY_MANANA), false)
  assert.equal(esVencido({ ...base, estado: "RENOVADO", fechaFin: "2026-09-01", pagos: [] }, undefined, HOY_MANANA), false)
})
for (const [nombre, fin] of [
  ["medianoche UTC", "2026-10-05T00:00:00Z"],
  ["medianoche Ecuador", "2026-10-05T05:00:00Z"],
] as const) {
  t(`vence HOY (${nombre}) → al día (mañana y noche)`, () => {
    const p = { ...base, fechaFin: fin, pagos: [] }
    assert.equal(esVencido(p, undefined, HOY_MANANA), false)
    assert.equal(esVencido(p, undefined, HOY_NOCHE), false)
  })
}
t("venció AYER → vencido", () => {
  const p = { ...base, fechaFin: "2026-10-04T05:00:00Z", pagos: [] }
  assert.equal(esVencido(p, undefined, HOY_MANANA), true)
  assert.equal(estadoReal(p, undefined, HOY_MANANA), "VENCIDO")
})
t("vence mañana → al día", () => {
  assert.equal(esVencido({ ...base, fechaFin: "2026-10-06T05:00:00Z", pagos: [] }, undefined, HOY_NOCHE), false)
})
t("días vencido no cuenta domingos", () => {
  // fin jueves 1 oct; hoy lunes 5 oct → vie, sáb, (dom no), lun = 3
  assert.equal(diasVencido({ ...base, fechaFin: "2026-10-01T05:00:00Z" }, HOY_MANANA), 3)
})
t("días vencido = 0 si vence hoy", () => {
  assert.equal(diasVencido({ ...base, fechaFin: "2026-10-05T05:00:00Z" }, HOY_MANANA), 0)
})

console.log(`\n${ok} pruebas OK`)

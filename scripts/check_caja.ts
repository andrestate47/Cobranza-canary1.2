import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("Iniciando análisis de Caja Chica local...")
  
  // Obtener movimientos de caja chica agrupados por tipo
  const movimientos = await prisma.movimientoCajaChica.findMany({
    orderBy: { fecha: 'desc' }
  })

  console.log(`Total de movimientos encontrados: ${movimientos.length}`)

  let totalApertura = 0
  let totalEntrega = 0
  let totalDevolucion = 0
  let totalGasto = 0
  let totalEgresoGeneral = 0
  let totalAjuste = 0

  const desglosePorTipo: Record<string, { count: number, total: number }> = {}

  movimientos.forEach(m => {
    const tipo = m.tipo
    const monto = Number(m.monto)

    if (!desglosePorTipo[tipo]) {
      desglosePorTipo[tipo] = { count: 0, total: 0 }
    }
    desglosePorTipo[tipo].count++
    desglosePorTipo[tipo].total += monto

    if (tipo === "APERTURA_CAJA") totalApertura += monto
    else if (tipo === "ENTREGA" || tipo === "ENTREGADO") totalEntrega += monto
    else if (tipo === "DEVOLUCION" || tipo === "DEVUELTO") totalDevolucion += monto
    else if (tipo === "GASTO" || tipo === "GASTADO") totalGasto += monto
    else if (tipo === "EGRESO_GENERAL") totalEgresoGeneral += monto
    else if (tipo === "AJUSTE") totalAjuste += monto
  })

  console.log("\n=== DESGLOSE POR TIPO DE MOVIMIENTO ===")
  console.table(
    Object.entries(desglosePorTipo).map(([tipo, data]) => ({
      Tipo: tipo,
      Cantidad: data.count,
      Total: data.total.toFixed(2)
    }))
  )

  const saldoCajaAdmin = totalApertura - totalEntrega - totalEgresoGeneral + totalDevolucion
  const totalCobradores = totalEntrega - totalDevolucion - totalGasto

  console.log("\n=== BALANCES CALCULADOS ===")
  console.log(`1. Caja Central (Admin): ${saldoCajaAdmin.toFixed(2)}`)
  console.log(`   (Aperturas [${totalApertura.toFixed(2)}] - Entregas [${totalEntrega.toFixed(2)}] - Egresos Grales [${totalEgresoGeneral.toFixed(2)}] + Devoluciones [${totalDevolucion.toFixed(2)}])`)
  console.log(`2. Saldo en Cobradores: ${totalCobradores.toFixed(2)}`)
  console.log(`   (Entregas [${totalEntrega.toFixed(2)}] - Devoluciones [${totalDevolucion.toFixed(2)}] - Gastos [${totalGasto.toFixed(2)}])`)
  console.log(`3. Fondo Total Consolidado (Caja + Cobradores): ${(saldoCajaAdmin + totalCobradores).toFixed(2)}`)

  console.log("\n=== ÚLTIMOS 10 MOVIMIENTOS ===")
  movimientos.slice(0, 10).forEach(m => {
    console.log(`[${m.fecha.toISOString().split('T')[0]}] Tipo: ${m.tipo} | Monto: ${Number(m.monto).toFixed(2)} | Obs: ${m.observaciones || m.descripcion || '-'}`)
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

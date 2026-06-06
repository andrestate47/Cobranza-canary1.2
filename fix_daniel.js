const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const daniel = await prisma.user.findFirst({
    where: { email: 'cobrador@cobranza.com' }
  });

  if (!daniel) {
    console.log("No se encontro a Daniel");
    return;
  }

  // Obtenemos los cierres de junio de Daniel
  const cierres = await prisma.cierreDia.findMany({
    where: { userId: daniel.id, fecha: { gte: new Date('2026-06-01T00:00:00Z') } },
    orderBy: { fecha: 'asc' }
  });

  // Empezamos con saldo acumulado 0 justo antes del 01/06
  let saldoAcumulado = 0;

  for (const cierre of cierres) {
    // Calculamos el saldo nuevo con los totales que ya tiene el cierre
    const saldoNuevo = saldoAcumulado + Number(cierre.totalCobrado) - Number(cierre.totalPrestado) - Number(cierre.totalGastos);
    
    await prisma.cierreDia.update({
      where: { id: cierre.id },
      data: { saldoEfectivo: saldoNuevo }
    });
    
    console.log(`Daniel: Actualizado ${cierre.fecha.toISOString().split('T')[0]} - Saldo Inicial Usado: ${saldoAcumulado} -> Saldo Nuevo: ${saldoNuevo}`);
    saldoAcumulado = saldoNuevo;
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

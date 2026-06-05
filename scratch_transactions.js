const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectTransactions() {
  const cobradores = await prisma.user.findMany({
    where: { role: 'COBRADOR' },
    select: { id: true, firstName: true, lastName: true, email: true }
  });

  console.log("=== TRANSACCIONES POR COBRADOR ===");
  for (const cobrador of cobradores) {
    const totalPagos = await prisma.pago.count({ where: { userId: cobrador.id } });
    const totalPrestamos = await prisma.prestamo.count({ where: { userId: cobrador.id } });
    const totalGastos = await prisma.gasto.count({ where: { userId: cobrador.id } });
    const totalCajaChica = await prisma.movimientoCajaChica.count({ where: { cobradorId: cobrador.id } });

    if (totalPagos > 0 || totalPrestamos > 0 || totalGastos > 0 || totalCajaChica > 0) {
      console.log(`\nCobrador: ${cobrador.firstName} ${cobrador.lastName} (${cobrador.email})`);
      console.log(`  - Pagos: ${totalPagos}`);
      console.log(`  - Préstamos: ${totalPrestamos}`);
      console.log(`  - Gastos: ${totalGastos}`);
      console.log(`  - Movimientos Caja Chica: ${totalCajaChica}`);

      // Obtener el último pago
      const ultimoPago = await prisma.pago.findFirst({
        where: { userId: cobrador.id },
        orderBy: { fecha: 'desc' }
      });
      if (ultimoPago) {
        console.log(`  - Último pago registrado: ${ultimoPago.fecha.toISOString()} por $${ultimoPago.monto}`);
      }

      // Obtener el último préstamo
      const ultimoPrestamo = await prisma.prestamo.findFirst({
        where: { userId: cobrador.id },
        orderBy: { createdAt: 'desc' }
      });
      if (ultimoPrestamo) {
        console.log(`  - Último préstamo registrado: ${ultimoPrestamo.createdAt.toISOString()} por $${ultimoPrestamo.monto}`);
      }
    }
  }
}

inspectTransactions().catch(console.error).finally(() => prisma.$disconnect());

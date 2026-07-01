import { prisma } from './lib/db';
async function run() {
  try {
    const res = await prisma.pago.groupBy({
      by: ['prestamoId'],
      _sum: { monto: true, devolucionSeguro: true },
      where: { prestamoId: { in: [] } }
    });
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
run();

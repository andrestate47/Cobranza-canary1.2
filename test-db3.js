const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const cobrosHoy = await prisma.pago.findMany({
      take: 100,
      include: { usuario: true, prestamo: { include: { cliente: true, pagos: true } } }
    });
    let errorFound = false;
    cobrosHoy.forEach(pago => {
      if (!pago.usuario) {
        console.log("No usuario in pago ", pago.id);
        errorFound = true;
      }
      if (!pago.prestamo) {
        console.log("No prestamo in pago ", pago.id);
        errorFound = true;
      }
      if (!pago.prestamo?.cliente) {
        console.log("No cliente in prestamo ", pago.prestamoId);
        errorFound = true;
      }
    });
    if (!errorFound) console.log("No missing relations in cobrosHoy");
  } catch (e) {
    console.error("Error: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

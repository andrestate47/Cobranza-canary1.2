const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const prestamos = await prisma.prestamo.findMany({
      take: 100,
      include: { usuario: true }
    });
    let errorFound = false;
    prestamos.forEach(pago => {
      if (!pago.usuario) {
        console.log("No usuario in prestamo ", pago.id);
        errorFound = true;
      }
    });
    if (!errorFound) console.log("No missing relations in nuevosPrestamos");
  } catch (e) {
    console.error("Error: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

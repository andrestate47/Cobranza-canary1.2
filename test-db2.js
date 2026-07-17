const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const routeFilter = {};
    const prestamosData = await prisma.prestamo.aggregate({
      _count: { id: true },
      where: { 
        estado: 'ACTIVO',
        cliente: routeFilter
      }
    });
    console.log("Success aggregate: ", prestamosData);
  } catch (e) {
    console.error("Error: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

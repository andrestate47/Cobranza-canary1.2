const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const prestamos = await prisma.prestamo.findMany({
      where: { valorCuota: 0 }
    });
    console.log("Prestamos with valorCuota 0: ", prestamos.length);
  } catch (e) {
    console.error("Error: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

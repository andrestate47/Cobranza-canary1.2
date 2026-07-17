const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const prestamos = await prisma.prestamo.findMany({
      take: 5,
      include: { usuario: true }
    });
    console.log("Prestamos with null usuario: ", prestamos.filter(p => !p.usuario).length);
    
    const pagos = await prisma.pago.findMany({
      take: 5,
      include: { usuario: true }
    });
    console.log("Pagos with null usuario: ", pagos.filter(p => !p.usuario).length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
test();

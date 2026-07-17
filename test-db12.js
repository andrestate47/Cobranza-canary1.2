const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const routeFilter = {};
    const fecha = new Date().toISOString().split('T')[0];
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaInicio = new Date(year, month - 1, day, 0, 0, 0, 0);
    const fechaFin = new Date(year, month - 1, day, 23, 59, 59, 999);

    const todosPrestamosTotales = await prisma.prestamo.findMany({
      where: { 
        estado: 'ACTIVO',
        cliente: routeFilter
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            documento: true,
            telefono: true,
            direccionCobro: true,
            direccionCliente: true
          }
        },
        pagos: {
          select: {
            monto: true,
            fecha: true
          },
          orderBy: {
            fecha: 'desc'
          }
        }
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    });
    
    console.log("Success findMany. Count: ", todosPrestamosTotales.length);
  } catch (e) {
    console.error("Error: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

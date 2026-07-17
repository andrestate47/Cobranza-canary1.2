const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const routeFilter = {};
    const fechaInicio = new Date('2026-07-01T00:00:00Z');
    const fechaFin = new Date('2026-07-31T23:59:59Z');
    
    // Just test cobrosHoy
    const cobrosHoy = await prisma.pago.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        },
        prestamo: {
          cliente: routeFilter
        }
      },
      include: {
        prestamo: {
          include: {
            cliente: {
              select: {
                nombre: true,
                apellido: true,
                documento: true,
                telefono: true
              }
            },
            pagos: {
              select: {
                monto: true
              }
            }
          }
        },
        usuario: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    cobrosHoy.map(pago => {
          const totalPagado = pago.prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          const montoPrestamo = Number(pago.prestamo.monto)
          const porcentajePagado = (totalPagado / montoPrestamo * 100).toFixed(1)
          const cuotasPagadas = Math.floor(totalPagado / Number(pago.prestamo.valorCuota))
          const saldoPendiente = montoPrestamo - totalPagado
          return `${pago.usuario?.firstName || ''} ${pago.usuario?.lastName || ''}`
    });
    console.log("Success cobrosHoy");
  } catch (e) {
    console.error("Error cobrosHoy: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

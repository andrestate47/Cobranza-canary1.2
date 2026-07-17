const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const routeFilter = {};
    const fechaInicio = new Date('2026-07-01T00:00:00Z');
    const fechaFin = new Date('2026-07-31T23:59:59Z');
    
    const clientesVisitados = await prisma.cliente.findMany({
      where: {
        activo: true,
        ...routeFilter,
        visitas: {
          some: {
            fecha: {
              gte: fechaInicio,
              lte: fechaFin
            }
          }
        }
      },
      include: {
        visitas: {
          where: {
            fecha: {
              gte: fechaInicio,
              lte: fechaFin
            }
          },
          include: {
            usuario: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            fecha: 'desc'
          },
          take: 1
        },
        prestamos: {
          where: { estado: 'ACTIVO' },
          include: {
            pagos: {
              select: {
                monto: true
              }
            }
          }
        }
      }
    })

    const hasSaldoPendiente = (prestamo) => {
      const pagado = prestamo.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0)
      return Number(prestamo.monto) - pagado > 0
    }

    clientesVisitados.map(cliente => {
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) =>
            sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto), 0), 0
          )
          const saldoPendiente = totalPrestado - totalPagado
          const prestamosVencidos = cliente.prestamos.filter(p => new Date(p.fechaFin) < new Date() && hasSaldoPendiente(p))

          return {
            id: cliente.id,
            visitadoPor: cliente.visitas[0]?.usuario ?
              `${cliente.visitas[0].usuario.firstName} ${cliente.visitas[0].usuario.lastName}` : null
          }
        })
    console.log("Success clientesVisitados");
  } catch (e) {
    console.error("Error clientesVisitados: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

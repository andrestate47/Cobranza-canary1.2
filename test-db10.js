const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const routeFilter = {};
    const prestamosVencidos = await prisma.prestamo.findMany({
      where: {
        estado: 'ACTIVO',
        fechaFin: {
          lt: new Date()
        },
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
      }
    })

    const hasSaldoPendiente = (prestamo) => {
      const pagado = prestamo.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0)
      return Number(prestamo.monto) - pagado > 0
    }

    const prestamosVencidosReales = prestamosVencidos.filter(hasSaldoPendiente)

    prestamosVencidosReales.map(prestamo => {
          const totalPagado = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          const saldoPendiente = Number(prestamo.monto) - totalPagado
          const cuotasPagadas = Math.floor(totalPagado / Number(prestamo.valorCuota))
          const porcentajePagado = (totalPagado / Number(prestamo.monto) * 100).toFixed(1)
          const ultimoPago = prestamo.pagos.length > 0 ? prestamo.pagos[0].fecha : null
          
          return { cliente: `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}` }
    });
    console.log("Success prestamosVencidosReales");
  } catch (e) {
    console.error("Error prestamosVencidosReales: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const routeFilter = {};
    const fechaInicio = new Date('2026-07-01T00:00:00Z');
    const fechaFin = new Date('2026-07-31T23:59:59Z');
    
    // Test nuevosClientes
    const nuevosClientes = await prisma.cliente.findMany({
      where: {
        activo: true,
        ...routeFilter
      },
      include: {
        prestamos: {
          select: {
            id: true,
            monto: true,
            estado: true,
            fechaInicio: true,
            tipoPago: true,
            interes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const result = nuevosClientes.map(cliente => {
          const prestamosActivos = cliente.prestamos.filter(p => p.estado === 'ACTIVO')
          const primerPrestamo = cliente.prestamos.length > 0 ? cliente.prestamos[0] : null

          return {
            id: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            documento: cliente.documento,
            telefono: cliente.telefono,
            direccion: cliente.direccionCobro || cliente.direccionCliente,
            fechaRegistro: cliente.createdAt,
            totalPrestamos: cliente.prestamos.length,
            prestamosActivos: prestamosActivos.length,
            tienePrestamo: cliente.prestamos.length > 0,
            montoPrimerPrestamo: primerPrestamo ? Number(primerPrestamo.monto) : null,
            tipoPagoPrimerPrestamo: primerPrestamo?.tipoPago || null,
            interesPrimerPrestamo: primerPrestamo ? Number(primerPrestamo.interes) : null
          }
        })
    console.log("Success nuevosClientes");
  } catch (e) {
    console.error("Error: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

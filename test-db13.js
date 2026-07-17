const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getDiasMoraSinDomingos } = require('./lib/date-utils'); // Need this one

async function test() {
  try {
    const routeFilter = {};
    const fecha = new Date().toISOString().split('T')[0];
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaInicio = new Date(year, month - 1, day, 0, 0, 0, 0);
    const fechaFin = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    const cobrosHoy = await prisma.pago.findMany({
      where: {
        fecha: { gte: fechaInicio, lte: fechaFin }
      },
      include: {
        prestamo: {
          include: {
            cliente: { select: { nombre: true, apellido: true, documento: true, telefono: true } },
            pagos: { select: { monto: true } }
          }
        },
        usuario: { select: { firstName: true, lastName: true } }
      }
    });

    const prestamosVencidos = await prisma.prestamo.findMany({
      where: { estado: 'ACTIVO', fechaFin: { lt: new Date() } },
      include: {
        cliente: { select: { nombre: true, apellido: true, documento: true, telefono: true, direccionCobro: true, direccionCliente: true } },
        pagos: { select: { monto: true, fecha: true }, orderBy: { fecha: 'desc' } }
      }
    });

    const clientesVisitados = await prisma.cliente.findMany({
      where: { activo: true, visitas: { some: { fecha: { gte: fechaInicio, lte: fechaFin } } } },
      include: {
        visitas: { where: { fecha: { gte: fechaInicio, lte: fechaFin } }, include: { usuario: { select: { firstName: true, lastName: true } } }, orderBy: { fecha: 'desc' }, take: 1 },
        prestamos: { where: { estado: 'ACTIVO' }, include: { pagos: { select: { monto: true } } } }
      }
    });

    const clientesNoVisitados = await prisma.cliente.findMany({
      where: { activo: true, prestamos: { some: { estado: 'ACTIVO' } }, NOT: { visitas: { some: { fecha: { gte: fechaInicio, lte: fechaFin } } } } },
      include: { visitas: { orderBy: { fecha: 'desc' }, take: 1 }, prestamos: { where: { estado: 'ACTIVO' }, include: { pagos: { select: { monto: true } } } } }
    });

    const nuevosClientes = await prisma.cliente.findMany({
      where: { activo: true },
      include: { prestamos: { select: { id: true, monto: true, estado: true, fechaInicio: true, tipoPago: true, interes: true } } }
    });

    const nuevosPrestamos = await prisma.prestamo.findMany({
      where: { createdAt: { gte: fechaInicio, lte: fechaFin } },
      include: { cliente: { select: { nombre: true, apellido: true, documento: true, telefono: true, direccionCobro: true } }, usuario: { select: { firstName: true, lastName: true } }, pagos: { select: { monto: true, fecha: true } } }
    });

    const clientesConMora = await prisma.cliente.findMany({
      where: { activo: true, prestamos: { some: { estado: 'ACTIVO', fechaFin: { lt: new Date() } } } },
      include: { visitas: { orderBy: { fecha: 'desc' }, take: 1 }, prestamos: { where: { estado: 'ACTIVO', fechaFin: { lt: new Date() } }, include: { pagos: { select: { monto: true } } } } }
    });

    const todosPrestamosTotales = await prisma.prestamo.findMany({
      where: { estado: 'ACTIVO' },
      include: { cliente: { select: { nombre: true, apellido: true, documento: true, telefono: true, direccionCobro: true, direccionCliente: true } }, pagos: { select: { monto: true, fecha: true }, orderBy: { fecha: 'desc' } } }
    });

    const prestamosCanceladosLista = await prisma.prestamo.findMany({
      where: { estado: 'CANCELADO' },
      include: { cliente: { select: { nombre: true, apellido: true, documento: true, telefono: true, direccionCobro: true, direccionCliente: true } }, pagos: { select: { monto: true, fecha: true }, orderBy: { fecha: 'desc' } } }, take: 100
    });

    const prestamosEnMoraLista = await prisma.prestamo.findMany({
      where: { estado: 'ACTIVO', fechaFin: { lt: new Date() } },
      include: { cliente: { select: { nombre: true, apellido: true, documento: true, telefono: true, direccionCobro: true, direccionCliente: true } }, pagos: { select: { monto: true, fecha: true }, orderBy: { fecha: 'desc' } } }
    });

    const hasSaldoPendiente = (prestamo) => {
      const pagado = prestamo.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
      return Number(prestamo.monto) - pagado > 0;
    };

    const prestamosVencidosReales = prestamosVencidos.filter(hasSaldoPendiente);
    const prestamosEnMoraListaReales = prestamosEnMoraLista.filter(hasSaldoPendiente);
    const clientesConMoraReales = clientesConMora.map(cliente => ({ ...cliente, prestamos: cliente.prestamos.filter(hasSaldoPendiente) })).filter(c => c.prestamos.length > 0);

    const informe = {
      detalles: {
        clientesVisitados: clientesVisitados.map(cliente => {
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) => sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto), 0), 0)
          const saldoPendiente = totalPrestado - totalPagado
          const prestamosVencidos = cliente.prestamos.filter(p => new Date(p.fechaFin) < new Date() && hasSaldoPendiente(p))
          return { id: cliente.id }
        }),
        clientesNoVisitados: clientesNoVisitados.map(cliente => {
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) => sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto), 0), 0)
          const saldoPendiente = totalPrestado - totalPagado
          const prestamosVencidos = cliente.prestamos.filter(p => new Date(p.fechaFin) < new Date() && hasSaldoPendiente(p))
          return { id: cliente.id }
        }),
        prestamosVencidos: prestamosVencidosReales.map(prestamo => {
          const totalPagado = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          const saldoPendiente = Number(prestamo.monto) - totalPagado
          const cuotasPagadas = Math.floor(totalPagado / Number(prestamo.valorCuota))
          return { id: prestamo.id }
        }),
        nuevosClientes: nuevosClientes.map(cliente => {
          const prestamosActivos = cliente.prestamos.filter(p => p.estado === 'ACTIVO')
          return { id: cliente.id }
        }),
        nuevosPrestamos: nuevosPrestamos.map(prestamo => {
          const totalPagado = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          const cuotasPagadas = Math.floor(totalPagado / Number(prestamo.valorCuota))
          return { id: prestamo.id, creadoPor: `${prestamo.usuario.firstName} ${prestamo.usuario.lastName}` }
        }),
        cobrosHoy: cobrosHoy.map(pago => {
          const totalPagado = pago.prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          const cuotasPagadas = Math.floor(totalPagado / Number(pago.prestamo.valorCuota))
          return { id: pago.id, cobradoPor: `${pago.usuario.firstName} ${pago.usuario.lastName}` }
        }),
        clientesConMora: clientesConMoraReales.map(cliente => {
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) => sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto), 0), 0)
          return { id: cliente.id }
        }),
        todosPrestamosTotales: todosPrestamosTotales.map(prestamo => {
          const totalPagado = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          return { id: prestamo.id }
        }),
        prestamosCanceladosLista: prestamosCanceladosLista.map(prestamo => {
          const totalPagado = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          return { id: prestamo.id }
        }),
        prestamosEnMoraLista: prestamosEnMoraListaReales.map(prestamo => {
          const totalPagado = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          return { id: prestamo.id }
        })
      }
    };
    console.log("Success all mappings");
  } catch (e) {
    console.error("Error in mapping: ", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

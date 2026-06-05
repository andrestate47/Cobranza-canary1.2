const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar usuario Jose Jose
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Jose', mode: 'insensitive' } },
        { name: { contains: 'Jose', mode: 'insensitive' } },
        { email: { contains: 'jose', mode: 'insensitive' } }
      ]
    }
  });

  console.log("Usuarios encontrados:", JSON.stringify(users.map(u => ({ id: u.id, email: u.email, name: u.name, firstName: u.firstName, lastName: u.lastName })), null, 2));

  if (users.length === 0) {
    console.log("No se encontró ningún usuario con Jose en el nombre.");
    return;
  }

  const userId = users[0].id;

  // Buscar cierres del usuario
  const cierres = await prisma.cierreDia.findMany({
    where: { userId },
    orderBy: { fecha: 'asc' }
  });

  console.log("Cierres de Jose Jose:");
  console.log(JSON.stringify(cierres.map(c => ({
    id: c.id,
    fecha: c.fecha.toISOString(),
    totalCobrado: c.totalCobrado,
    totalPrestado: c.totalPrestado,
    totalGastos: c.totalGastos,
    saldoEfectivo: c.saldoEfectivo,
    observaciones: c.observaciones
  })), null, 2));

  // Buscar pagos, prestamos y gastos de Jose Jose entre 2026-05-28 y 2026-06-03
  const inicio = new Date("2026-05-28T00:00:00-05:00");
  const fin = new Date("2026-06-03T23:59:59-05:00");

  const pagos = await prisma.pago.findMany({
    where: { userId, fecha: { gte: inicio, lte: fin } }
  });

  const prestamos = await prisma.prestamo.findMany({
    where: { userId, createdAt: { gte: inicio, lte: fin } }
  });

  const gastos = await prisma.gasto.findMany({
    where: { userId, fecha: { gte: inicio, lte: fin } }
  });

  console.log(`Pagos entre 28 de mayo y 3 de junio: ${pagos.length}`);
  console.log(JSON.stringify(pagos.map(p => ({ id: p.id, monto: p.monto, fecha: p.fecha.toISOString() })), null, 2));

  console.log(`Préstamos entre 28 de mayo y 3 de junio: ${prestamos.length}`);
  console.log(JSON.stringify(prestamos.map(p => ({ id: p.id, monto: p.monto, fecha: p.createdAt.toISOString() })), null, 2));

  console.log(`Gastos entre 28 de mayo y 3 de junio: ${gastos.length}`);
  console.log(JSON.stringify(gastos.map(g => ({ id: g.id, monto: g.monto, fecha: g.fecha.toISOString() })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

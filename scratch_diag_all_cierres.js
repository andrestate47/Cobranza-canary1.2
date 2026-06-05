const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cierres = await prisma.cierreDia.findMany({
    include: {
      usuario: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true
        }
      }
    },
    orderBy: { fecha: 'desc' }
  });

  console.log("Todos los cierres de caja en la DB:");
  console.log(JSON.stringify(cierres.map(c => ({
    id: c.id,
    fecha: c.fecha.toISOString(),
    usuario: c.usuario.name || `${c.usuario.firstName} ${c.usuario.lastName}`,
    email: c.usuario.email,
    totalCobrado: c.totalCobrado,
    totalPrestado: c.totalPrestado,
    totalGastos: c.totalGastos,
    saldoEfectivo: c.saldoEfectivo
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

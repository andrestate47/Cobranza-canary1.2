const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prestamos = await prisma.prestamo.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { cliente: true }
  });
  for (const p of prestamos) {
    console.log(`ID: ${p.id}, Cliente: ${p.cliente.nombre} ${p.cliente.apellido}`);
    console.log(`Monto: ${p.monto}, Interes: ${p.interes}, Cuotas: ${p.cuotas}, Valor Cuota: ${p.valorCuota}`);
    console.log(`Microseguro Tipo: ${p.microseguroTipo}, Microseguro Valor: ${p.microseguroValor}, Microseguro Total: ${p.microseguroTotal}`);
    console.log(`Estado: ${p.estado}`);
    console.log('---');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());

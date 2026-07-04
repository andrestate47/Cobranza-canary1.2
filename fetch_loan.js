const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prestamos = await prisma.prestamo.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { cliente: true }
  });
  
  console.log(JSON.stringify(prestamos, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

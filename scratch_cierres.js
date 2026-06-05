const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectCierres() {
  const cierres = await prisma.cierreDia.findMany({
    include: {
      usuario: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      fecha: 'desc'
    }
  });

  console.log("Cierres registrados:");
  console.log(JSON.stringify(cierres, null, 2));
}

inspectCierres().catch(console.error).finally(() => prisma.$disconnect());

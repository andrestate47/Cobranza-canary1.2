const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Listar todos los usuarios
  const users = await prisma.user.findMany({ select: { id: true, email: true, firstName: true, lastName: true, name: true, role: true } });
  console.log("TODOS LOS USUARIOS:");
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

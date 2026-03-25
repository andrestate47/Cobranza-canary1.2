import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const ultimoPago = await prisma.pago.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log("Ultimo pago fecha cruda:", ultimoPago?.fecha);
  console.log("Ultimo pago fecha ISO string:", ultimoPago?.fecha?.toISOString());
  
  process.exit(0);
}
check();

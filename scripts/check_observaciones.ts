import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const prestamos = await prisma.prestamo.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, monto: true, observaciones: true, createdAt: true }
  })
  console.log("Recent Prestamos:", prestamos)

  const pagos = await prisma.pago.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, monto: true, observaciones: true, createdAt: true }
  })
  console.log("Recent Pagos:", pagos)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

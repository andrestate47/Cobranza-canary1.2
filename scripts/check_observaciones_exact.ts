import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const refinanciados = await prisma.prestamo.findMany({
    where: {
      observaciones: { contains: 'refinancia', mode: 'insensitive' }
    },
    select: { id: true, monto: true, observaciones: true, createdAt: true }
  })
  console.log("Refinanciados Prestamos:", refinanciados)

  const pagosRef = await prisma.pago.findMany({
    where: {
      observaciones: { contains: 'refinancia', mode: 'insensitive' }
    },
    select: { id: true, monto: true, observaciones: true, createdAt: true }
  })
  console.log("Refinanciados Pagos:", pagosRef)

  const egresosRef = await prisma.movimientoCajaChica.findMany({
    where: {
      observaciones: { contains: 'refinancia', mode: 'insensitive' }
    },
    select: { id: true, monto: true, observaciones: true, createdAt: true }
  })
  console.log("Refinanciados Egresos:", egresosRef)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

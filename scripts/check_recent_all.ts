import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dInicio = new Date('2026-06-09T00:00:00.000Z')
  const dFin = new Date('2026-06-12T00:00:00.000Z')

  const prestamos = await prisma.prestamo.findMany({
    where: {
      createdAt: { gte: dInicio, lte: dFin }
    },
    select: { id: true, monto: true, observaciones: true, createdAt: true }
  })
  console.log("Prestamos recientes:", prestamos)

  const pagos = await prisma.pago.findMany({
    where: {
      createdAt: { gte: dInicio, lte: dFin }
    },
    select: { id: true, monto: true, observaciones: true, createdAt: true }
  })
  console.log("Pagos recientes:", pagos)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())

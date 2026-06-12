import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const prestamos = await prisma.prestamo.findMany({
    where: {
      monto: 90
    },
    select: { id: true, monto: true, observaciones: true, createdAt: true, cliente: { select: { nombre: true, apellido: true } } }
  })
  console.log("Prestamos de 90$:", prestamos)

  const pagos = await prisma.pago.findMany({
    where: {
      monto: 90
    },
    select: { id: true, monto: true, observaciones: true, createdAt: true, prestamo: { select: { cliente: { select: { nombre: true, apellido: true } } } } }
  })
  console.log("Pagos de 90$:", pagos)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

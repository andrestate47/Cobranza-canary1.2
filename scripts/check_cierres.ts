import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const cierres = await prisma.cierreDia.findMany({
    orderBy: { fecha: 'desc' },
    take: 10,
    include: { usuario: { select: { firstName: true, lastName: true } } }
  })
  console.log("Últimos cierres de día:")
  for (const c of cierres) {
    console.log(`- ${c.fecha.toISOString().split('T')[0]} | ${c.usuario.firstName}: ${c.saldoEfectivo}`)
  }
}

main().finally(() => prisma.$disconnect())

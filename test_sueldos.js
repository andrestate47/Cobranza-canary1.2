const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const userId = "cmph3eepy0007whysf0vl0sd3" // A known user ID from the logs
    const salarioBase = "50.89"
    const comisionPorCobro = "0.00"
    const limitePorcentajeAvance = "50"
    const montoMinimoAvance = "0"

    const configuracion = await prisma.configuracionSueldo.upsert({
      where: { userId },
      update: {
        salarioBase: parseFloat(salarioBase),
        comisionPorCobro: parseFloat(comisionPorCobro),
        limitePorcentajeAvance: parseInt(limitePorcentajeAvance),
        montoMinimoAvance: parseFloat(montoMinimoAvance || "0"),
        activo: true,
        updatedAt: new Date()
      },
      create: {
        userId,
        salarioBase: parseFloat(salarioBase),
        comisionPorCobro: parseFloat(comisionPorCobro),
        limitePorcentajeAvance: parseInt(limitePorcentajeAvance),
        montoMinimoAvance: parseFloat(montoMinimoAvance || "0"),
        activo: true
      }
    })
    console.log("Success:", configuracion)
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

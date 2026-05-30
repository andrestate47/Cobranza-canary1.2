const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatos() {
  const hoy = new Date();
  const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
  
  const pagos = await prisma.pago.findMany({
    where: {
      createdAt: {
        gte: fechaInicio,
        lte: fechaFin
      }
    }
  });
  
  console.log("Pagos hoy:", pagos.length, pagos);
  
  const totalEfectivo = pagos
    .filter(p => p.metodoPago === "EFECTIVO")
    .reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0);
    
  console.log("Total Efectivo calculado:", totalEfectivo);
}

checkDatos().catch(console.error).finally(() => prisma.$disconnect());

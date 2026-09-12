const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('=== LIMPIANDO DATOS DE PRUEBA EN LA BASE DE DATOS ===');
  const prisma = new PrismaClient();

  try {
    // Borrar en orden respetando claves foráneas
    console.log('1. Eliminando pagos de prueba...');
    await prisma.pago.deleteMany({});

    console.log('2. Eliminando préstamos de prueba...');
    await prisma.prestamo.deleteMany({});

    console.log('3. Eliminando visitas de clientes...');
    await prisma.visitaCliente.deleteMany({});

    console.log('4. Eliminando orden de ruta del día...');
    await prisma.ordenRutaDia.deleteMany({});

    console.log('5. Eliminando clientes de prueba...');
    await prisma.cliente.deleteMany({});

    console.log('6. Eliminando gastos de prueba...');
    await prisma.gasto.deleteMany({});

    console.log('7. Eliminando movimientos de caja chica...');
    await prisma.movimientoCajaChica.deleteMany({});

    console.log('8. Eliminando cierres de día...');
    await prisma.cierreDia.deleteMany({});

    console.log('9. Eliminando susus de prueba...');
    await prisma.susuPago.deleteMany({});
    await prisma.susuParticipante.deleteMany({});
    await prisma.susu.deleteMany({});

    console.log('10. Eliminando transferencias...');
    await prisma.transferencia.deleteMany({});

    console.log('\n✅ ¡Limpieza completada! La base de datos está limpia de clientes y préstamos de prueba.');
    console.log('👥 Los usuarios administradores, supervisores y cobradores permanecen intactos.');

  } catch (err) {
    console.error('Error al limpiar datos de prueba:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

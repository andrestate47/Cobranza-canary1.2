const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('================================================================');
  console.log('⚡ ASIGNANDO PRÉSTAMOS ACTIVOS A LOS 44 CLIENTES RESTAURADOS');
  console.log('================================================================');

  const prisma = new PrismaClient();

  try {
    const clientes = await prisma.cliente.findMany({
      include: { prestamos: true }
    });

    console.log(`Verificando ${clientes.length} clientes...`);
    let prestamosCreados = 0;

    for (const c of clientes) {
      if (c.prestamos.length === 0) {
        // Crear préstamo por defecto de 300 o valor recuperado
        const monto = 300;
        const interes = 20;
        const totalPagar = monto * (1 + interes / 100);
        const cuotas = 24;
        const valorCuota = totalPagar / cuotas;

        await prisma.prestamo.create({
          data: {
            clienteId: c.id,
            monto: monto,
            interes: interes,
            totalPagar: totalPagar,
            saldoPendiente: totalPagar,
            cuotas: cuotas,
            cuotasPagadas: 0,
            valorCuota: valorCuota,
            modalidadPago: 'DIARIO',
            estado: 'ACTIVO',
            fechaInicio: new Date()
          }
        });
        prestamosCreados++;
      }
    }

    console.log(`\n✅ ¡Se crearon/activaron ${prestamosCreados} préstamos para los clientes!`);

    const totalPrestamos = await prisma.prestamo.count();
    console.log(`Total de préstamos activos en la base de datos: ${totalPrestamos}`);

  } catch (err) {
    console.error('Error al asignar préstamos:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('================================================================');
}

main();

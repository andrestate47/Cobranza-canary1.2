const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('================================================================');
  console.log('🚀 ASIGNANDO RUTA Y ACTIVANDO 44 CLIENTES EN EL SISTEMA');
  console.log('================================================================');

  const prisma = new PrismaClient();

  try {
    // 1. Obtener usuario Administrador
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMINISTRADOR' }
    });

    if (!adminUser) {
      console.log('❌ Error: No se encontró un usuario administrador.');
      return;
    }

    // 2. Obtener o crear Ruta Principal (RUTA-001)
    let ruta = await prisma.ruta.findFirst({
      where: { numero: 'RUTA-001' }
    });

    if (!ruta) {
      ruta = await prisma.ruta.create({
        data: {
          nombre: 'Ruta Principal',
          numero: 'RUTA-001',
          activa: true
        }
      });
      console.log('✅ Ruta RUTA-001 creada exitosamente.');
    } else {
      console.log('✅ Ruta RUTA-001 encontrada:', ruta.id);
    }

    // 3. Asignar rutaId a los 44 clientes
    const updateClientes = await prisma.cliente.updateMany({
      data: {
        rutaId: ruta.id,
        numeroRuta: 'RUTA-001',
        activo: true
      }
    });
    console.log(`✅ Se asignó RUTA-001 a los ${updateClientes.count} clientes!`);

    // 4. Crear préstamos activos para cada cliente si no tienen uno
    const clientes = await prisma.cliente.findMany({
      include: { prestamos: true }
    });

    let prestamosCreados = 0;
    for (const c of clientes) {
      if (c.prestamos.length === 0) {
        const monto = 300;
        const interes = 20;
        const totalPagar = monto * (1 + interes / 100);
        const cuotas = 24;
        const valorCuota = totalPagar / cuotas;
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setDate(fechaFin.getDate() + 30);

        await prisma.prestamo.create({
          data: {
            clienteId: c.id,
            userId: adminUser.id,
            monto: monto,
            interes: interes,
            cuotas: cuotas,
            valorCuota: valorCuota,
            tipoPago: 'DIARIO',
            estado: 'ACTIVO',
            fechaInicio: fechaInicio,
            fechaFin: fechaFin
          }
        });
        prestamosCreados++;
      }
    }
    console.log(`✅ ${prestamosCreados} préstamos activos asignados a los clientes!`);

    const totalPrestamosActivos = await prisma.prestamo.count({ where: { estado: 'ACTIVO' } });
    console.log(`\n🎉 TOTAL PRÉSTAMOS ACTIVOS LISTOS PARA LISTADO GENERAL: ${totalPrestamosActivos}`);

  } catch (err) {
    console.error('Error al asignar rutas y préstamos:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('================================================================');
}

main();

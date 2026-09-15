const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Creando clientes de prueba...');

    // Buscar primer usuario existente para asociarle el préstamo
    const usuario = await prisma.user.findFirst();
    if (!usuario) {
      console.error('❌ No se encontró ningún usuario en la base de datos.');
      return;
    }

    const timestamp = Date.now().toString().slice(-4);

    // Cliente 1: Carlos Mendoza
    const cliente1 = await prisma.cliente.create({
      data: {
        codigoCliente: `CLI-${timestamp}1`,
        documento: `DOC-${timestamp}1`,
        nombre: 'Carlos',
        apellido: 'Mendoza',
        telefono: '+51 987 654 321',
        direccionCliente: 'Av. Las Flores 456, Urb. San José',
        direccionCobro: 'Calle Comercio 123, Local 4',
        ciudad: 'Lima',
        pais: 'Perú',
        foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
        activo: true,
        prestamos: {
          create: {
            userId: usuario.id,
            monto: 500,
            interes: 20,
            interesTotal: 100,
            cuotas: 24,
            valorCuota: 25,
            fechaInicio: new Date(),
            fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            estado: 'ACTIVO',
            tipoPago: 'DIARIO',
            tipoCredito: 'EFECTIVO'
          }
        }
      }
    });

    // Cliente 2: Mariana Torres
    const cliente2 = await prisma.cliente.create({
      data: {
        codigoCliente: `CLI-${timestamp}2`,
        documento: `DOC-${timestamp}2`,
        nombre: 'Mariana',
        apellido: 'Torres',
        telefono: '+51 912 345 678',
        direccionCliente: 'Jr. Los Olivos 789, San Isidro',
        direccionCobro: 'Av. Primavera 321, Dpto 201',
        ciudad: 'Lima',
        pais: 'Perú',
        foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop',
        activo: true,
        prestamos: {
          create: {
            userId: usuario.id,
            monto: 300,
            interes: 15,
            interesTotal: 45,
            cuotas: 12,
            valorCuota: 28.75,
            fechaInicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            fechaFin: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
            estado: 'ACTIVO',
            tipoPago: 'SEMANAL',
            tipoCredito: 'EFECTIVO'
          }
        }
      }
    });

    console.log('✅ Cliente 1 creado:', cliente1.nombre, cliente1.apellido, `(${cliente1.codigoCliente})`);
    console.log('✅ Cliente 2 creado:', cliente2.nombre, cliente2.apellido, `(${cliente2.codigoCliente})`);
    console.log('🎉 ¡Clientes de prueba creados exitosamente!');

  } catch (err) {
    console.error('❌ Error al crear clientes de prueba:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('================================================================');
  console.log('✨ LIMPIANDO Y ORGANIZANDO NOMBRES, TELÉFONOS Y CIUDADES REALES');
  console.log('================================================================');

  const prisma = new PrismaClient();

  try {
    const clientes = await prisma.cliente.findMany();
    console.log(`Procesando y formateando ${clientes.length} clientes...`);

    let actualizados = 0;

    for (const c of clientes) {
      let rawDir = c.direccionCliente || '';
      let rawNombre = c.nombre || '';
      let rawApellido = c.apellido || '';
      let rawTelefono = c.telefono || '';

      // Si la dirección contiene la cadena concatenada "Nombre%Apellido#Telefono"
      if (rawDir.includes('#') || rawDir.includes('%') || rawDir.includes('!')) {
        // Extraer número de teléfono +593...
        const phoneMatch = rawDir.match(/(\+593\s?[0-9\s]+|09[0-9\s]+)/);
        if (phoneMatch) {
          rawTelefono = phoneMatch[1].replace(/\s+/g, '');
        }

        // Extraer nombre y apellido de la parte previa a #
        const namePart = rawDir.split('#')[0].replace(/^5cm[^\s']+'?/, '').replace(/[!%]/g, ' ').trim();
        if (namePart.length > 2) {
          const parts = namePart.split(/\s+/);
          if (parts.length >= 3) {
            rawNombre = parts.slice(0, 2).join(' ');
            rawApellido = parts.slice(2).join(' ');
          } else if (parts.length === 2) {
            rawNombre = parts[0];
            rawApellido = parts[1];
          } else if (parts.length === 1) {
            rawNombre = parts[0];
            rawApellido = '.';
          }
        }
      }

      // Si la ciudad estaba en el nombre/apellido temporal
      let ciudad = c.ciudad;
      if (['Gualaquiza', 'Ambato', 'Quito', 'Cuenca', 'Guayaquil', 'Loja'].includes(c.nombre)) {
        ciudad = c.nombre;
      }

      // Limpiar dirección final
      let direccionLimpia = rawDir.includes('#') ? `Dirección registrada en ${ciudad || 'Ecuador'}` : rawDir;

      await prisma.cliente.update({
        where: { id: c.id },
        data: {
          nombre: rawNombre.replace(/^Cliente\s+[0-9]+/, 'Cliente'),
          apellido: rawApellido,
          telefono: rawTelefono,
          ciudad: ciudad,
          direccionCliente: direccionLimpia
        }
      });
      actualizados++;
    }

    console.log(`\n✅ ¡Se formatearon ${actualizados} clientes con sus nombres y teléfonos reales!`);

    console.log('\n=== MUESTRA DE CLIENTES CON NOMBRES Y TELÉFONOS REALES ===');
    const clientesLimpios = await prisma.cliente.findMany({ take: 10 });
    clientesLimpios.forEach((cl, i) => {
      console.log(`${i+1}. ${cl.codigoCliente} | ${cl.nombre} ${cl.apellido} | Doc: ${cl.documento} | Tel: ${cl.telefono} | Ciudad: ${cl.ciudad}`);
    });

  } catch (err) {
    console.error('Error al limpiar registros:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('================================================================');
}

main();

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  console.log('=== SCRIPT DE IMPORTACIÓN MASIVA DE CLIENTES Y PRÉSTAMOS ===');

  // Si existe un archivo datos_recuperados.json en el directorio actual, lo lee
  const jsonPath = './datos_recuperados.json';
  if (!fs.existsSync(jsonPath)) {
    console.log('\n📌 Instrucciones:');
    console.log('Crea un archivo llamado "datos_recuperados.json" en esta carpeta con la lista de clientes así:');
    console.log(JSON.stringify([
      {
        "documento": "12345678",
        "nombre": "Juan",
        "apellido": "Pérez",
        "telefono": "3001234567",
        "direccionCliente": "Calle 10 # 5-20",
        "numeroRuta": "RUTA-001",
        "valorPrestamo": 500000,
        "cuotas": 24,
        "interes": 20
      }
    ], null, 2));
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const clientes = JSON.parse(rawData);

  console.log(`Cargando ${clientes.length} clientes en la base de datos...`);
  let cargados = 0;

  for (const c of clientes) {
    try {
      const cliente = await prisma.cliente.upsert({
        where: { documento: String(c.documento).trim() },
        update: {
          nombre: String(c.nombre).trim(),
          apellido: c.apellido ? String(c.apellido).trim() : ".",
          telefono: c.telefono ? String(c.telefono).trim() : null,
          direccionCliente: c.direccionCliente ? String(c.direccionCliente).trim() : "Sin dirección",
          numeroRuta: c.numeroRuta ? String(c.numeroRuta).trim() : null
        },
        create: {
          codigoCliente: c.codigoCliente || `CL${Math.floor(100 + Math.random() * 900)}${Date.now().toString().slice(-3)}`,
          documento: String(c.documento).trim(),
          nombre: String(c.nombre).trim(),
          apellido: c.apellido ? String(c.apellido).trim() : ".",
          telefono: c.telefono ? String(c.telefono).trim() : null,
          direccionCliente: c.direccionCliente ? String(c.direccionCliente).trim() : "Sin dirección",
          numeroRuta: c.numeroRuta ? String(c.numeroRuta).trim() : null,
          activo: true
        }
      });

      if (c.valorPrestamo && parseFloat(c.valorPrestamo) > 0) {
        const monto = parseFloat(c.valorPrestamo);
        const cuotas = parseInt(c.cuotas) || 24;
        const interes = parseFloat(c.interes) || 20;
        const totalPagar = monto * (1 + interes / 100);
        const valorCuota = totalPagar / cuotas;

        await prisma.prestamo.create({
          data: {
            clienteId: cliente.id,
            monto: monto,
            interes: interes,
            totalPagar: totalPagar,
            saldoPendiente: totalPagar,
            cuotas: cuotas,
            cuotasPagadas: 0,
            valorCuota: valorCuota,
            modalidadPago: c.modalidadPago || 'DIARIO',
            estado: 'ACTIVO',
            fechaInicio: new Date()
          }
        });
      }
      cargados++;
    } catch (err) {
      console.error(`Error importando cliente ${c.documento}:`, err.message);
    }
  }

  console.log(`✅ Importación finalizada: ${cargados} clientes cargados exitosamente.`);
  await prisma.$disconnect();
}

main();

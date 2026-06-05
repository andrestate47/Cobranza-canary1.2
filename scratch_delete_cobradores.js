const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const keepers = ['cobrador@cobranza.com', 'andresfuigueroaz@gmail.com'];
  
  console.log("Keepers:", keepers);

  // Obtener todos los cobradores
  const cobradores = await prisma.user.findMany({
    where: {
      role: 'COBRADOR'
    }
  });

  console.log(`Total cobradores en DB: ${cobradores.length}`);

  for (const cobrador of cobradores) {
    if (keepers.includes(cobrador.email)) {
      console.log(`Guardando: ${cobrador.email}`);
      continue;
    }

    console.log(`Eliminando: ${cobrador.email} (ID: ${cobrador.id})...`);
    try {
      // 1. Relaciones directas que no cascada-borran
      
      // SusuParticipante y SusuPago
      const participaciones = await prisma.susuParticipante.findMany({
        where: { userId: cobrador.id }
      });
      for (const part of participaciones) {
        await prisma.susuPago.deleteMany({ where: { participanteId: part.id } });
      }
      await prisma.susuParticipante.deleteMany({ where: { userId: cobrador.id } });
      await prisma.susu.deleteMany({ where: { creadorId: cobrador.id } });

      // Cajas Chicas (Ambas relaciones: Asignador y Cobrador)
      await prisma.movimientoCajaChica.deleteMany({ where: { cobradorId: cobrador.id } });
      await prisma.movimientoCajaChica.deleteMany({ where: { asignadoPorId: cobrador.id } });

      // Pagos de sueldo (Cobrador y Pagador)
      await prisma.pagoSueldo.deleteMany({ where: { cobradorId: cobrador.id } });
      await prisma.pagoSueldo.deleteMany({ where: { pagadorId: cobrador.id } });

      // Otros
      await prisma.configuracionSueldo.deleteMany({ where: { userId: cobrador.id } });
      await prisma.dispositivoAutorizado.deleteMany({ where: { userId: cobrador.id } });
      await prisma.transferencia.deleteMany({ where: { userId: cobrador.id } });
      await prisma.visitaCliente.deleteMany({ where: { userId: cobrador.id } });
      await prisma.ordenRutaDia.deleteMany({ where: { userId: cobrador.id } });
      
      // Pagos, préstamos, gastos ordinarios
      await prisma.cierreDia.deleteMany({ where: { userId: cobrador.id } });
      await prisma.gasto.deleteMany({ where: { userId: cobrador.id } });
      await prisma.pago.deleteMany({ where: { userId: cobrador.id } });
      await prisma.prestamo.deleteMany({ where: { userId: cobrador.id } });

      // Desvincular de supervisados
      await prisma.user.updateMany({
        where: { supervisorId: cobrador.id },
        data: { supervisorId: null }
      });

      // Eliminar cuentas asociadas
      await prisma.account.deleteMany({ where: { userId: cobrador.id } });
      await prisma.session.deleteMany({ where: { userId: cobrador.id } });
      await prisma.userPermission.deleteMany({ where: { userId: cobrador.id } });
      await prisma.userTimeUsage.deleteMany({ where: { userId: cobrador.id } });

      // Eliminar el usuario
      await prisma.user.delete({
        where: { id: cobrador.id }
      });
      console.log(`Eliminado exitosamente: ${cobrador.email}`);
    } catch (e) {
      console.error(`Error al eliminar ${cobrador.email}:`, e.message, e.stack);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

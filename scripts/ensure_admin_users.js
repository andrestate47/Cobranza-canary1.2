const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

async function main() {
  console.log('=== VERIFICANDO Y RESTABLECIENDO USUARIOS EN LA BASE DE DATOS ===');
  const prisma = new PrismaClient();

  try {
    const defaultPassword = await bcryptjs.hash('184672', 12);

    // 1. Asegurar admin@cobranza.com
    const admin1 = await prisma.user.upsert({
      where: { email: 'admin@cobranza.com' },
      update: {
        password: defaultPassword,
        isActive: true,
        role: 'ADMINISTRADOR'
      },
      create: {
        email: 'admin@cobranza.com',
        password: defaultPassword,
        firstName: 'Administrador',
        lastName: 'Principal',
        name: 'Administrador Principal',
        role: 'ADMINISTRADOR',
        isActive: true
      }
    });
    console.log('✅ Usuario admin@cobranza.com actualizado/creado:', admin1.email);

    // 2. Asegurar admin@admin.com
    const admin2 = await prisma.user.upsert({
      where: { email: 'admin@admin.com' },
      update: {
        password: defaultPassword,
        isActive: true,
        role: 'ADMINISTRADOR'
      },
      create: {
        email: 'admin@admin.com',
        password: defaultPassword,
        firstName: 'Admin',
        lastName: 'Sistema',
        name: 'Admin Sistema',
        role: 'ADMINISTRADOR',
        isActive: true
      }
    });
    console.log('✅ Usuario admin@admin.com actualizado/creado:', admin2.email);

    // 3. Activar TODOS los demás usuarios por si alguno fue desactivado
    const updateResult = await prisma.user.updateMany({
      data: { isActive: true }
    });
    console.log(`✅ ${updateResult.count} usuarios verificados y activados (isActive = true).`);

    console.log('\n=== LISTA FINAL DE USUARIOS ACTIVOS ===');
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, isActive: true }
    });
    console.log(users);

  } catch (err) {
    console.error('Error actualizando usuarios:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

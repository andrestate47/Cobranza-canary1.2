const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function syncCredentials() {
  console.log('🔄 Sincronizando y verificando credenciales en la base de datos...\n');

  // 1. Definir contraseñas por defecto conocidas para cada usuario
  const defaultAccounts = [
    { email: 'admin@cobranza.com', pass: '184672', name: 'Administrador Principal', role: 'ADMINISTRADOR' },
    { email: 'supervisor@cobranza.com', pass: 'supervisor123', name: 'María Supervisora', role: 'SUPERVISOR' },
    { email: 'cobrador@cobranza.com', pass: 'cobrador123', name: 'Juan Pérez', role: 'COBRADOR' },
    { email: 'john@doe.com', pass: 'johndoe123', name: 'John Doe', role: 'ADMINISTRADOR' },
    { email: 'andresfuigueroaz@gmail.com', pass: 'andres123', name: 'Andres Figueroa', role: 'COBRADOR' }
  ];

  const report = [];

  for (const acc of defaultAccounts) {
    let user = await prisma.user.findFirst({
      where: {
        email: {
          equals: acc.email,
          mode: 'insensitive'
        }
      }
    });

    const hashedPassword = await bcryptjs.hash(acc.pass, 12);

    if (user) {
      // Verificar si la contraseña actual funciona
      let isValid = false;
      try {
        isValid = await bcryptjs.compare(acc.pass, user.password);
      } catch (e) {
        isValid = false;
      }

      if (!isValid || !user.isActive) {
        // Actualizar contraseña y asegurar activo
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            isActive: true,
            email: acc.email
          }
        });
        report.push({ email: user.email, pass: acc.pass, role: user.role, status: '🔑 Contraseña sincronizada / restablecida' });
      } else {
        report.push({ email: user.email, pass: acc.pass, role: user.role, status: '✅ Credencial activa y verificada' });
      }
    } else {
      // Crear usuario si no existe
      user = await prisma.user.create({
        data: {
          email: acc.email,
          password: hashedPassword,
          name: acc.name,
          role: acc.role,
          isActive: true
        }
      });
      report.push({ email: user.email, pass: acc.pass, role: user.role, status: '✨ Usuario creado con contraseña' });
    }
  }

  // Verificar todos los usuarios registrados actualmente en la base de datos
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true }
  });

  console.log('📋 ESTADO ACTUALIZADO DE USUARIOS Y CREDENCIALES EN DB:');
  console.table(report);

  console.log('\n👥 TODOS LOS USUARIOS REGISTRADOS EN DB:');
  console.table(allUsers);
}

syncCredentials()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

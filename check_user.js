require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@cobranza.com' }
  });
  
  if (user) {
    console.log('✅ Usuario encontrado:', user.email, 'Role:', user.role);
    const isPasswordValid = await bcryptjs.compare('admin123', user.password);
    console.log('✅ Contraseña válida:', isPasswordValid);
  } else {
    console.log('❌ Usuario NO encontrado');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

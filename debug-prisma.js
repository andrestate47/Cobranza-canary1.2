const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
  try {
    console.log('Testing User model...')
    const user = await prisma.user.findFirst()
    console.log('User found:', user)
  } catch (error) {
    console.error('Error testing User model:')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

debug()

const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function checkClientes() {
    try {
        console.log('📋 Consultando últimos clientes creados...\n')

        const clientes = await prisma.cliente.findMany({
            where: { activo: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                nombre: true,
                apellido: true,
                documento: true,
                createdAt: true
            }
        })

        console.log(`Total de clientes activos: ${await prisma.cliente.count({ where: { activo: true } })}\n`)
        console.log('Últimos 5 clientes creados:')
        console.log('─'.repeat(80))

        clientes.forEach((cliente, index) => {
            const fecha = new Date(cliente.createdAt)
            console.log(`${index + 1}. ${cliente.nombre} ${cliente.apellido}`)
            console.log(`   Documento: ${cliente.documento}`)
            console.log(`   Creado: ${fecha.toLocaleString('es-CO')}`)
            console.log(`   Fecha ISO: ${cliente.createdAt}`)
            console.log('─'.repeat(80))
        })

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkClientes()

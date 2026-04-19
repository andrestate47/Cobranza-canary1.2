
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET - Obtener usuarios disponibles para participar en SUSU
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario sea ADMIN o SUPERVISOR
    const userRoleCheck = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (userRoleCheck?.role !== 'ADMINISTRADOR' && userRoleCheck?.role !== 'SUPERVISOR') {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder al módulo SUSU' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const buscar = searchParams.get('q')

    const where: Prisma.UserWhereInput = {
      isActive: true
    }

    if (buscar) {
      where.OR = [
        { name: { contains: buscar, mode: 'insensitive' } },
        { firstName: { contains: buscar, mode: 'insensitive' } },
        { lastName: { contains: buscar, mode: 'insensitive' } },
        { email: { contains: buscar, mode: 'insensitive' } }
      ]
    }

    const usuarios = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}

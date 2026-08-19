

import { NextRequest, NextResponse } from "next/server"
import { requireUserManagementPermission } from "@/lib/permissions"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET - Obtener lista de supervisores disponibles
export async function GET(request: NextRequest) {
  try {
    await requireUserManagementPermission()

    const supervisores = await prisma.user.findMany({
      where: {
        role: {
          in: ['SUPERVISOR', 'ADMINISTRADOR']
        },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: {
            supervisados: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    const supervisoresFormateados = supervisores.map(supervisor => ({
      id: supervisor.id,
      name: supervisor.name || `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim(),
      email: supervisor.email,
      role: supervisor.role,
      supervisados: supervisor._count.supervisados
    }))

    return NextResponse.json(supervisoresFormateados)

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    console.error("Error getting supervisors:", error)
    return NextResponse.json(
      { error: message },
      { status: message.includes('autorizado') || message.includes('permiso') || message.includes('autenticado') ? 403 : 500 }
    )
  }
}


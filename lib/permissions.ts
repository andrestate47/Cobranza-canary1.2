

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export type Permission = 
  | 'SINCRONIZAR_DATOS'
  | 'REGISTRAR_COBROS'
  | 'MAPA_CLIENTES'
  | 'REGISTRAR_GASTOS'
  | 'REGISTRAR_INGRESOS'
  | 'VER_REPORTES'
  | 'VER_DASHBOARD'
  | 'VER_LISTADO_GENERAL'
  | 'VER_DETALLES_PRESTAMO'
  | 'CREAR_CLIENTES'
  | 'EDITAR_CLIENTES'
  | 'CREAR_PRESTAMOS'
  | 'EDITAR_PRESTAMOS'
  | 'ELIMINAR_PRESTAMOS'
  | 'REGISTRAR_TRANSFERENCIAS'
  | 'VER_TRANSFERENCIAS'
  | 'GESTIONAR_USUARIOS'
  | 'VER_AUDITORIA'
  | 'CONFIGURAR_SISTEMA'
  | 'GESTIONAR_PERMISOS'
  | 'REALIZAR_CIERRE_DIA'
  | 'VER_CIERRES_HISTORICOS'

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMINISTRADOR: [], // Los administradores tienen acceso total, no necesitan permisos específicos
  SUPERVISOR: [
    'VER_DASHBOARD',
    'VER_LISTADO_GENERAL',
    'VER_DETALLES_PRESTAMO',
    'REGISTRAR_COBROS',
    'MAPA_CLIENTES',
    'REGISTRAR_GASTOS',
    'REGISTRAR_INGRESOS',
    'VER_REPORTES',
    'CREAR_CLIENTES',
    'EDITAR_CLIENTES',
    'CREAR_PRESTAMOS',
    'EDITAR_PRESTAMOS',
    'ELIMINAR_PRESTAMOS',
    'REGISTRAR_TRANSFERENCIAS',
    'VER_TRANSFERENCIAS',
    'VER_AUDITORIA',
    'REALIZAR_CIERRE_DIA',
    'VER_CIERRES_HISTORICOS',
    'SINCRONIZAR_DATOS'
  ],
  COBRADOR: [
    'VER_DASHBOARD',
    'VER_LISTADO_GENERAL',
    'VER_DETALLES_PRESTAMO',
    'REGISTRAR_COBROS',
    'MAPA_CLIENTES',
    'REGISTRAR_GASTOS',
    'VER_REPORTES',
    'CREAR_CLIENTES',
    'EDITAR_CLIENTES'
  ]
}

interface SessionUser {
  role?: string
  permissions?: Permission[]
}

interface SessionWithUser {
  user?: SessionUser
}

/**
 * Obtener lista efectiva de permisos del usuario
 */
export function getUserEffectivePermissions(session: SessionWithUser | null): Permission[] {
  if (!session?.user) return []
  if (session.user.role === 'ADMINISTRADOR') {
    return [
      'SINCRONIZAR_DATOS', 'REGISTRAR_COBROS', 'MAPA_CLIENTES', 'REGISTRAR_GASTOS',
      'REGISTRAR_INGRESOS', 'VER_REPORTES', 'VER_DASHBOARD', 'VER_LISTADO_GENERAL',
      'VER_DETALLES_PRESTAMO', 'CREAR_CLIENTES', 'EDITAR_CLIENTES', 'CREAR_PRESTAMOS',
      'EDITAR_PRESTAMOS', 'ELIMINAR_PRESTAMOS', 'REGISTRAR_TRANSFERENCIAS',
      'VER_TRANSFERENCIAS', 'GESTIONAR_USUARIOS', 'VER_AUDITORIA',
      'CONFIGURAR_SISTEMA', 'GESTIONAR_PERMISOS', 'REALIZAR_CIERRE_DIA', 'VER_CIERRES_HISTORICOS'
    ]
  }

  if (session.user.permissions && Array.isArray(session.user.permissions) && session.user.permissions.length > 0) {
    return session.user.permissions as Permission[]
  }

  const role = session.user.role || ""
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Verificar si un usuario tiene un permiso específico
 */
export function hasPermission(session: SessionWithUser | null, permission: Permission): boolean {
  if (!session?.user) return false
  
  // Los administradores tienen acceso total
  if (session.user.role === 'ADMINISTRADOR') return true
  
  const effective = getUserEffectivePermissions(session)
  return effective.includes(permission)
}

/**
 * Verificar si un usuario tiene al menos uno de los permisos especificados
 */
export function hasAnyPermission(session: SessionWithUser | null, permissions: Permission[]): boolean {
  if (!session?.user) return false
  
  // Los administradores tienen acceso total
  if (session.user.role === 'ADMINISTRADOR') return true
  
  const effective = getUserEffectivePermissions(session)
  return permissions.some(permission => effective.includes(permission))
}

/**
 * Verificar si un usuario tiene todos los permisos especificados
 */
export function hasAllPermissions(session: SessionWithUser | null, permissions: Permission[]): boolean {
  if (!session?.user) return false
  
  // Los administradores tienen acceso total
  if (session.user.role === 'ADMINISTRADOR') return true
  
  const effective = getUserEffectivePermissions(session)
  return permissions.every(permission => effective.includes(permission))
}

/**
 * Verificar límite de tiempo de uso diario
 */
export async function checkTimeLimit(userId: string): Promise<{
  allowed: boolean
  minutesUsed: number
  minutesLimit?: number
  message?: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timeLimit: true }
  })

  if (!user?.timeLimit) {
    return { allowed: true, minutesUsed: 0 }
  }

  const today = normalizeToEcuadorMidnight()

  const timeUsage = await prisma.userTimeUsage.findUnique({
    where: {
      userId_date: {
        userId,
        date: today
      }
    }
  })

  const minutesUsed = timeUsage?.minutes || 0
  const minutesLimit = user.timeLimit

  if (minutesUsed >= minutesLimit) {
    return {
      allowed: false,
      minutesUsed,
      minutesLimit,
      message: `Tiempo de uso diario agotado (${Math.floor(minutesLimit / 60)}h ${minutesLimit % 60}m)`
    }
  }

  return {
    allowed: true,
    minutesUsed,
    minutesLimit
  }
}

import { normalizeToEcuadorMidnight } from "@/lib/date-utils"

/**
 * Registrar tiempo de uso
 */
export async function recordTimeUsage(userId: string, minutes: number = 1): Promise<void> {
  const today = normalizeToEcuadorMidnight()

  await prisma.userTimeUsage.upsert({
    where: {
      userId_date: {
        userId,
        date: today
      }
    },
    update: {
      minutes: {
        increment: minutes
      },
      lastActivity: new Date()
    },
    create: {
      userId,
      date: today,
      minutes,
      lastActivity: new Date()
    }
  })
}

/**
 * Middleware para verificar permisos en server-side
 */
export async function requirePermission(permission: Permission) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    throw new Error('No autenticado')
  }

  if (!session.user.isActive) {
    throw new Error('Usuario desactivado')
  }

  if (!hasPermission(session as SessionWithUser, permission)) {
    throw new Error(`Permiso requerido: ${permission}`)
  }

  // Verificar límite de tiempo para cobradores
  if (session.user.role === 'COBRADOR') {
    const timeCheck = await checkTimeLimit(session.user.id)
    if (!timeCheck.allowed) {
      throw new Error(timeCheck.message || 'Tiempo de uso agotado')
    }
  }

  return session
}

/**
 * Middleware para verificar rol mínimo
 */
export async function requireRole(minRole: 'COBRADOR' | 'SUPERVISOR' | 'ADMINISTRADOR') {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    throw new Error('No autenticado')
  }

  if (!session.user.isActive) {
    throw new Error('Usuario desactivado')
  }

  const roleHierarchy = {
    'COBRADOR': 1,
    'SUPERVISOR': 2,
    'ADMINISTRADOR': 3
  }

  const userLevel = roleHierarchy[session.user.role]
  const requiredLevel = roleHierarchy[minRole]

  if (userLevel < requiredLevel) {
    throw new Error(`Rol insuficiente. Requerido: ${minRole}`)
  }

  return session
}

/**
 * Middleware para verificar acceso a gestión de usuarios o permisos
 */
export async function requireUserManagementPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    throw new Error('No autenticado')
  }

  if (!session.user.isActive) {
    throw new Error('Usuario desactivado')
  }

  const isAllowed = session.user.role === 'ADMINISTRADOR' ||
    hasPermission(session as SessionWithUser, 'GESTIONAR_USUARIOS') ||
    hasPermission(session as SessionWithUser, 'GESTIONAR_PERMISOS')

  if (!isAllowed) {
    throw new Error('No tienes permiso para gestionar usuarios')
  }

  return session
}


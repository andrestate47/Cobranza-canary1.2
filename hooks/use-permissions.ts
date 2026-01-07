

import { useSession } from "next-auth/react"
import { useMemo } from "react"
import { hasPermission, hasAnyPermission, hasAllPermissions, Permission } from "@/lib/permissions"

export function usePermissions() {
  const { data: session, status } = useSession()

  const permissions = useMemo(() => {
    if (!session?.user) {
      return {
        // Estado de autenticación
        isAuthenticated: false,
        isLoading: status === "loading",
        user: null,
        
        // Verificadores de permisos
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        
        // Permisos específicos (todos false si no hay sesión)
        canSyncData: false,
        canRegisterPayments: false,
        canViewMap: false,
        canRegisterExpenses: false,
        canRegisterIncome: false,
        canViewReports: false,
        canViewDashboard: false,
        canViewGeneralList: false,
        canViewLoanDetails: false,
        canCreateClients: false,
        canEditClients: false,
        canCreateLoans: false,
        canEditLoans: false,
        canDeleteLoans: false,
        canRegisterTransfers: false,
        canViewTransfers: false,
        canManageUsers: false,
        canViewAudit: false,
        canConfigureSystem: false,
        canManagePermissions: false,
        canCloseDaySession: false,
        canViewClosureHistory: false,
        
        // Verificadores de rol
        isAdmin: false,
        isSupervisor: false,
        isCobrador: false,
        
        // Información adicional
        timeLimit: null,
        supervisor: null
      }
    }

    const isAdmin = session.user.role === 'ADMINISTRADOR'
    const isSupervisor = session.user.role === 'SUPERVISOR'
    const isCobrador = session.user.role === 'COBRADOR'

    return {
      // Estado de autenticación
      isAuthenticated: true,
      isLoading: false,
      user: session.user,
      
      // Verificadores de permisos
      hasPermission: (permission: Permission) => hasPermission(session as Parameters<typeof hasPermission>[0], permission),
      hasAnyPermission: (perms: Permission[]) => hasAnyPermission(session as Parameters<typeof hasAnyPermission>[0], perms),
      hasAllPermissions: (perms: Permission[]) => hasAllPermissions(session as Parameters<typeof hasAllPermissions>[0], perms),
      
      // Permisos específicos
      canSyncData: hasPermission(session as Parameters<typeof hasPermission>[0], 'SINCRONIZAR_DATOS'),
      canRegisterPayments: hasPermission(session as Parameters<typeof hasPermission>[0], 'REGISTRAR_COBROS'),
      canViewMap: hasPermission(session as Parameters<typeof hasPermission>[0], 'MAPA_CLIENTES'),
      canRegisterExpenses: hasPermission(session as Parameters<typeof hasPermission>[0], 'REGISTRAR_GASTOS'),
      canRegisterIncome: hasPermission(session as Parameters<typeof hasPermission>[0], 'REGISTRAR_INGRESOS'),
      canViewReports: hasPermission(session as Parameters<typeof hasPermission>[0], 'VER_REPORTES'),
      canViewDashboard: hasPermission(session as Parameters<typeof hasPermission>[0], 'VER_DASHBOARD'),
      canViewGeneralList: hasPermission(session as Parameters<typeof hasPermission>[0], 'VER_LISTADO_GENERAL'),
      canViewLoanDetails: hasPermission(session as Parameters<typeof hasPermission>[0], 'VER_DETALLES_PRESTAMO'),
      canCreateClients: hasPermission(session as Parameters<typeof hasPermission>[0], 'CREAR_CLIENTES'),
      canEditClients: hasPermission(session as Parameters<typeof hasPermission>[0], 'EDITAR_CLIENTES'),
      canCreateLoans: hasPermission(session as Parameters<typeof hasPermission>[0], 'CREAR_PRESTAMOS'),
      canEditLoans: hasPermission(session as Parameters<typeof hasPermission>[0], 'EDITAR_PRESTAMOS'),
      canDeleteLoans: hasPermission(session as Parameters<typeof hasPermission>[0], 'ELIMINAR_PRESTAMOS'),
      canRegisterTransfers: hasPermission(session as Parameters<typeof hasPermission>[0], 'REGISTRAR_TRANSFERENCIAS'),
      canViewTransfers: hasPermission(session as Parameters<typeof hasPermission>[0], 'VER_TRANSFERENCIAS'),
      canManageUsers: hasPermission(session as Parameters<typeof hasPermission>[0], 'GESTIONAR_USUARIOS'),
      canViewAudit: hasPermission(session as Parameters<typeof hasPermission>[0], 'VER_AUDITORIA'),
      canConfigureSystem: hasPermission(session as Parameters<typeof hasPermission>[0], 'CONFIGURAR_SISTEMA'),
      canManagePermissions: hasPermission(session as Parameters<typeof hasPermission>[0], 'GESTIONAR_PERMISOS'),
      canCloseDaySession: hasPermission(session as Parameters<typeof hasPermission>[0], 'REALIZAR_CIERRE_DIA'),
      canViewClosureHistory: hasPermission(session as Parameters<typeof hasPermission>[0], 'VER_CIERRES_HISTORICOS'),
      
      // Verificadores de rol
      isAdmin,
      isSupervisor,
      isCobrador,
      
      // Información adicional
      timeLimit: session.user.timeLimit,
      supervisor: session.user.supervisor
    }
  }, [session, status])

  return permissions
}

export function useTimeUsage() {
  const { user } = usePermissions()
  
  const checkTimeUsage = async () => {
    if (!user?.timeLimit) return null
    
    try {
      const response = await fetch('/api/users/time-usage')
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error checking time usage:', error)
      return null
    }
  }

  const recordActivity = async () => {
    try {
      await fetch('/api/users/time-usage', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error recording activity:', error)
    }
  }

  return {
    checkTimeUsage,
    recordActivity,
    hasTimeLimit: !!user?.timeLimit,
    timeLimit: user?.timeLimit
  }
}


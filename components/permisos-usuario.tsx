"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Info, Shield, User, Crown, CheckCircle, XCircle, Settings } from "lucide-react"
import { ROLE_PERMISSIONS } from "@/lib/permissions"

interface Usuario {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  role: 'ADMINISTRADOR' | 'SUPERVISOR' | 'COBRADOR'
  isActive: boolean
  timeLimit?: number
  permissions: string[]
}

interface PermisosUsuarioProps {
  usuario: Usuario
  onSuccess: () => void
}

// Definición de permisos organizados por categorías
const CATEGORIAS_PERMISOS = [
  {
    nombre: 'Operaciones Básicas',
    descripcion: 'Permisos fundamentales para el uso diario del sistema',
    permisos: [
      { key: 'VER_DASHBOARD', label: 'Ver Dashboard', descripcion: 'Acceder al panel principal del sistema' },
      { key: 'VER_LISTADO_GENERAL', label: 'Ver Listado General', descripcion: 'Ver lista completa de clientes' },
      { key: 'VER_DETALLES_PRESTAMO', label: 'Ver Detalles de Préstamos', descripcion: 'Ver información detallada de préstamos' },
      { key: 'REGISTRAR_COBROS', label: 'Registrar Cobros', descripcion: 'Registrar pagos y cobros de clientes' },
      { key: 'MAPA_CLIENTES', label: 'Mapa de Clientes', descripcion: 'Ver ubicaciones de clientes en el mapa' },
      { key: 'REGISTRAR_GASTOS', label: 'Registrar Gastos', descripcion: 'Registrar gastos operativos diarios' }
    ]
  },
  {
    nombre: 'Gestión de Clientes',
    descripcion: 'Permisos para administrar información de clientes',
    permisos: [
      { key: 'CREAR_CLIENTES', label: 'Crear Clientes', descripcion: 'Crear nuevos registros de clientes' },
      { key: 'EDITAR_CLIENTES', label: 'Editar Clientes', descripcion: 'Modificar información de clientes existentes' }
    ]
  },
  {
    nombre: 'Gestión de Préstamos',
    descripcion: 'Permisos para administrar préstamos y operaciones relacionadas',
    permisos: [
      { key: 'CREAR_PRESTAMOS', label: 'Crear Préstamos', descripcion: 'Crear nuevos préstamos para clientes' },
      { key: 'EDITAR_PRESTAMOS', label: 'Editar Préstamos', descripcion: 'Modificar préstamos existentes' },
      { key: 'ELIMINAR_PRESTAMOS', label: 'Eliminar Préstamos', descripcion: 'Eliminar préstamos del sistema' }
    ]
  },
  {
    nombre: 'Transferencias y Pagos',
    descripcion: 'Permisos para manejar transferencias bancarias',
    permisos: [
      { key: 'REGISTRAR_TRANSFERENCIAS', label: 'Registrar Transferencias', descripcion: 'Registrar transferencias bancarias' },
      { key: 'VER_TRANSFERENCIAS', label: 'Ver Transferencias', descripcion: 'Ver histórico de transferencias' }
    ]
  },
  {
    nombre: 'Reportes y Análisis',
    descripcion: 'Permisos para acceder a reportes y estadísticas',
    permisos: [
      { key: 'VER_REPORTES', label: 'Ver Reportes', descripcion: 'Acceder a reportes y estadísticas del sistema' },
      { key: 'VER_AUDITORIA', label: 'Ver Auditoría', descripcion: 'Ver logs de actividad y auditoría' }
    ]
  },
  {
    nombre: 'Operaciones de Cierre',
    descripcion: 'Permisos para realizar cierres de día y operaciones relacionadas',
    permisos: [
      { key: 'REALIZAR_CIERRE_DIA', label: 'Realizar Cierre de Día', descripcion: 'Ejecutar proceso de cierre diario' },
      { key: 'VER_CIERRES_HISTORICOS', label: 'Ver Histórico de Cierres', descripcion: 'Ver cierres de días anteriores' }
    ]
  },
  {
    nombre: 'Sistema y Configuración',
    descripcion: 'Permisos administrativos y de configuración',
    permisos: [
      { key: 'SINCRONIZAR_DATOS', label: 'Sincronizar Datos', descripcion: 'Sincronizar información del sistema' },
      { key: 'REGISTRAR_INGRESOS', label: 'Registrar Ingresos', descripcion: 'Registrar ingresos en el sistema' }
    ]
  },
  {
    nombre: 'Administración Avanzada',
    descripcion: 'Permisos de alto nivel para administradores',
    permisos: [
      { key: 'GESTIONAR_USUARIOS', label: 'Gestionar Usuarios', descripcion: 'Crear, editar y eliminar usuarios' },
      { key: 'GESTIONAR_PERMISOS', label: 'Gestionar Permisos', descripcion: 'Asignar y modificar permisos de usuarios' },
      { key: 'CONFIGURAR_SISTEMA', label: 'Configurar Sistema', descripcion: 'Acceder a configuraciones globales del sistema' }
    ]
  }
]

export default function PermisosUsuario({ usuario, onSuccess }: PermisosUsuarioProps) {
  const [permisos, setPermisos] = useState<string[]>(usuario.permissions || [])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handlePermisoChange = (key: string, checked: boolean) => {
    if (checked) {
      setPermisos(prev => [...prev, key])
    } else {
      setPermisos(prev => prev.filter(p => p !== key))
    }
  }

  const aplicarPermisosRecomendados = () => {
    const permisosRecomendados = ROLE_PERMISSIONS[usuario.role] || []
    setPermisos(permisosRecomendados)
    toast({
      title: "Permisos aplicados",
      description: `Se aplicaron los permisos recomendados para ${usuario.role}`,
    })
  }

  const limpiarTodosLosPermisos = () => {
    setPermisos([])
    toast({
      title: "Permisos limpiados",
      description: "Se eliminaron todos los permisos del usuario",
    })
  }

  const handleGuardar = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...usuario,
          permissions: permisos
        })
      })

      if (response.ok) {
        toast({
          title: "Permisos actualizados",
          description: `Los permisos de ${usuario.name || usuario.email} se actualizaron exitosamente`,
        })
        onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar permisos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMINISTRADOR': return <Crown className="h-4 w-4" />
      case 'SUPERVISOR': return <Shield className="h-4 w-4" />
      case 'COBRADOR': return <User className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMINISTRADOR': return <Badge className="bg-rose-600 dark:bg-rose-700 text-white">Administrador</Badge>
      case 'SUPERVISOR': return <Badge className="bg-blue-600 dark:bg-blue-700 text-white">Supervisor</Badge>
      case 'COBRADOR': return <Badge className="bg-emerald-600 dark:bg-emerald-700 text-white">Cobrador</Badge>
      default: return <Badge variant="outline" className="dark:border-[#1F3A36] dark:text-gray-200">{role}</Badge>
    }
  }

  const totalPermisosDisponibles = CATEGORIAS_PERMISOS.reduce((acc, cat) => acc + cat.permisos.length, 0)
  const permisosAsignados = permisos.length
  const porcentajePermisos = Math.round((permisosAsignados / totalPermisosDisponibles) * 100)

  return (
    <div className="space-y-6">
      {/* Header del usuario */}
      <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                usuario.isActive ? 'bg-emerald-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {getRoleIcon(usuario.role)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {usuario.name || `${usuario.firstName} ${usuario.lastName}`}
                </h3>
                <p className="text-sm text-gray-600 dark:text-emerald-300/80">{usuario.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getRoleBadge(usuario.role)}
                  {!usuario.isActive && (
                    <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-500">
                      Inactivo
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-left sm:text-right">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {permisosAsignados}/{totalPermisosDisponibles}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {porcentajePermisos}% de permisos asignados
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones rápidas */}
      <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usuario.role === 'ADMINISTRADOR' ? (
            <div className="bg-blue-50 dark:bg-[#152e2a] p-4 rounded-lg border border-blue-100 dark:border-[#1F3A36]">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-900 dark:text-blue-200 font-semibold">
                  Los administradores tienen acceso total al sistema
                </span>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                No necesitan permisos específicos ya que pueden acceder a todas las funcionalidades automáticamente.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={aplicarPermisosRecomendados}
                className="flex items-center gap-2 border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
              >
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Aplicar Permisos Recomendados
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={limpiarTodosLosPermisos}
                className="flex items-center gap-2 border-gray-300 dark:border-[#1F3A36] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <XCircle className="h-4 w-4" />
                Limpiar Todos
              </Button>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Recomendado para {usuario.role}: {ROLE_PERMISSIONS[usuario.role]?.length || 0} permisos
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de permisos por categorías */}
      {usuario.role !== 'ADMINISTRADOR' && (
        <div className="grid gap-6">
          {CATEGORIAS_PERMISOS.map(categoria => (
            <Card key={categoria.nombre} className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">{categoria.nombre}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-emerald-300/80">{categoria.descripcion}</p>
                  </div>
                  <Badge variant="outline" className="dark:border-[#1F3A36] dark:text-gray-300">
                    {categoria.permisos.filter(p => permisos.includes(p.key)).length}/{categoria.permisos.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {categoria.permisos.map(permiso => (
                    <div key={permiso.key} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#152e2a] transition-colors">
                      <Checkbox
                        id={permiso.key}
                        checked={permisos.includes(permiso.key)}
                        onCheckedChange={(checked) => handlePermisoChange(permiso.key, checked as boolean)}
                        className="mt-0.5 border-gray-300 dark:border-[#1F3A36]"
                      />
                      <div className="grid gap-1 leading-none flex-1">
                        <label
                          htmlFor={permiso.key}
                          className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
                        >
                          {permiso.label}
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {permiso.descripcion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-[#1F3A36]">
        <Button
          variant="outline"
          onClick={onSuccess}
          className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
        >
          Cancelar
        </Button>
        
        {usuario.role !== 'ADMINISTRADOR' && (
          <Button
            onClick={handleGuardar}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Guardar Permisos
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

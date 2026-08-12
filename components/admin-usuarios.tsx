"use client"

import { useState, useEffect } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  Clock,
  Users,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Crown,
  User,
  Settings,
  FileText
} from "lucide-react"
import FormularioUsuario from "@/components/formulario-usuario"
import PermisosUsuario from "@/components/permisos-usuario"

interface Usuario {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  role: 'ADMINISTRADOR' | 'SUPERVISOR' | 'COBRADOR'
  isActive: boolean
  timeLimit?: number
  lastLogin?: string
  createdAt: string
  supervisor?: {
    id: string
    name: string
    email: string
  }
  supervisados?: Array<{
    id: string
    name: string
    email: string
  }>
  documentoIdentificacion?: string
  profilePhoto?: string
  permissions: string[]
  // Campos de contacto y ubicación
  phone?: string
  phoneReferencial?: string
  address?: string
  pais?: string
  ciudad?: string
  ubicacion?: string
  mapLink?: string
  referenciaFamiliar?: string
  referenciaTrabajo?: string
  stats?: {
    prestamos: number
    pagos: number
    gastos: number
  }
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [documentToView, setDocumentToView] = useState<string | null>(null)
  const { isAdmin, isAuthenticated, canManageUsers, canManagePermissions } = usePermissions()
  const { toast } = useToast()

  const hasAccess = isAuthenticated && (isAdmin || canManageUsers || canManagePermissions)

  // Redirigir si no tiene permisos
  if (!hasAccess) {
    return (
      <div className="text-center p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl">
        <Shield className="mx-auto h-12 w-12 text-rose-500 dark:text-rose-400 mb-4" />
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Acceso Denegado</h3>
        <p className="text-rose-600 dark:text-rose-400">No tienes los permisos requeridos para acceder a la gestión de usuarios</p>
      </div>
    )
  }

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/usuarios')
      if (response.ok) {
        const data = await response.json()
        setUsuarios(data)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al cargar usuarios",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Error de conexión al cargar usuarios",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const usuario = usuarios.find(u => u.id === userId)
      if (!usuario) return

      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...usuario,
          isActive: !isActive
        })
      })

      if (response.ok) {
        toast({
          title: isActive ? "Usuario desactivado" : "Usuario activado",
          description: `${usuario.name || usuario.email} ${isActive ? 'desactivado' : 'activado'} exitosamente`,
        })
        fetchUsuarios()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cambiar estado del usuario",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Usuario eliminado",
          description: "El usuario ha sido eliminado exitosamente",
        })
        fetchUsuarios()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar usuario",
        variant: "destructive"
      })
    }
  }

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = !searchTerm || 
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${usuario.firstName} ${usuario.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = selectedRole === "all" || usuario.role === selectedRole
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && usuario.isActive) ||
      (selectedStatus === "inactive" && !usuario.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{usuarios.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">Administradores</CardTitle>
            <Crown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {usuarios.filter(u => u.role === 'ADMINISTRADOR').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">Supervisores</CardTitle>
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {usuarios.filter(u => u.role === 'SUPERVISOR').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cobradores</CardTitle>
            <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {usuarios.filter(u => u.role === 'COBRADOR').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-[#1F3A36] bg-white dark:bg-[#152e2a] text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="all">Todos los roles</option>
                <option value="ADMINISTRADOR">Administradores</option>
                <option value="SUPERVISOR">Supervisores</option>
                <option value="COBRADOR">Cobradores</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-[#1F3A36] bg-white dark:bg-[#152e2a] text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium w-full lg:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                <div className="p-6 overflow-y-auto max-h-[95vh]">
                  <DialogHeader className="mb-4 border-b border-gray-200 dark:border-[#1F3A36] pb-3">
                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Crear Nuevo Usuario</DialogTitle>
                  </DialogHeader>
                  <FormularioUsuario
                    onSuccess={() => {
                      setShowCreateModal(false)
                      fetchUsuarios()
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <div className="grid gap-4">
        {filteredUsuarios.length === 0 ? (
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
            <CardContent className="pt-6 text-center py-12">
              <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No se encontraron usuarios</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? "Intenta con otros términos de búsqueda" : "Crea tu primer usuario para comenzar"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsuarios.map(usuario => (
            <Card 
              key={usuario.id} 
              className={`transition-all duration-200 border-gray-200 dark:border-[#1F3A36] ${
                !usuario.isActive 
                  ? 'opacity-60 bg-gray-100 dark:bg-[#122421]' 
                  : 'bg-white dark:bg-[#0E1F1C] hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                      usuario.isActive ? 'bg-emerald-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {usuario.profilePhoto ? (
                        <img src={usuario.profilePhoto} alt={usuario.name || "Perfil"} className="w-full h-full object-cover" />
                      ) : (
                        getRoleIcon(usuario.role)
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                          {usuario.name || `${usuario.firstName} ${usuario.lastName}`}
                        </h3>
                        {getRoleBadge(usuario.role)}
                        {!usuario.isActive && (
                          <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-500 dark:border-rose-400">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 dark:text-emerald-300/80 mb-2 text-sm">{usuario.email}</p>
                      
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-300">
                        {usuario.supervisor && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5 text-blue-500" />
                            Supervisor: <strong className="text-gray-700 dark:text-gray-200">{usuario.supervisor.name}</strong>
                          </span>
                        )}
                        
                        {usuario.timeLimit && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            {Math.floor(usuario.timeLimit / 60)}h {usuario.timeLimit % 60}m/día
                          </span>
                        )}
                        
                        {usuario.supervisados && usuario.supervisados.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-emerald-500" />
                            {usuario.supervisados.length} supervisado{usuario.supervisados.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1">
                          <Settings className="h-3.5 w-3.5 text-purple-500" />
                          {usuario.permissions.length} permiso{usuario.permissions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {usuario.stats && (
                        <div className="flex gap-4 text-xs text-gray-400 dark:text-gray-500 mt-2">
                          <span>{usuario.stats.prestamos} préstamos</span>
                          <span>{usuario.stats.pagos} pagos</span>
                          <span>{usuario.stats.gastos} gastos</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleUserStatus(usuario.id, usuario.isActive)}
                      className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                    >
                      {usuario.isActive ? <EyeOff className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" /> : <Eye className="h-4 w-4 mr-1 text-emerald-600 dark:text-emerald-400" />}
                      {usuario.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(usuario)
                        setShowPermissionsModal(true)
                      }}
                      className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                    >
                      <Shield className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
                      Permisos
                    </Button>
                    
                    {usuario.documentoIdentificacion && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentToView(usuario.documentoIdentificacion || null)}
                        title="Ver Documento"
                        className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                      >
                        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(usuario)
                        setShowEditModal(true)
                      }}
                      className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                    >
                      <Edit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(usuario.id)}
                      className="border-gray-300 dark:border-[#1F3A36] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de edición */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
          <div className="p-6 overflow-y-auto max-h-[95vh]">
            <DialogHeader className="mb-4 border-b border-gray-200 dark:border-[#1F3A36] pb-3">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Editar Usuario</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <FormularioUsuario
                usuario={selectedUser}
                onSuccess={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                  fetchUsuarios()
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de permisos */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
          <div className="p-6 overflow-y-auto max-h-[95vh]">
            <DialogHeader className="mb-4 border-b border-gray-200 dark:border-[#1F3A36] pb-3">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Gestionar Permisos</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <PermisosUsuario
                usuario={selectedUser}
                onSuccess={() => {
                  setShowPermissionsModal(false)
                  setSelectedUser(null)
                  fetchUsuarios()
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para ver documento */}
      <Dialog open={!!documentToView} onOpenChange={(open) => !open && setDocumentToView(null)}>
        <DialogContent className="max-w-3xl bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
          <DialogHeader className="border-b border-gray-200 dark:border-[#1F3A36] pb-3">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Documento de Identificación</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center p-4">
            {documentToView && documentToView.startsWith('data:image') ? (
              <img src={documentToView} alt="Documento" className="max-w-full max-h-[70vh] object-contain rounded-md shadow-sm" />
            ) : documentToView === 'pdf' ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400">Documento PDF guardado</div>
            ) : documentToView ? (
               <img src={documentToView} alt="Documento" className="max-w-full max-h-[70vh] object-contain rounded-md shadow-sm" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

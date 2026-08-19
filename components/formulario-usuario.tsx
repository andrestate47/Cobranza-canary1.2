

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, Info, Upload, X, FileText, User } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ROLE_PERMISSIONS } from "@/lib/permissions"
// MapLocationPicker eliminado - ahora se usa un simple link de Google Maps

interface Usuario {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  role: 'ADMINISTRADOR' | 'SUPERVISOR' | 'COBRADOR'
  isActive: boolean
  timeLimit?: number
  phone?: string
  phoneReferencial?: string
  address?: string
  pais?: string
  ciudad?: string
  ubicacion?: string
  mapLink?: string
  referenciaFamiliar?: string
  referenciaTrabajo?: string
  documentoIdentificacion?: string
  profilePhoto?: string
  supervisor?: {
    id: string
    name: string
    email: string
  }
  permissions: string[]
}

interface Supervisor {
  id: string
  name: string
  email: string
  role: string
  supervisados: number
}

interface FormularioUsuarioProps {
  usuario?: Usuario
  onSuccess: () => void
}

const PERMISOS_BASICOS = [
  { key: 'VER_DASHBOARD', label: 'Ver Dashboard', description: 'Acceder al panel principal' },
  { key: 'VER_LISTADO_GENERAL', label: 'Ver Listado General', description: 'Ver lista de clientes' },
  { key: 'VER_DETALLES_PRESTAMO', label: 'Ver Detalles de Préstamos', description: 'Ver información detallada' },
  { key: 'REGISTRAR_COBROS', label: 'Registrar Cobros', description: 'Registrar pagos de clientes' },
  { key: 'MAPA_CLIENTES', label: 'Mapa de Clientes', description: 'Ver ubicaciones en mapa' },
  { key: 'REGISTRAR_GASTOS', label: 'Registrar Gastos', description: 'Registrar gastos operativos' },
  { key: 'REGISTRAR_INGRESOS', label: 'Registrar Ingresos', description: 'Registrar ingresos en el sistema' }
]

const PERMISOS_GESTION = [
  { key: 'CREAR_CLIENTES', label: 'Crear Clientes', description: 'Crear nuevos clientes' },
  { key: 'EDITAR_CLIENTES', label: 'Editar Clientes', description: 'Modificar información de clientes' },
  { key: 'CREAR_PRESTAMOS', label: 'Crear Préstamos', description: 'Crear nuevos préstamos' },
  { key: 'EDITAR_PRESTAMOS', label: 'Editar Préstamos', description: 'Modificar préstamos existentes' },
  { key: 'ELIMINAR_PRESTAMOS', label: 'Eliminar Préstamos', description: 'Eliminar préstamos del sistema' },
  { key: 'REGISTRAR_TRANSFERENCIAS', label: 'Registrar Transferencias', description: 'Registrar transferencias bancarias' },
  { key: 'VER_TRANSFERENCIAS', label: 'Ver Transferencias', description: 'Ver histórico de transferencias' }
]

const PERMISOS_AVANZADOS = [
  { key: 'VER_REPORTES', label: 'Ver Reportes', description: 'Acceder a reportes y estadísticas' },
  { key: 'VER_AUDITORIA', label: 'Ver Auditoría', description: 'Ver logs de actividad' },
  { key: 'REALIZAR_CIERRE_DIA', label: 'Cierre de Día', description: 'Realizar cierre diario' },
  { key: 'VER_CIERRES_HISTORICOS', label: 'Ver Histórico de Cierres', description: 'Ver cierres anteriores' },
  { key: 'SINCRONIZAR_DATOS', label: 'Sincronizar Datos', description: 'Sincronización de información' }
]

const PERMISOS_ADMIN = [
  { key: 'GESTIONAR_USUARIOS', label: 'Gestionar Usuarios', description: 'Crear y editar usuarios' },
  { key: 'GESTIONAR_PERMISOS', label: 'Gestionar Permisos', description: 'Asignar permisos a usuarios' },
  { key: 'CONFIGURAR_SISTEMA', label: 'Configurar Sistema', description: 'Configuraciones globales' }
]

export default function FormularioUsuario({ usuario, onSuccess }: FormularioUsuarioProps) {
  const [formData, setFormData] = useState({
    email: usuario?.email || '',
    password: '',
    confirmPassword: '',
    firstName: usuario?.firstName || '',
    lastName: usuario?.lastName || '',
    role: usuario?.role || 'COBRADOR',
    isActive: usuario?.isActive ?? true,
    timeLimit: usuario?.timeLimit?.toString() || '',
    supervisorId: usuario?.supervisor?.id || '',
    phone: usuario?.phone || '',
    phoneReferencial: usuario?.phoneReferencial || '',
    address: usuario?.address || '',
    pais: usuario?.pais || '',
    ciudad: usuario?.ciudad || '',
    ubicacion: usuario?.ubicacion || '',
    mapLink: usuario?.mapLink || '',
    referenciaFamiliar: usuario?.referenciaFamiliar || '',
    referenciaTrabajo: usuario?.referenciaTrabajo || '',
    permissions: usuario?.permissions || []
  })

  const [supervisores, setSupervisores] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [documentoFile, setDocumentoFile] = useState<File | null>(null)
  const [documentoPreview, setDocumentoPreview] = useState<string | null>(
    usuario?.documentoIdentificacion || null
  )
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    usuario?.profilePhoto || null
  )
  const { toast } = useToast()

  const isEditing = !!usuario

  useEffect(() => {
    fetchSupervisores()
  }, [])

  const fetchSupervisores = async () => {
    try {
      const response = await fetch('/api/admin/supervisores')
      if (response.ok) {
        const data = await response.json()
        setSupervisores(data)
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error)
    }
  }

  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos de imagen (JPG, PNG, WEBP) o PDF",
          variant: "destructive"
        })
        return
      }

      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El archivo debe ser menor a 5MB",
          variant: "destructive"
        })
        return
      }

      setDocumentoFile(file)
      
      // Crear preview si es imagen
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setDocumentoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setDocumentoPreview('pdf')
      }
    }
  }

  const removeDocumento = () => {
    setDocumentoFile(null)
    setDocumentoPreview(usuario?.documentoIdentificacion || null)
  }

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "Solo se permiten archivos de imagen", variant: "destructive" })
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "La foto debe ser menor a 5MB", variant: "destructive" })
        return
      }
      setProfilePhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setProfilePhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeProfilePhoto = () => {
    setProfilePhotoFile(null)
    setProfilePhotoPreview(usuario?.profilePhoto || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones
    if (!formData.email.trim()) {
      toast({
        title: "Error",
        description: "El email es obligatorio",
        variant: "destructive"
      })
      return
    }

    if (!isEditing && !formData.password) {
      toast({
        title: "Error",
        description: "La contraseña es obligatoria",
        variant: "destructive"
      })
      return
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive"
      })
      return
    }

    if (formData.password && formData.password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const url = isEditing ? `/api/admin/usuarios/${usuario.id}` : '/api/admin/usuarios'
      const method = isEditing ? 'PUT' : 'POST'

      // Si hay archivo, usar FormData
      if (documentoFile || profilePhotoFile) {
        const formDataToSend = new FormData()
        formDataToSend.append('email', formData.email.trim())
        formDataToSend.append('firstName', formData.firstName.trim())
        formDataToSend.append('lastName', formData.lastName.trim())
        formDataToSend.append('name', `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim())
        formDataToSend.append('role', formData.role)
        formDataToSend.append('isActive', formData.isActive.toString())
        formDataToSend.append('timeLimit', formData.timeLimit || '')
        formDataToSend.append('supervisorId', formData.supervisorId || '')
        formDataToSend.append('phone', formData.phone || '')
        formDataToSend.append('phoneReferencial', formData.phoneReferencial || '')
        formDataToSend.append('address', formData.address || '')
        formDataToSend.append('pais', formData.pais || '')
        formDataToSend.append('ciudad', formData.ciudad || '')
        formDataToSend.append('ubicacion', formData.ubicacion || '')
        formDataToSend.append('mapLink', formData.mapLink || '')
        formDataToSend.append('referenciaFamiliar', formData.referenciaFamiliar || '')
        formDataToSend.append('referenciaTrabajo', formData.referenciaTrabajo || '')
        formDataToSend.append('permissions', JSON.stringify(formData.permissions))
        if (formData.password) {
          formDataToSend.append('password', formData.password)
        }
        if (documentoFile) formDataToSend.append('documentoFile', documentoFile)
        if (profilePhotoFile) formDataToSend.append('profilePhotoFile', profilePhotoFile)

        const response = await fetch(url, {
          method,
          body: formDataToSend
        })

        if (response.ok) {
          toast({
            title: isEditing ? "Usuario actualizado" : "Usuario creado",
            description: `El usuario ${formData.email} ha sido ${isEditing ? 'actualizado' : 'creado'} exitosamente`,
          })
          onSuccess()
        } else {
          const error = await response.json()
          throw new Error(error.error)
        }
      } else {
        // Sin archivo, usar JSON
        const payload = {
          email: formData.email.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          role: formData.role,
          isActive: formData.isActive,
          timeLimit: formData.timeLimit ? parseInt(formData.timeLimit) : null,
          supervisorId: formData.supervisorId || null,
          phone: formData.phone || null,
          phoneReferencial: formData.phoneReferencial || null,
          address: formData.address || null,
          pais: formData.pais || null,
          ciudad: formData.ciudad || null,
          ubicacion: formData.ubicacion || null,
          mapLink: formData.mapLink || null,
          referenciaFamiliar: formData.referenciaFamiliar || null,
          referenciaTrabajo: formData.referenciaTrabajo || null,
          permissions: formData.permissions,
          ...(formData.password && { password: formData.password })
        }

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          toast({
            title: isEditing ? "Usuario actualizado" : "Usuario creado",
            description: `El usuario ${formData.email} ha sido ${isEditing ? 'actualizado' : 'creado'} exitosamente`,
          })
          onSuccess()
        } else {
          const error = await response.json()
          throw new Error(error.error)
        }
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la solicitud",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }))
  }

  const getPermisosRecomendados = (role: string) => {
    return ROLE_PERMISSIONS[role] || []
  }

  const aplicarPermisosRecomendados = () => {
    const permisos = getPermisosRecomendados(formData.role)
    setFormData(prev => ({
      ...prev,
      permissions: permisos
    }))
  }

  const renderPermissionGroup = (title: string, permissions: typeof PERMISOS_BASICOS) => (
    <div key={title} className="space-y-3">
      <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
      <div className="grid grid-cols-1 gap-3">
        {permissions.map(permission => (
          <div key={permission.key} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#152e2a] transition-colors">
            <Checkbox
              id={permission.key}
              checked={formData.permissions.includes(permission.key)}
              onCheckedChange={(checked) => handlePermissionChange(permission.key, checked as boolean)}
              disabled={formData.role === 'ADMINISTRADOR'}
              className="mt-0.5 border-gray-300 dark:border-[#1F3A36]"
            />
            <div className="grid gap-1 leading-none flex-1">
              <label
                htmlFor={permission.key}
                className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {permission.label}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {permission.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información básica */}
      <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white font-bold">Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar / Profile Photo */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative group">
              <div className={`w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center ${profilePhotoPreview ? 'border-emerald-500' : 'border-dashed border-gray-300 dark:border-[#1F3A36] bg-gray-50 dark:bg-[#152e2a]'}`}>
                {profilePhotoPreview ? (
                  <img src={profilePhotoPreview} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <label htmlFor="profilePhotoInput" className="absolute bottom-0 right-0 bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-full cursor-pointer transition-colors shadow-sm">
                <Upload className="h-4 w-4" />
              </label>
              <input id="profilePhotoInput" type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
            </div>
            {profilePhotoPreview && profilePhotoPreview !== usuario?.profilePhoto && (
               <button type="button" onClick={removeProfilePhoto} className="text-xs text-rose-500 mt-2 hover:underline">
                 Quitar foto seleccionada
               </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-200 font-medium">Nombre</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Nombre"
                required
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-200 font-medium">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Apellido"
                required
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 dark:text-gray-200 font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              required
              className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pais" className="text-gray-700 dark:text-gray-200 font-medium">País</Label>
              <Input
                id="pais"
                value={formData.pais}
                onChange={(e) => setFormData(prev => ({ ...prev, pais: e.target.value }))}
                placeholder="Ej: Colombia"
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ciudad" className="text-gray-700 dark:text-gray-200 font-medium">Ciudad</Label>
              <Input
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                placeholder="Ej: Bogotá"
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ubicacion" className="text-gray-700 dark:text-gray-200 font-medium">Ubicación</Label>
              <Input
                id="ubicacion"
                value={formData.ubicacion}
                onChange={(e) => setFormData(prev => ({ ...prev, ubicacion: e.target.value }))}
                placeholder="Ej: Zona Norte"
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Link de Google Maps */}
          <div className="space-y-2">
            <Label htmlFor="mapLink" className="text-gray-700 dark:text-gray-200 font-medium">Link de Google Maps (opcional)</Label>
            <Input
              id="mapLink"
              value={formData.mapLink}
              onChange={(e) => setFormData(prev => ({ ...prev, mapLink: e.target.value }))}
              placeholder="https://maps.app.goo.gl/..."
              className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Comparte una ubicación desde Google Maps en tu teléfono y pega el link aquí
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 dark:text-gray-200 font-medium">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1234567890"
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneReferencial" className="text-gray-700 dark:text-gray-200 font-medium">Teléfono Referencial</Label>
              <Input
                id="phoneReferencial"
                type="tel"
                value={formData.phoneReferencial}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneReferencial: e.target.value }))}
                placeholder="+1234567890"
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-700 dark:text-gray-200 font-medium">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Dirección completa"
              rows={2}
              className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenciaFamiliar" className="text-gray-700 dark:text-gray-200 font-medium">Referencia Familiar</Label>
            <Textarea
              id="referenciaFamiliar"
              value={formData.referenciaFamiliar}
              onChange={(e) => setFormData(prev => ({ ...prev, referenciaFamiliar: e.target.value }))}
              placeholder="Nombre y teléfono del familiar de referencia"
              rows={2}
              className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenciaTrabajo" className="text-gray-700 dark:text-gray-200 font-medium">Referencia de Trabajo</Label>
            <Textarea
              id="referenciaTrabajo"
              value={formData.referenciaTrabajo}
              onChange={(e) => setFormData(prev => ({ ...prev, referenciaTrabajo: e.target.value }))}
              placeholder="Lugar de trabajo y contacto"
              rows={2}
              className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentoIdentificacion" className="text-gray-700 dark:text-gray-200 font-medium">Documento de Identificación</Label>
            <div className="space-y-2">
              {/* Área de subida de archivo */}
              <div className="border-2 border-dashed border-gray-300 dark:border-[#1F3A36] bg-gray-50/50 dark:bg-[#152e2a]/50 rounded-lg p-4 hover:border-emerald-500 transition-colors">
                <input
                  id="documentoIdentificacion"
                  type="file"
                  onChange={handleDocumentoChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <label
                  htmlFor="documentoIdentificacion"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Click para subir documento de identificación
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Formatos: JPG, PNG, PDF (Máx. 5MB)
                  </span>
                </label>
              </div>

              {/* Preview del archivo */}
              {documentoPreview && (
                <div className="relative border border-gray-200 dark:border-[#1F3A36] rounded-lg p-3 bg-gray-50 dark:bg-[#152e2a]">
                  <button
                    type="button"
                    onClick={removeDocumento}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  {documentoPreview === 'pdf' ? (
                    <div className="flex items-center space-x-2">
                      <FileText className="h-8 w-8 text-rose-500" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Documento PDF</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {documentoFile?.name || 'Documento guardado'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-video rounded overflow-hidden">
                      <img
                        src={documentoPreview}
                        alt="Preview del documento"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-200 font-medium">
                {isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required={!isEditing}
                  className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-200 font-medium">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  required={!isEditing && !!formData.password}
                  className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de rol y permisos */}
      <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white font-bold">Rol y Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-200 font-medium">Rol del Usuario</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  const newRole = value as 'ADMINISTRADOR' | 'SUPERVISOR' | 'COBRADOR'
                  setFormData(prev => ({
                    ...prev,
                    role: newRole,
                    permissions: ROLE_PERMISSIONS[newRole] || [],
                    supervisorId: newRole !== 'COBRADOR' ? '' : prev.supervisorId
                  }))
                }}
              >
                <SelectTrigger className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                  <SelectItem value="COBRADOR">Cobrador</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'COBRADOR' && (
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-200 font-medium">Supervisor Asignado</Label>
                <Select
                  value={formData.supervisorId || "no-supervisor"}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    supervisorId: value === "no-supervisor" ? "" : value 
                  }))}
                >
                  <SelectTrigger className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar supervisor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectItem value="no-supervisor">Sin supervisor</SelectItem>
                    {supervisores.map(supervisor => (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
                        {supervisor.name} ({supervisor.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeLimit" className="text-gray-700 dark:text-gray-200 font-medium">Límite de Tiempo (minutos/día)</Label>
              <Input
                id="timeLimit"
                type="number"
                min="0"
                max="1440"
                value={formData.timeLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: e.target.value }))}
                placeholder="480 (8 horas)"
                className="bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Dejar vacío para sin límite. Máximo 1440 minutos (24 horas).
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-200 font-medium">Estado del Usuario</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
                  className="border-gray-300 dark:border-[#1F3A36]"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer">
                  Usuario activo
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Los usuarios inactivos no pueden iniciar sesión.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permisos */}
      <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-900 dark:text-white font-bold">Permisos del Usuario</CardTitle>
          {formData.role !== 'ADMINISTRADOR' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={aplicarPermisosRecomendados}
              className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
            >
              Aplicar Permisos Recomendados
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {formData.role === 'ADMINISTRADOR' ? (
            <div className="bg-blue-50 dark:bg-[#152e2a] p-4 rounded-lg border border-blue-100 dark:border-[#1F3A36]">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-900 dark:text-blue-200 font-semibold">
                  Los administradores tienen acceso total al sistema
                </span>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                No necesitan permisos específicos ya que pueden acceder a todas las funcionalidades.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {renderPermissionGroup("Permisos Básicos", PERMISOS_BASICOS)}
              {renderPermissionGroup("Gestión de Datos", PERMISOS_GESTION)}
              {renderPermissionGroup("Permisos Avanzados", PERMISOS_AVANZADOS)}
              {renderPermissionGroup("Permisos Administrativos", PERMISOS_ADMIN)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-[#1F3A36]">
        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Actualizando...' : 'Creando...'}
            </>
          ) : (
            <>
              {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}



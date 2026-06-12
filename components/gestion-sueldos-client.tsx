
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  Settings, 
  DollarSign, 
  Eye,
  UserCheck,
  Calculator,
  Calendar,
  AlertCircle,
  Home,
  ArrowLeft,
  Trash2
} from "lucide-react"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface ConfiguracionSueldo {
  id: string
  userId: string
  salarioBase: string
  comisionPorCobro: string
  limitePorcentajeAvance: number
  montoMinimoAvance: string
  activo: boolean
  usuario: User
  createdAt: string
  updatedAt: string
}

interface PagoSueldo {
  id: string
  cobradorId: string
  pagadorId: string
  tipo: string
  periodo?: string
  montoBase: string
  montoComisiones: string
  montoTotal: string
  montoAvances: string
  montoFinal: string
  estado: string
  observaciones?: string
  fechaPago?: string
  metodoPago?: string
  cobrador: User
  pagador: User
  createdAt: string
  updatedAt: string
}

export default function GestionSueldosClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionSueldo[]>([])
  const [pagos, setPagos] = useState<PagoSueldo[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'configuraciones' | 'pagos'>('configuraciones')
  
  // Generar lista de meses para el filtro
  const generateMeses = () => {
    const meses = []
    const now = new Date()
    for (let i = -6; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
      meses.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return meses
  }
  const mesesOptions = generateMeses()
  
  const [periodoFiltro, setPeriodoFiltro] = useState(mesesOptions[6].value) // Mes actual

  // Estados para modales
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [showComisionModal, setShowComisionModal] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<ConfiguracionSueldo | null>(null)
  const [selectedUser, setSelectedUser] = useState<string>("")

  // Estados para formularios
  const [configForm, setConfigForm] = useState({
    userId: "",
    salarioBase: "",
    comisionPorCobro: "",
    limitePorcentajeAvance: "50",
    montoMinimoAvance: "0"
  })

  const [pagoForm, setPagoForm] = useState({
    cobradorId: "",
    tipo: "SUELDO",
    periodo: "",
    montoBase: "",
    montoComisiones: "",
    montoTotal: "",
    montoAvances: "",
    montoFinal: "",
    observaciones: "",
    metodoPago: "EFECTIVO"
  })

  interface DetalleCobro {
    fecha: string
    cliente: string
    monto: number
    comision: number
  }

  interface ComisionData {
    sueldo: {
      salarioBase: number
      comisiones: number
      total: number
    }
    cobros: {
      cantidadCobros: number
    }
    avances: {
      disponible: number
      puedeAvanzar: boolean
    }
    configuracion: {
      montoMinimoAvance: number
    }
    detalleCobros: DetalleCobro[]
  }

  const [comisionData, setComisionData] = useState<ComisionData | null>(null)
  const [mesComision, setMesComision] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    if (session?.user) {
      cargarDatos()
    }
  }, [session, periodoFiltro])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Cargar configuraciones
      const configRes = await fetch('/api/sueldos/configuracion')
      if (configRes.ok) {
        const configs = await configRes.json()
        setConfiguraciones(configs)
      }

      // Cargar pagos
      const pagosUrl = periodoFiltro ? `/api/sueldos/pagos?periodo=${periodoFiltro}` : '/api/sueldos/pagos'
      const pagosRes = await fetch(pagosUrl)
      if (pagosRes.ok) {
        const pagosData = await pagosRes.json()
        setPagos(pagosData)
      }

      // Cargar usuarios (cobradores)
      const usuariosRes = await fetch('/api/usuarios')
      if (usuariosRes.ok) {
        const usuariosData = await usuariosRes.json()
        setUsuarios(usuariosData.filter((u: User) => u.role === 'COBRADOR'))
      }

    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      const url = selectedConfig 
        ? `/api/sueldos/configuracion/${selectedConfig.id}` 
        : '/api/sueldos/configuracion'
      
      const method = selectedConfig ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      })

      if (response.ok) {
        toast.success(selectedConfig ? 'Configuración actualizada' : 'Configuración creada')
        setShowConfigModal(false)
        setSelectedConfig(null)
        resetConfigForm()
        cargarDatos()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al guardar configuración')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar configuración')
    }
  }

  const handleDeleteConfig = async (id: string) => {
    try {
      const response = await fetch(`/api/sueldos/configuracion/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Configuración eliminada')
        cargarDatos()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al eliminar configuración')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar configuración')
    }
  }

  const handleSavePago = async () => {
    try {
      console.log('[handleSavePago] Enviando pagoForm:', JSON.stringify(pagoForm))
      const response = await fetch('/api/sueldos/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagoForm)
      })

      if (response.ok) {
        toast.success('Pago registrado correctamente')
        setShowPagoModal(false)
        resetPagoForm()
        cargarDatos()
      } else {
        const errorData = await response.json()
        console.error('[handleSavePago] Error del servidor:', errorData)
        toast.error(errorData.error || 'Error al registrar pago', { duration: 6000 })
      }
    } catch (error) {
      console.error('[handleSavePago] Error de red:', error)
      toast.error('Error al registrar pago')
    }
  }

  const handleEstadoPago = async (pagoId: string, nuevoEstado: string) => {
    try {
      const response = await fetch(`/api/sueldos/pagos/${pagoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      })

      if (response.ok) {
        toast.success('Estado actualizado')
        cargarDatos()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al actualizar estado')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar estado')
    }
  }

  const handleDeletePago = async (pagoId: string) => {
    try {
      const response = await fetch(`/api/sueldos/pagos/${pagoId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Pago eliminado correctamente')
        cargarDatos()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al eliminar pago')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar pago')
    }
  }

  const cargarComisiones = async (userId: string, mes: string) => {
    try {
      const response = await fetch(`/api/sueldos/comisiones/${userId}?mes=${mes}`)
      if (response.ok) {
        const data = await response.json()
        setComisionData(data)
      } else {
        toast.error('Error al cargar comisiones')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar comisiones')
    }
  }

  const resetConfigForm = () => {
    setConfigForm({
      userId: "",
      salarioBase: "",
      comisionPorCobro: "",
      limitePorcentajeAvance: "50",
      montoMinimoAvance: "0"
    })
  }

  const resetPagoForm = () => {
    setPagoForm({
      cobradorId: "",
      tipo: "SUELDO",
      periodo: "",
      montoBase: "",
      montoComisiones: "",
      montoTotal: "",
      montoAvances: "",
      montoFinal: "",
      observaciones: "",
      metodoPago: "EFECTIVO"
    })
  }

  const editarConfig = (config: ConfiguracionSueldo) => {
    setSelectedConfig(config)
    setConfigForm({
      userId: config.userId,
      salarioBase: config.salarioBase,
      comisionPorCobro: config.comisionPorCobro,
      limitePorcentajeAvance: config.limitePorcentajeAvance.toString(),
      montoMinimoAvance: config.montoMinimoAvance
    })
    setShowConfigModal(true)
  }

  const abrirModalComisiones = (userId: string) => {
    setSelectedUser(userId)
    setShowComisionModal(true)
    cargarComisiones(userId, mesComision)
  }

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDIENTE: "outline",
      PAGADO: "default",
      CANCELADO: "secondary",
      RECHAZADO: "destructive"
    }
    return <Badge variant={variants[estado] || "outline"}>{estado}</Badge>
  }

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      SUELDO: "bg-blue-500",
      AVANCE: "bg-yellow-500",
      COMISION_EXTRA: "bg-green-500",
      DESCUENTO: "bg-red-500"
    }
    return (
      <Badge className={`${colors[tipo] || "bg-gray-500"} text-white`}>
        {tipo.replace('_', ' ')}
      </Badge>
    )
  }

  if (loading) {
    return <div className="p-6 text-center">Cargando...</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Botón de regreso */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground pl-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel
        </Button>
      </div>

      {/* Encabezado Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Gestión de Sueldos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra los salarios, comisiones y adelantos de los cobradores del sistema.
          </p>
        </div>
        
        {/* Selector de Pestañas Estilo Segmented Control */}
        <div className="flex p-1 bg-gray-100 rounded-lg w-full lg:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('configuraciones')}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all duration-200 flex-1 lg:flex-initial ${
              activeTab === 'configuraciones'
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuraciones de Sueldo
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all duration-200 flex-1 lg:flex-initial ${
              activeTab === 'pagos'
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Historial de Pagos
          </button>
        </div>
      </div>

      {activeTab === 'configuraciones' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Configuraciones de Sueldo</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Define el salario base, comisiones por cobro y límites de adelantos por cada cobrador.
              </p>
            </div>
            <Button onClick={() => setShowConfigModal(true)} className="w-full sm:w-auto shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Configuración
            </Button>
          </div>

          {/* VISTA ESCRITORIO: Tabla */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Cobrador</TableHead>
                      <TableHead>Salario Base</TableHead>
                      <TableHead>Comisión %</TableHead>
                      <TableHead>Límite Avance %</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="pr-6 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configuraciones.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="pl-6">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {config.usuario.firstName} {config.usuario.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {config.usuario.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${parseFloat(config.salarioBase).toLocaleString()}
                        </TableCell>
                        <TableCell>{config.comisionPorCobro}%</TableCell>
                        <TableCell>{config.limitePorcentajeAvance}%</TableCell>
                        <TableCell>
                          <Badge variant={config.activo ? "default" : "secondary"}>
                            {config.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editarConfig(config)}
                              title="Editar Configuración"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalComisiones(config.userId)}
                              title="Calcular Comisiones/Avances"
                            >
                              <Calculator className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-55 border-red-200"
                                  title="Eliminar Configuración"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[95vw] max-w-md rounded-lg">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar configuración?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará la configuración de sueldo de este cobrador permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                  <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteConfig(config.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* VISTA MÓVIL: Tarjetas */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {configuraciones.map((config) => (
              <Card key={config.id} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-4">
                  {/* Cabecera de la Tarjeta */}
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <div className="font-bold text-gray-900 text-base">
                        {config.usuario.firstName} {config.usuario.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {config.usuario.email}
                      </div>
                    </div>
                    <Badge variant={config.activo ? "default" : "secondary"}>
                      {config.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  
                  {/* Detalles en Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Salario Base</span>
                      <span className="font-semibold text-gray-800">${parseFloat(config.salarioBase).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Comisión por Cobro</span>
                      <span className="font-semibold text-gray-800">{config.comisionPorCobro}%</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Límite Avance</span>
                      <span className="font-semibold text-gray-800">{config.limitePorcentajeAvance}%</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Monto Mínimo</span>
                      <span className="font-semibold text-gray-800">${parseFloat(config.montoMinimoAvance).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Acciones en la Tarjeta */}
                  <div className="flex items-center justify-end gap-2 border-t pt-3 bg-gray-50/50 -mx-4 -mb-4 px-4 py-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editarConfig(config)}
                      className="flex items-center gap-1.5 bg-white text-xs h-8"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirModalComisiones(config.userId)}
                      className="flex items-center gap-1.5 bg-white text-xs h-8"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Calcular
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white flex items-center gap-1.5 text-xs h-8"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] max-w-md rounded-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar configuración?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará la configuración de sueldo de este cobrador permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteConfig(config.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pagos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Historial y Registro de Pagos</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Registra nuevos pagos, avances de sueldo o comisiones extras y consulta el histórico.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto mt-3 sm:mt-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="periodoFiltro" className="text-sm font-medium text-gray-600 whitespace-nowrap hidden sm:block">Mes:</Label>
                <div className="relative flex-1 sm:flex-none sm:w-[180px]">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 z-10" />
                  <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                    <SelectTrigger className="pl-9 h-10 sm:h-9 w-full bg-white">
                      <SelectValue placeholder="Seleccionar mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {mesesOptions.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => setShowPagoModal(true)} className="w-full sm:w-auto shadow-sm h-10 sm:h-9">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Pago
              </Button>
            </div>
          </div>

          {/* VISTA ESCRITORIO: Tabla */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Cobrador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Monto Final</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                      <TableHead className="pr-6 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagos.map((pago) => (
                      <TableRow key={pago.id}>
                        <TableCell className="pl-6">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {pago.cobrador.firstName} {pago.cobrador.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {pago.cobrador.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getTipoBadge(pago.tipo)}</TableCell>
                        <TableCell>{pago.periodo || '-'}</TableCell>
                        <TableCell className="font-bold text-gray-900">
                          ${parseFloat(pago.montoFinal).toLocaleString()}
                        </TableCell>
                        <TableCell>{getEstadoBadge(pago.estado)}</TableCell>
                        <TableCell>
                          {pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex gap-2 justify-end">
                            {pago.estado === 'PENDIENTE' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEstadoPago(pago.id, 'PAGADO')}
                                className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                                title="Marcar como Pagado"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalComisiones(pago.cobradorId)}
                              title="Ver Detalles de Liquidación"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(session?.user as any)?.role === 'ADMINISTRADOR' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    title="Eliminar Pago"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95vw] max-w-md rounded-lg">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará el registro de este pago del historial.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeletePago(pago.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* VISTA MÓVIL: Tarjetas */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {pagos.map((pago) => (
              <Card key={pago.id} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-4">
                  {/* Cabecera de la Tarjeta */}
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <div className="font-bold text-gray-900 text-base">
                        {pago.cobrador.firstName} {pago.cobrador.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pago.cobrador.email}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {getTipoBadge(pago.tipo)}
                      {getEstadoBadge(pago.estado)}
                    </div>
                  </div>
                  
                  {/* Detalles en Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Monto Final</span>
                      <span className="font-bold text-base text-gray-900">${parseFloat(pago.montoFinal).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Período</span>
                      <span className="font-semibold text-gray-800">{pago.periodo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Fecha de Pago</span>
                      <span className="font-semibold text-gray-800">
                        {pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Método de Pago</span>
                      <span className="font-semibold text-gray-800">{pago.metodoPago || '-'}</span>
                    </div>
                  </div>

                  {/* Observaciones si existen */}
                  {pago.observaciones && (
                    <div className="bg-gray-55/70 p-2.5 rounded text-xs text-gray-700 border border-gray-150">
                      <span className="font-bold block text-gray-800 mb-0.5">Observaciones:</span>
                      {pago.observaciones}
                    </div>
                  )}
                  
                  {/* Acciones en la Tarjeta */}
                  <div className="flex items-center justify-end gap-2 border-t pt-3 bg-gray-50/50 -mx-4 -mb-4 px-4 py-2.5">
                    {pago.estado === 'PENDIENTE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEstadoPago(pago.id, 'PAGADO')}
                        className="flex items-center gap-1.5 bg-white text-green-600 hover:text-green-700 border-green-200 hover:bg-green-55 text-xs h-8"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Marcar Pagado
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirModalComisiones(pago.cobradorId)}
                      className="flex items-center gap-1.5 bg-white text-xs h-8"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Detalles
                    </Button>
                    {(session?.user as any)?.role === 'ADMINISTRADOR' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white flex items-center gap-1.5 text-xs h-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará el registro de este pago del historial.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeletePago(pago.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Configuración */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-lg w-[95vw] rounded-lg max-h-[90vh] overflow-y-auto p-5 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">
              {selectedConfig ? 'Editar Configuración' : 'Nueva Configuración'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="usuario" className="text-xs font-semibold text-gray-700">Cobrador</Label>
              <Select
                value={configForm.userId}
                onValueChange={(value) => setConfigForm(prev => ({ ...prev, userId: value }))}
                disabled={!!selectedConfig}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar cobrador" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.firstName} {usuario.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="salarioBase" className="text-xs font-semibold text-gray-700">Salario Base ($)</Label>
              <Input
                id="salarioBase"
                type="number"
                step="0.01"
                value={configForm.salarioBase}
                onChange={(e) => setConfigForm(prev => ({ ...prev, salarioBase: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="comision" className="text-xs font-semibold text-gray-700">Comisión por Cobro (%)</Label>
              <Input
                id="comision"
                type="number"
                step="0.01"
                max="100"
                value={configForm.comisionPorCobro}
                onChange={(e) => setConfigForm(prev => ({ ...prev, comisionPorCobro: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="limiteAvance" className="text-xs font-semibold text-gray-700">Límite de Avance (%)</Label>
              <Input
                id="limiteAvance"
                type="number"
                max="100"
                value={configForm.limitePorcentajeAvance}
                onChange={(e) => setConfigForm(prev => ({ ...prev, limitePorcentajeAvance: e.target.value }))}
                placeholder="50"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="montoMinimo" className="text-xs font-semibold text-gray-700">Monto Mínimo Avance ($)</Label>
              <Input
                id="montoMinimo"
                type="number"
                step="0.01"
                value={configForm.montoMinimoAvance}
                onChange={(e) => setConfigForm(prev => ({ ...prev, montoMinimoAvance: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowConfigModal(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig} className="w-full sm:w-auto">
                {selectedConfig ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pago */}
      <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
        <DialogContent className="max-w-lg w-[95vw] rounded-lg max-h-[90vh] overflow-y-auto p-5 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">Registrar Pago de Sueldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="cobrador" className="text-xs font-semibold text-gray-700">Cobrador</Label>
              <Select
                value={pagoForm.cobradorId}
                onValueChange={(value) => setPagoForm(prev => ({ ...prev, cobradorId: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar cobrador" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.firstName} {usuario.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo" className="text-xs font-semibold text-gray-700">Tipo de Pago</Label>
              <Select
                value={pagoForm.tipo}
                onValueChange={(value) => setPagoForm(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUELDO">Sueldo Completo</SelectItem>
                  <SelectItem value="AVANCE">Avance de Sueldo</SelectItem>
                  <SelectItem value="COMISION_EXTRA">Comisión Extra</SelectItem>
                  <SelectItem value="DESCUENTO">Descuento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="periodo" className="text-xs font-semibold text-gray-700">Período (YYYY-MM)</Label>
              <Select
                value={pagoForm.periodo}
                onValueChange={(value) => setPagoForm(prev => ({ ...prev, periodo: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {mesesOptions.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montoBase" className="text-xs font-semibold text-gray-700">Salario Base ($)</Label>
                <Input
                  id="montoBase"
                  type="number"
                  step="0.01"
                  value={pagoForm.montoBase}
                  onChange={(e) => {
                    const base = e.target.value
                    const comisiones = parseFloat(pagoForm.montoComisiones || '0') || 0
                    const avances = parseFloat(pagoForm.montoAvances || '0') || 0
                    const final = ((parseFloat(base || '0') || 0) + comisiones - avances).toFixed(2)
                    setPagoForm(prev => ({ ...prev, montoBase: base, montoTotal: (( parseFloat(base||'0')||0) + comisiones).toFixed(2), montoFinal: final }))
                  }}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="montoComisiones" className="text-xs font-semibold text-gray-700">Comisiones ($)</Label>
                <Input
                  id="montoComisiones"
                  type="number"
                  step="0.01"
                  value={pagoForm.montoComisiones}
                  onChange={(e) => {
                    const comisiones = e.target.value
                    const base = parseFloat(pagoForm.montoBase || '0') || 0
                    const avances = parseFloat(pagoForm.montoAvances || '0') || 0
                    const final = (base + (parseFloat(comisiones || '0') || 0) - avances).toFixed(2)
                    setPagoForm(prev => ({ ...prev, montoComisiones: comisiones, montoTotal: (base + (parseFloat(comisiones||'0')||0)).toFixed(2), montoFinal: final }))
                  }}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montoAvances" className="text-xs font-semibold text-gray-700">Avances Descontados ($)</Label>
                <Input
                  id="montoAvances"
                  type="number"
                  step="0.01"
                  value={pagoForm.montoAvances}
                  onChange={(e) => {
                    const avances = e.target.value
                    const base = parseFloat(pagoForm.montoBase || '0') || 0
                    const comisiones = parseFloat(pagoForm.montoComisiones || '0') || 0
                    const final = (base + comisiones - (parseFloat(avances || '0') || 0)).toFixed(2)
                    setPagoForm(prev => ({ ...prev, montoAvances: avances, montoFinal: final }))
                  }}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="montoFinal" className="text-xs font-semibold text-green-700 flex items-center gap-1">
                  Monto Final ($)
                  <span className="text-[10px] font-normal text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">auto-calculado</span>
                </Label>
                <Input
                  id="montoFinal"
                  type="number"
                  step="0.01"
                  value={pagoForm.montoFinal}
                  onChange={(e) => setPagoForm(prev => ({ ...prev, montoFinal: e.target.value }))}
                  placeholder="0.00"
                  className="font-bold mt-1 text-green-800 bg-green-50 border-green-300 focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="metodoPago" className="text-xs font-semibold text-gray-700">Método de Pago</Label>
              <Select
                value={pagoForm.metodoPago}
                onValueChange={(value) => setPagoForm(prev => ({ ...prev, metodoPago: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observaciones" className="text-xs font-semibold text-gray-700">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={pagoForm.observaciones}
                onChange={(e) => setPagoForm(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Observaciones adicionales..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPagoModal(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleSavePago} className="w-full sm:w-auto">
                Registrar Pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Comisiones */}
      <Dialog open={showComisionModal} onOpenChange={setShowComisionModal}>
        <DialogContent className="max-w-4xl w-[95vw] rounded-lg max-h-[90vh] overflow-y-auto p-5 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">Cálculo de Comisiones y Avances</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end bg-gray-50 p-4 rounded-lg border border-gray-150">
              <div className="flex-1">
                <Label htmlFor="mesComision" className="text-xs font-semibold text-gray-700">Período Mensual</Label>
                <Select
                  value={mesComision}
                  onValueChange={(value) => setMesComision(value)}
                >
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {mesesOptions.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => cargarComisiones(selectedUser, mesComision)}
                className="w-full sm:w-auto shadow-sm"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calcular Montos
              </Button>
            </div>

            {comisionData && (
              <div className="space-y-6">
                {/* Aviso si no tiene configuración de sueldo */}
                {(comisionData as any).sinConfiguracion && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">Sin configuración de sueldo</p>
                      <p className="text-amber-700 mt-0.5">Este cobrador no tiene una configuración de sueldo asignada. Los valores de salario base y comisiones aparecerán en $0. Creá una configuración en la pestaña <strong>Configuraciones de Sueldo</strong> para ver los cálculos correctos.</p>
                    </div>
                  </div>
                )}
                {/* Resumen */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border border-gray-200 shadow-none bg-white">
                    <CardHeader className="pb-1.5 p-3">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Salario Base</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xl md:text-2xl font-bold text-green-600">
                        ${comisionData.sueldo.salarioBase.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-gray-200 shadow-none bg-white">
                    <CardHeader className="pb-1.5 p-3">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Comisiones</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xl md:text-2xl font-bold text-blue-600">
                        ${comisionData.sueldo.comisiones.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {comisionData.cobros.cantidadCobros} cobros realizados
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-gray-200 shadow-none bg-white">
                    <CardHeader className="pb-1.5 p-3">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Sueldo</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xl md:text-2xl font-extrabold text-gray-900">
                        ${comisionData.sueldo.total.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-gray-200 shadow-none bg-white">
                    <CardHeader className="pb-1.5 p-3">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avance Disponible</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xl md:text-2xl font-bold text-yellow-600">
                        ${comisionData.avances.disponible.toLocaleString()}
                      </p>
                      {!comisionData.avances.puedeAvanzar && (
                        <div className="flex items-center text-orange-600 text-xs mt-1 font-medium bg-orange-50 border border-orange-100 p-1.5 rounded">
                          <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                          <span>Mínimo: ${comisionData.configuracion.montoMinimoAvance}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Detalle de cobros */}
                {comisionData.detalleCobros.length > 0 ? (
                  <Card className="border border-gray-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50 border-b border-gray-150 px-4 py-3">
                      <CardTitle className="text-sm font-bold text-gray-900">Detalle de Cobros Realizados</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-transparent">
                              <TableHead className="pl-4 text-xs font-bold text-gray-700">Fecha</TableHead>
                              <TableHead className="text-xs font-bold text-gray-700">Cliente</TableHead>
                              <TableHead className="text-xs font-bold text-gray-700">Monto Cobrado</TableHead>
                              <TableHead className="pr-4 text-xs font-bold text-gray-700">Comisión</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comisionData.detalleCobros.map((cobro: DetalleCobro, index: number) => (
                              <TableRow key={index} className="hover:bg-gray-50/30">
                                <TableCell className="pl-4 text-sm">{new Date(cobro.fecha).toLocaleDateString()}</TableCell>
                                <TableCell className="text-sm font-semibold text-gray-800">{cobro.cliente}</TableCell>
                                <TableCell className="text-sm font-medium">${cobro.monto.toLocaleString()}</TableCell>
                                <TableCell className="pr-4 text-sm text-blue-600 font-bold">
                                  ${cobro.comision.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center p-6 bg-gray-50 border border-gray-150 rounded-lg text-sm text-muted-foreground font-medium">
                    No se registran cobros en este período mensual.
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

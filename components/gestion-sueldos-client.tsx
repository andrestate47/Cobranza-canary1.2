
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
  
  const [periodoFiltro, setPeriodoFiltro] = useState(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })

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
    return now.toISOString().split('T')[0]
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
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#071311] transition-colors p-4">
        <div className="container-mobile">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Cargando gestión de sueldos...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-[#0E1F1C]/90 border-b border-gray-200 dark:border-[#1F3A36] shadow-sm mb-6">
        <div className="container-mobile">
          <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:h-16 md:py-0">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
              >
                <ArrowLeft className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                Volver al Panel
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  Gestión de Sueldos
                </h1>
                <p className="text-xs text-gray-500 dark:text-emerald-300/80">
                  Salarios, comisiones y adelantos de cobradores
                </p>
              </div>
            </div>

            {/* Selector de Pestañas Estilo Segmented Control */}
            <div className="flex p-1 bg-gray-100 dark:bg-[#152e2a] rounded-lg border border-gray-200 dark:border-[#1F3A36] w-full md:w-auto">
              <button
                onClick={() => setActiveTab('configuraciones')}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all duration-200 flex-1 md:flex-initial ${
                  activeTab === 'configuraciones'
                    ? "bg-white dark:bg-[#0E1F1C] text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-emerald-300/80 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Configuraciones de Sueldo
              </button>
              <button
                onClick={() => setActiveTab('pagos')}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all duration-200 flex-1 md:flex-initial ${
                  activeTab === 'pagos'
                    ? "bg-white dark:bg-[#0E1F1C] text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-emerald-300/80 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Historial de Pagos
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile space-y-6">
        {activeTab === 'configuraciones' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Configuraciones de Sueldo</h2>
                <p className="text-sm text-gray-500 dark:text-emerald-300/80 mt-0.5">
                  Define el salario base, comisiones por cobro y límites de adelantos por cada cobrador.
                </p>
              </div>
              <Button onClick={() => setShowConfigModal(true)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Configuración
              </Button>
            </div>

            {/* VISTA ESCRITORIO: Tabla */}
            <div className="hidden md:block">
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 dark:border-[#1F3A36]">
                        <TableHead className="pl-6 text-gray-700 dark:text-gray-200 font-semibold">Cobrador</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Salario Base</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Comisión %</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Límite Avance %</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Estado</TableHead>
                        <TableHead className="pr-6 text-right text-gray-700 dark:text-gray-200 font-semibold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configuraciones.map((config) => (
                        <TableRow key={config.id} className="border-b border-gray-100 dark:border-[#1F3A36]/60 hover:bg-gray-50 dark:hover:bg-[#152e2a]">
                          <TableCell className="pl-6">
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                {config.usuario.firstName} {config.usuario.lastName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-emerald-300/80">
                                {config.usuario.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-white">
                            ${parseFloat(config.salarioBase).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-white">{config.comisionPorCobro}%</TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-white">{config.limitePorcentajeAvance}%</TableCell>
                          <TableCell>
                            <Badge className={config.activo ? "bg-emerald-600 dark:bg-emerald-700 text-white" : "bg-gray-500 text-white"}>
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
                                className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                              >
                                <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => abrirModalComisiones(config.userId)}
                                title="Calcular Comisiones/Avances"
                                className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                              >
                                <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    title="Eliminar Configuración"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95vw] max-w-md rounded-xl bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">¿Eliminar configuración?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm text-gray-500 dark:text-emerald-300/80">
                                      Esta acción no se puede deshacer. Se eliminará la configuración de sueldo de este cobrador permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-[#1F3A36]">
                                    <AlertDialogCancel className="mt-0 border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteConfig(config.id)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
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
                <Card key={config.id} className="overflow-hidden bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    {/* Cabecera de la Tarjeta */}
                    <div className="flex items-start justify-between border-b border-gray-200 dark:border-[#1F3A36] pb-3">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-base">
                          {config.usuario.firstName} {config.usuario.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-emerald-300/80">
                          {config.usuario.email}
                        </div>
                      </div>
                      <Badge className={config.activo ? "bg-emerald-600 dark:bg-emerald-700 text-white" : "bg-gray-500 text-white"}>
                        {config.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    
                    {/* Detalles en Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-emerald-300/80 block font-medium">Salario Base</span>
                        <span className="font-bold text-gray-900 dark:text-white">${parseFloat(config.salarioBase).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-emerald-300/80 block font-medium">Comisión por Cobro</span>
                        <span className="font-bold text-gray-900 dark:text-white">{config.comisionPorCobro}%</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-emerald-300/80 block font-medium">Límite Avance</span>
                        <span className="font-bold text-gray-900 dark:text-white">{config.limitePorcentajeAvance}%</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-emerald-300/80 block font-medium">Monto Mínimo</span>
                        <span className="font-bold text-gray-900 dark:text-white">${parseFloat(config.montoMinimoAvance).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {/* Acciones en la Tarjeta */}
                    <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-[#1F3A36] pt-3 bg-gray-50 dark:bg-[#152e2a] -mx-4 -mb-4 px-4 py-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editarConfig(config)}
                        className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330] flex items-center gap-1.5 text-xs h-8"
                      >
                        <Settings className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirModalComisiones(config.userId)}
                        className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330] flex items-center gap-1.5 text-xs h-8"
                      >
                        <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Calcular
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 text-xs h-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md rounded-xl bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">¿Eliminar configuración?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm text-gray-500 dark:text-emerald-300/80">
                              Esta acción no se puede deshacer. Se eliminará la configuración de sueldo de este cobrador permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-[#1F3A36]">
                            <AlertDialogCancel className="mt-0 border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteConfig(config.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
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
                <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Historial y Registro de Pagos</h2>
                <p className="text-sm text-gray-500 dark:text-emerald-300/80 mt-0.5">
                  Registra nuevos pagos, avances de sueldo o comisiones extras y consulta el histórico.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto mt-3 sm:mt-0">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Label htmlFor="periodoFiltro" className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap hidden sm:block">Mes:</Label>
                  <div className="relative flex-1 sm:flex-none sm:w-[180px]">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 z-10" />
                    <Input
                      type="date"
                      value={periodoFiltro}
                      onChange={(e) => setPeriodoFiltro(e.target.value)}
                      className="pl-9 h-10 sm:h-9 w-full bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <Button onClick={() => setShowPagoModal(true)} className="w-full sm:w-auto shadow-sm h-10 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Pago
                </Button>
              </div>
            </div>

            {/* VISTA ESCRITORIO: Tabla */}
            <div className="hidden md:block">
              <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 dark:border-[#1F3A36]">
                        <TableHead className="pl-6 text-gray-700 dark:text-gray-200 font-semibold">Cobrador</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Tipo</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Período</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Monto Final</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Estado</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Fecha Pago</TableHead>
                        <TableHead className="pr-6 text-right text-gray-700 dark:text-gray-200 font-semibold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagos.map((pago) => (
                        <TableRow key={pago.id} className="border-b border-gray-100 dark:border-[#1F3A36]/60 hover:bg-gray-50 dark:hover:bg-[#152e2a]">
                          <TableCell className="pl-6">
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                {pago.cobrador.firstName} {pago.cobrador.lastName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-emerald-300/80">
                                {pago.cobrador.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getTipoBadge(pago.tipo)}</TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-white">{pago.periodo || '-'}</TableCell>
                          <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                            ${parseFloat(pago.montoFinal).toLocaleString()}
                          </TableCell>
                          <TableCell>{getEstadoBadge(pago.estado)}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-sm">
                            {pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex gap-2 justify-end">
                              {pago.estado === 'PENDIENTE' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEstadoPago(pago.id, 'PAGADO')}
                                  className="border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
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
                                className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                              >
                                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </Button>
                              {(session?.user as any)?.role === 'ADMINISTRADOR' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      title="Eliminar Pago"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="w-[95vw] max-w-md rounded-xl bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">¿Eliminar este pago?</AlertDialogTitle>
                                      <AlertDialogDescription className="text-sm text-gray-500 dark:text-emerald-300/80">
                                        Esta acción no se puede deshacer. Se eliminará el registro de este pago del historial.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-[#1F3A36]">
                                      <AlertDialogCancel className="mt-0 border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]">Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeletePago(pago.id)}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
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
                <Card key={pago.id} className="overflow-hidden bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    {/* Cabecera de la Tarjeta */}
                    <div className="flex items-start justify-between border-b border-gray-200 dark:border-[#1F3A36] pb-3">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-base">
                          {pago.cobrador.firstName} {pago.cobrador.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-emerald-300/80">
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
                        <span className="text-xs text-gray-500 dark:text-emerald-300/80 block font-medium">Monto Final</span>
                        <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">${parseFloat(pago.montoFinal).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-emerald-300/80 block font-medium">Período</span>
                        <span className="font-bold text-gray-900 dark:text-white">{pago.periodo || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-emerald-300/80 block font-medium">Fecha de Pago</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-emerald-300/80 block font-medium">Método de Pago</span>
                        <span className="font-bold text-gray-900 dark:text-white">{pago.metodoPago || '-'}</span>
                      </div>
                    </div>

                    {/* Observaciones si existen */}
                    {pago.observaciones && (
                      <div className="bg-gray-50 dark:bg-[#152e2a] p-2.5 rounded-lg text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1F3A36]">
                        <span className="font-bold block text-gray-900 dark:text-white mb-0.5">Observaciones:</span>
                        {pago.observaciones}
                      </div>
                    )}
                    
                    {/* Acciones en la Tarjeta */}
                    <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-[#1F3A36] pt-3 bg-gray-50 dark:bg-[#152e2a] -mx-4 -mb-4 px-4 py-2.5">
                      {pago.estado === 'PENDIENTE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEstadoPago(pago.id, 'PAGADO')}
                          className="border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1.5 text-xs h-8"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Marcar Pagado
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirModalComisiones(pago.cobradorId)}
                        className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330] flex items-center gap-1.5 text-xs h-8"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Ver Detalles
                      </Button>
                      {(session?.user as any)?.role === 'ADMINISTRADOR' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 text-xs h-8"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[95vw] max-w-md rounded-xl bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">¿Eliminar este pago?</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm text-gray-500 dark:text-emerald-300/80">
                                Esta acción no se puede deshacer. Se eliminará el registro de este pago del historial.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-[#1F3A36]">
                              <AlertDialogCancel className="mt-0 border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeletePago(pago.id)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
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
          <DialogContent className="max-w-lg w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto p-5 md:p-6 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
            <DialogHeader className="border-b border-gray-200 dark:border-[#1F3A36] pb-3">
              <DialogTitle className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {selectedConfig ? 'Editar Configuración' : 'Nueva Configuración'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="usuario" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Cobrador</Label>
                <Select
                  value={configForm.userId}
                  onValueChange={(value) => setConfigForm(prev => ({ ...prev, userId: value }))}
                  disabled={!!selectedConfig}
                >
                  <SelectTrigger className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar cobrador" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.firstName} {usuario.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="salarioBase" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Salario Base ($)</Label>
                <Input
                  id="salarioBase"
                  type="number"
                  step="0.01"
                  value={configForm.salarioBase}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, salarioBase: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="comision" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Comisión por Cobro (%)</Label>
                <Input
                  id="comision"
                  type="number"
                  step="0.01"
                  max="100"
                  value={configForm.comisionPorCobro}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, comisionPorCobro: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="limiteAvance" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Límite de Avance (%)</Label>
                <Input
                  id="limiteAvance"
                  type="number"
                  max="100"
                  value={configForm.limitePorcentajeAvance}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, limitePorcentajeAvance: e.target.value }))}
                  placeholder="50"
                  className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="montoMinimo" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Monto Mínimo Avance ($)</Label>
                <Input
                  id="montoMinimo"
                  type="number"
                  step="0.01"
                  value={configForm.montoMinimoAvance}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, montoMinimoAvance: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#1F3A36]">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfigModal(false)} 
                  className="w-full sm:w-auto border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveConfig} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  {selectedConfig ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Pago */}
        <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
          <DialogContent className="max-w-lg w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto p-5 md:p-6 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
            <DialogHeader className="border-b border-gray-200 dark:border-[#1F3A36] pb-3">
              <DialogTitle className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Registrar Pago de Sueldo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="cobrador" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Cobrador</Label>
                <Select
                  value={pagoForm.cobradorId}
                  onValueChange={(value) => setPagoForm(prev => ({ ...prev, cobradorId: value }))}
                >
                  <SelectTrigger className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar cobrador" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.firstName} {usuario.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tipo" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Tipo de Pago</Label>
                <Select
                  value={pagoForm.tipo}
                  onValueChange={(value) => setPagoForm(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectItem value="SUELDO">Sueldo Completo</SelectItem>
                    <SelectItem value="AVANCE">Avance de Sueldo</SelectItem>
                    <SelectItem value="COMISION_EXTRA">Comisión Extra</SelectItem>
                    <SelectItem value="DESCUENTO">Descuento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="periodo" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Fecha del Período</Label>
                <Input
                  type="date"
                  id="periodo"
                  value={pagoForm.periodo}
                  onChange={(e) => setPagoForm(prev => ({ ...prev, periodo: e.target.value }))}
                  className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="montoBase" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Salario Base ($)</Label>
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
                    className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="montoComisiones" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Comisiones ($)</Label>
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
                    className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="montoAvances" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Avances Descontados ($)</Label>
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
                    className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="montoFinal" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    Monto Final ($)
                    <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-[#152e2a] border border-emerald-200 dark:border-[#1F3A36] px-1.5 py-0.5 rounded">auto-calculado</span>
                  </Label>
                  <Input
                    id="montoFinal"
                    type="number"
                    step="0.01"
                    value={pagoForm.montoFinal}
                    onChange={(e) => setPagoForm(prev => ({ ...prev, montoFinal: e.target.value }))}
                    placeholder="0.00"
                    className="font-bold mt-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-[#152e2a] border-emerald-300 dark:border-[#1F3A36] focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="metodoPago" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Método de Pago</Label>
                <Select
                  value={pagoForm.metodoPago}
                  onValueChange={(value) => setPagoForm(prev => ({ ...prev, metodoPago: value }))}
                >
                  <SelectTrigger className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="observaciones" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={pagoForm.observaciones}
                  onChange={(e) => setPagoForm(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#1F3A36]">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPagoModal(false)} 
                  className="w-full sm:w-auto border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSavePago} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  Registrar Pago
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Comisiones */}
        <Dialog open={showComisionModal} onOpenChange={setShowComisionModal}>
          <DialogContent className="max-w-4xl w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto p-5 md:p-6 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
            <DialogHeader className="border-b border-gray-200 dark:border-[#1F3A36] pb-3">
              <DialogTitle className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Cálculo de Comisiones y Avances</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end bg-gray-50 dark:bg-[#152e2a] p-4 rounded-xl border border-gray-200 dark:border-[#1F3A36]">
                <div className="flex-1">
                  <Label htmlFor="mesComision" className="text-xs font-semibold text-gray-700 dark:text-gray-200">Fecha de Liquidación</Label>
                  <Input
                    type="date"
                    id="mesComision"
                    value={mesComision}
                    onChange={(e) => setMesComision(e.target.value)}
                    className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                  />
                </div>
                <Button 
                  onClick={() => cargarComisiones(selectedUser, mesComision)}
                  className="w-full sm:w-auto shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Calcular Montos
                </Button>
              </div>

              {comisionData && (
                <div className="space-y-6">
                  {/* Aviso si no tiene configuración de sueldo */}
                  {(comisionData as any).sinConfiguracion && (
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 text-sm">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300">Sin configuración de sueldo</p>
                        <p className="text-amber-700 dark:text-amber-400 mt-0.5">Este cobrador no tiene una configuración de sueldo asignada. Los valores de salario base y comisiones aparecerán en $0. Creá una configuración en la pestaña <strong>Configuraciones de Sueldo</strong> para ver los cálculos correctos.</p>
                      </div>
                    </div>
                  )}
                  {/* Resumen */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border border-gray-200 dark:border-[#1F3A36] shadow-none bg-white dark:bg-[#152e2a]">
                      <CardHeader className="pb-1.5 p-3">
                        <CardTitle className="text-xs font-bold text-gray-500 dark:text-emerald-300/80 uppercase tracking-wider">Salario Base</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          ${comisionData.sueldo.salarioBase.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-gray-200 dark:border-[#1F3A36] shadow-none bg-white dark:bg-[#152e2a]">
                      <CardHeader className="pb-1.5 p-3">
                        <CardTitle className="text-xs font-bold text-gray-500 dark:text-emerald-300/80 uppercase tracking-wider">Comisiones</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${comisionData.sueldo.comisiones.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-0.5 font-medium">
                          {comisionData.cobros.cantidadCobros} cobros realizados
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-gray-200 dark:border-[#1F3A36] shadow-none bg-white dark:bg-[#152e2a]">
                      <CardHeader className="pb-1.5 p-3">
                        <CardTitle className="text-xs font-bold text-gray-500 dark:text-emerald-300/80 uppercase tracking-wider">Total Sueldo</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">
                          ${comisionData.sueldo.total.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-gray-200 dark:border-[#1F3A36] shadow-none bg-white dark:bg-[#152e2a]">
                      <CardHeader className="pb-1.5 p-3">
                        <CardTitle className="text-xs font-bold text-gray-500 dark:text-emerald-300/80 uppercase tracking-wider">Avance Disponible</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">
                          ${comisionData.avances.disponible.toLocaleString()}
                        </p>
                        {!comisionData.avances.puedeAvanzar && (
                          <div className="flex items-center text-amber-700 dark:text-amber-300 text-xs mt-1 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-1.5 rounded">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                            <span>Mínimo: ${comisionData.configuracion.montoMinimoAvance}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detalle de cobros */}
                  {comisionData.detalleCobros.length > 0 ? (
                    <Card className="border border-gray-200 dark:border-[#1F3A36] shadow-sm overflow-hidden bg-white dark:bg-[#0E1F1C]">
                      <CardHeader className="bg-gray-50 dark:bg-[#152e2a] border-b border-gray-200 dark:border-[#1F3A36] px-4 py-3">
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Detalle de Cobros Realizados</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto w-full">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50/50 dark:bg-[#152e2a]/50 hover:bg-transparent border-b border-gray-200 dark:border-[#1F3A36]">
                                <TableHead className="pl-4 text-xs font-bold text-gray-700 dark:text-gray-200">Fecha</TableHead>
                                <TableHead className="text-xs font-bold text-gray-700 dark:text-gray-200">Cliente</TableHead>
                                <TableHead className="text-xs font-bold text-gray-700 dark:text-gray-200">Monto Cobrado</TableHead>
                                <TableHead className="pr-4 text-xs font-bold text-gray-700 dark:text-gray-200">Comisión</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {comisionData.detalleCobros.map((cobro: DetalleCobro, index: number) => (
                                <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-[#152e2a] border-b border-gray-100 dark:border-[#1F3A36]">
                                  <TableCell className="pl-4 text-sm text-gray-700 dark:text-gray-300">{new Date(cobro.fecha).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-sm font-semibold text-gray-900 dark:text-white">{cobro.cliente}</TableCell>
                                  <TableCell className="text-sm font-medium text-gray-900 dark:text-white">${cobro.monto.toLocaleString()}</TableCell>
                                  <TableCell className="pr-4 text-sm text-blue-600 dark:text-blue-400 font-bold">
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
                    <div className="text-center p-6 bg-gray-50 dark:bg-[#152e2a] border border-gray-200 dark:border-[#1F3A36] rounded-xl text-sm text-gray-500 dark:text-gray-400 font-medium">
                      No se registran cobros en este período mensual.
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}


"use client"

import { useState, useEffect, useRef } from "react"
import { Session } from "next-auth"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import BuscadorCliente from "@/components/buscador-cliente"
import {
  ArrowLeft,
  Plus,
  User,
  DollarSign,
  Calendar,
  Calculator,
  Loader2,
  Receipt,
  Share2,
  MessageCircle,
  ChevronDown,
  CreditCard,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

interface Cliente {
  id: string
  codigoCliente: string
  documento: string
  nombre: string
  apellido: string
  direccionCliente: string
  direccionCobro?: string
  telefono?: string
  referenciasPersonales?: string
  pais?: string
  ciudad?: string
  ubicacion?: string
  mapLink?: string
}

interface PrestamoCreado {
  id: string
  monto: number
  interes: number
  cuotas: number
  valorCuota: number
  fechaInicio: string
  fechaFin: string
  estado: string
  montoTotal: number
  cliente: {
    id: string
    cedula: string
    nombre: string
    apellido: string
    direccion: string
    telefono?: string
  }
}

interface NuevoPrestamoClientProps {
  session: Session
}

export default function NuevoPrestamoClient({ session }: NuevoPrestamoClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const boletaRef = useRef<HTMLDivElement>(null)

  const { format: formatCurrencyGlobal } = useCurrency()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false)
  const [editandoCliente, setEditandoCliente] = useState(false)
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null)

  // Estados para el modal de préstamo creado
  const [modalPrestamoAbierto, setModalPrestamoAbierto] = useState(false)
  const [prestamoCreado, setPrestamoCreado] = useState<PrestamoCreado | null>(null)

  // Formulario
  const [clienteId, setClienteId] = useState("")

  // Preseleccionar cliente si viene en la URL
  const preselectedClienteId = searchParams ? (searchParams.get('clienteId') || searchParams.get('cliente')) : null
  useEffect(() => {
    if (preselectedClienteId && clientes.length > 0) {
      const clienteExistente = clientes.find(
        c => c.id === preselectedClienteId || c.codigoCliente === preselectedClienteId || c.documento === preselectedClienteId
      )
      if (clienteExistente) {
        setClienteId(clienteExistente.id)
      }
    }
  }, [preselectedClienteId, clientes])

  // Formulario nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    codigoCliente: "",
    documento: "",
    nombre: "",
    apellido: "",
    direccionCliente: "",
    direccionCobro: "",
    telefono: "",
    referenciasPersonales: "",
    pais: "",
    ciudad: "",
    ubicacion: "",
    mapLink: ""
  })
  const [monto, setMonto] = useState("")
  const [interes, setInteres] = useState("")
  const [tipoPago, setTipoPago] = useState("DIARIO")
  const [cuotas, setCuotas] = useState("")
  const [fechaInicio, setFechaInicio] = useState(() => {
    // Usar fecha local
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [observaciones, setObservaciones] = useState("")

  // Nuevos campos
  const [tipoCredito, setTipoCredito] = useState("EFECTIVO")
  const [diasGracia, setDiasGracia] = useState("0")
  const [moraCredito, setMoraCredito] = useState("0")

  // Campos de Microseguro
  const [microseguroTipo, setMicroseguroTipo] = useState("NINGUNO")
  const [microseguroValor, setMicroseguroValor] = useState("")

  // Cálculos
  const [valorCuota, setValorCuota] = useState(0)
  const [montoTotal, setMontoTotal] = useState(0)
  const [microseguroTotal, setMicroseguroTotal] = useState(0)

  useEffect(() => {
    fetchClientes()
  }, [])

  useEffect(() => {
    calcularCuota()
  }, [monto, interes, cuotas, microseguroTipo, microseguroValor])

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes')
      if (response.ok) {
        const data = await response.json()
        setClientes(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setLoadingClientes(false)
    }
  }

  const parseSpanishNumber = (value: string): number => {
    if (!value) return 0

    // Si el valor contiene tanto puntos como comas, asumimos formato español (punto = miles, coma = decimal)
    if (value.includes('.') && value.includes(',')) {
      // Formato: 1.234.567,89 (punto para miles, coma para decimal)
      return parseFloat(value.replace(/\./g, '').replace(',', '.'))
    }

    // Si solo contiene puntos, determinamos si es separador de miles o decimal
    if (value.includes('.')) {
      const parts = value.split('.')
      // Si hay más de 2 partes o la última parte tiene más de 2 dígitos, es separador de miles
      if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
        // Formato: 1.234.567 (punto como separador de miles)
        return parseFloat(value.replace(/\./g, ''))
      } else if (parts.length === 2 && parts[1].length <= 2) {
        // Formato: 123.45 (punto como decimal)
        return parseFloat(value)
      }
    }

    // Si solo contiene comas, es separador decimal
    if (value.includes(',')) {
      // Formato: 1234,56 (coma como decimal)
      return parseFloat(value.replace(',', '.'))
    }

    // Si no contiene separadores, es un número entero
    return parseFloat(value) || 0
  }

  const calcularCuota = () => {
    const montoNum = parseSpanishNumber(monto)
    const interesNum = parseSpanishNumber(interes)
    const cuotasNum = parseInt(cuotas) || 1

    const totalConInteres = montoNum + (montoNum * interesNum / 100)

    // Calcular microseguro
    let microseguroTotalCalc = 0
    if (microseguroTipo === 'MONTO_FIJO' || microseguroTipo === 'DEVOLUCION') {
      microseguroTotalCalc = parseSpanishNumber(microseguroValor) || 0
    } else if (microseguroTipo === 'PORCENTAJE') {
      const porcentaje = parseSpanishNumber(microseguroValor) || 0
      microseguroTotalCalc = montoNum * (porcentaje / 100)
    }

    const cuota = totalConInteres / cuotasNum

    setMontoTotal(totalConInteres)
    setMicroseguroTotal(microseguroTotalCalc)
    setValorCuota(cuota)
  }

  const formatNumberInput = (value: string): string => {
    // Permitir números, puntos, comas y espacios
    return value.replace(/[^0-9.,\s]/g, '')
  }

  const handleMontoChange = (value: string) => {
    const formattedValue = formatNumberInput(value)
    setMonto(formattedValue)
  }

  const handleInteresChange = (value: string) => {
    const formattedValue = formatNumberInput(value)
    setInteres(formattedValue)
  }

  const handleCuotasChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    setCuotas(numericValue)
  }

  const handleMicroseguroValorChange = (value: string) => {
    const formattedValue = formatNumberInput(value)
    setMicroseguroValor(formattedValue)
  }

  const resetFormularioCliente = () => {
    setNuevoCliente({
      codigoCliente: "",
      documento: "",
      nombre: "",
      apellido: "",
      direccionCliente: "",
      direccionCobro: "",
      telefono: "",
      referenciasPersonales: "",
      pais: "",
      ciudad: "",
      ubicacion: "",
      mapLink: ""
    })
  }

  const handleCrearCliente = async () => {
    if (!nuevoCliente.documento || !nuevoCliente.nombre || !nuevoCliente.apellido || !nuevoCliente.direccionCliente) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios del cliente deben ser completados",
        variant: "destructive",
      })
      return
    }

    setCreandoCliente(true)
    try {
      // Generar código de cliente automáticamente si no se proporciona
      const codigoGenerado = nuevoCliente.codigoCliente || `CL${String(clientes.length + 1).padStart(3, '0')}`

      const clienteData = {
        ...nuevoCliente,
        codigoCliente: codigoGenerado
      }

      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteData),
      })

      if (response.ok) {
        const clienteCreado = await response.json()

        // Actualizar lista de clientes
        setClientes(prev => [...prev, clienteCreado])

        // Seleccionar el cliente recién creado
        setClienteId(clienteCreado.id)

        // Ocultar formulario y resetear
        setMostrarFormularioCliente(false)
        resetFormularioCliente()

        // Emitir evento para actualizar otros componentes
        window.dispatchEvent(new CustomEvent('clienteCreado', { detail: clienteCreado }))

        toast({
          title: "Cliente creado",
          description: "El cliente se ha registrado exitosamente",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo crear el cliente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setCreandoCliente(false)
    }
  }

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteAEditar(cliente)
    setNuevoCliente({
      codigoCliente: cliente.codigoCliente,
      documento: cliente.documento,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      direccionCliente: cliente.direccionCliente,
      direccionCobro: cliente.direccionCobro || "",
      telefono: cliente.telefono || "",
      referenciasPersonales: cliente.referenciasPersonales || "",
      pais: cliente.pais || "",
      ciudad: cliente.ciudad || "",
      ubicacion: cliente.ubicacion || "",
      mapLink: cliente.mapLink || ""
    })
    setEditandoCliente(true)
    setMostrarFormularioCliente(true)
  }

  const handleActualizarCliente = async () => {
    if (!clienteAEditar || !nuevoCliente.documento || !nuevoCliente.nombre || !nuevoCliente.apellido || !nuevoCliente.direccionCliente) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios del cliente deben ser completados",
        variant: "destructive",
      })
      return
    }

    setCreandoCliente(true)
    try {
      const clienteData = {
        id: clienteAEditar.id,
        ...nuevoCliente
      }

      const response = await fetch('/api/clientes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteData),
      })

      if (response.ok) {
        const clienteActualizado = await response.json()

        // Actualizar lista de clientes
        setClientes(prev => prev.map(c =>
          c.id === clienteActualizado.id ? clienteActualizado : c
        ))

        // Mantener el cliente seleccionado
        setClienteId(clienteActualizado.id)

        // Ocultar formulario y resetear
        setMostrarFormularioCliente(false)
        setEditandoCliente(false)
        setClienteAEditar(null)
        resetFormularioCliente()

        // Emitir evento para actualizar otros componentes
        window.dispatchEvent(new CustomEvent('clienteActualizado', { detail: clienteActualizado }))

        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se han actualizado exitosamente",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo actualizar el cliente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setCreandoCliente(false)
    }
  }

  const handleNuevoClienteChange = (field: string, value: string) => {
    setNuevoCliente(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const cancelarEdicion = () => {
    setMostrarFormularioCliente(false)
    setEditandoCliente(false)
    setClienteAEditar(null)
    resetFormularioCliente()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar que haya un cliente seleccionado (no se puede estar creando uno y enviar el préstamo a la vez)
    if (mostrarFormularioCliente) {
      toast({
        title: "Error",
        description: "Debes completar la creación del cliente primero o cancelarla",
        variant: "destructive",
      })
      return
    }

    if (!clienteId || !monto || !interes || !cuotas) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben ser completados",
        variant: "destructive",
      })
      return
    }

    const montoNum = parseSpanishNumber(monto)
    const interesNum = parseSpanishNumber(interes)
    const cuotasNum = parseInt(cuotas)

    if (montoNum <= 0 || interesNum < 0 || cuotasNum <= 0) {
      toast({
        title: "Error",
        description: "Los valores deben ser válidos y positivos",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const microseguroValorNum = microseguroTipo !== 'NINGUNO'
        ? parseSpanishNumber(microseguroValor) || 0
        : 0

      const response = await fetch('/api/prestamos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clienteId,
          monto: montoNum,
          interes: interesNum,
          tipoPago,
          cuotas: cuotasNum,
          fechaInicio,
          observaciones: observaciones.trim() || undefined,
          tipoCredito,
          diasGracia: parseInt(diasGracia) || 0,
          moraCredito: parseFloat(moraCredito) || 0,
          microseguroTipo,
          microseguroValor: microseguroValorNum,
          microseguroTotal
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Préstamo creado:', result)

        // Calcular montoTotal para la visualización
        const montoTotal = result.prestamo.monto + (result.prestamo.monto * result.prestamo.interes / 100)

        // Guardar datos del préstamo creado con información adicional
        const prestamoConDatos: PrestamoCreado = {
          ...result.prestamo,
          montoTotal
        }

        console.log('📄 Mostrando modal de préstamo creado')
        setPrestamoCreado(prestamoConDatos)
        setModalPrestamoAbierto(true)

        // NO redirigir inmediatamente - el usuario cerrará el modal
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo crear el préstamo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return formatCurrencyGlobal(amount)
  }

  const selectedCliente = clientes.find(c => c.id === clienteId)

  // Funciones para el modal de préstamo
  const handleCerrarModal = () => {
    console.log('🔒 Cerrando modal de préstamo...')
    setModalPrestamoAbierto(false)
    setPrestamoCreado(null)

    // Mostrar toast y redirigir después de cerrar
    toast({
      title: "Préstamo creado",
      description: "El préstamo se ha registrado exitosamente",
    })
    router.push("/listado-general")
  }

  const handleDescargarPrestamo = async () => {
    if (!boletaRef.current || !prestamoCreado) return

    try {
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(boletaRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: 400,
        height: 600
      })

      const link = document.createElement('a')
      link.download = `prestamo-${prestamoCreado.id}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Error al descargar:', error)
      toast({
        title: "Error",
        description: "No se pudo descargar la información",
        variant: "destructive",
      })
    }
  }

  const formatCurrencyModal = (amount: number) => {
    return formatCurrencyGlobal(amount)
  }

  const formatDateModal = (dateString: string) => {
    if (!dateString) return ''
    try {
      const fechaStr = String(dateString)
      const fechaIso = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr

      if (fechaIso.includes('-')) {
        const [year, month, day] = fechaIso.split('-')
        // Construimos la fecha en UTC al mediodía (12:00) para evitar bordes de cambio de día
        const fecha = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0))
        return new Intl.DateTimeFormat('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        }).format(fecha)
      }
    } catch (e) {
      console.error("Error formateando fecha modal:", e)
    }

    // Fallback
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(date)
  }

  const getTipoPagoText = (tipo: string) => {
    switch (tipo) {
      case "DIARIO": return "Diario"
      case "SEMANAL": return "Semanal"
      case "LUNES_A_VIERNES": return "Lunes a Viernes"
      case "LUNES_A_SABADO": return "Lunes a Sábado"
      case "QUINCENAL": return "Quincenal"
      case "CATORCENAL": return "Catorcenal"
      case "FIN_DE_MES": return "Fin de Mes"
      case "MENSUAL": return "Mensual"
      case "TRIMESTRAL": return "Trimestral"
      case "CUATRIMESTRAL": return "Cuatrimestral"
      case "SEMESTRAL": return "Semestral"
      case "ANUAL": return "Anual"
      default: return tipo
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-[#0E1F1C]/90 border-b border-gray-200 dark:border-[#1F3A36] shadow-sm mb-6">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]">
                  <ArrowLeft className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Nuevo Préstamo</h1>
                <p className="text-xs text-gray-500 dark:text-emerald-300/80">Registra un préstamo para un cliente existente o nuevo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] shadow-sm">
            <CardHeader className="border-b border-gray-100 dark:border-[#1F3A36] pb-4">
              <CardTitle className="flex items-center space-x-2 text-xl font-bold text-gray-900 dark:text-white">
                <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>Crear Nuevo Préstamo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selección de cliente */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="cliente" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cliente *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMostrarFormularioCliente(!mostrarFormularioCliente)
                        if (mostrarFormularioCliente) {
                          resetFormularioCliente()
                        }
                      }}
                      className="text-xs border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                    >
                      <Plus className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                      Nuevo Cliente
                    </Button>
                  </div>

                  {!mostrarFormularioCliente ? (
                    <>
                      <BuscadorCliente
                        clientes={clientes}
                        clienteSeleccionadoId={clienteId}
                        onSelectCliente={setClienteId}
                        onCrearNuevoConTexto={(texto) => {
                          const esNumero = /^\d+$/.test(texto.trim())
                          setMostrarFormularioCliente(true)
                          if (esNumero) {
                            setNuevoCliente(prev => ({ ...prev, documento: texto.trim() }))
                          } else {
                            const partes = texto.trim().split(" ")
                            const nombre = partes[0] || ""
                            const apellido = partes.slice(1).join(" ") || ""
                            setNuevoCliente(prev => ({ ...prev, nombre, apellido }))
                          }
                        }}
                        loading={loadingClientes}
                      />
                      {selectedCliente && (
                        <div className="mt-3 p-4 bg-gray-50 dark:bg-[#152e2a] rounded-xl border border-gray-200 dark:border-[#1F3A36] text-sm space-y-1.5">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200 dark:border-[#1F3A36]">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-bold text-gray-900 dark:text-white">{selectedCliente.nombre} {selectedCliente.apellido}</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditarCliente(selectedCliente)}
                              className="text-xs h-7 px-2 border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                              disabled={loading || creandoCliente}
                            >
                              ✏️ Editar
                            </Button>
                          </div>
                          <p className="text-gray-600 dark:text-emerald-300/80">Código: <strong className="text-gray-900 dark:text-white">{selectedCliente.codigoCliente}</strong></p>
                          <p className="text-gray-600 dark:text-emerald-300/80">Documento: <strong className="text-gray-900 dark:text-white">{selectedCliente.documento}</strong></p>
                          <p className="text-gray-600 dark:text-emerald-300/80">Dirección: <strong className="text-gray-900 dark:text-white">{selectedCliente.direccionCliente}</strong></p>
                          {selectedCliente.direccionCobro && (
                            <p className="text-amber-600 dark:text-amber-400">Dir. Cobro: {selectedCliente.direccionCobro}</p>
                          )}
                          {selectedCliente.telefono && (
                            <p className="text-gray-600 dark:text-emerald-300/80">Teléfono: <strong className="text-gray-900 dark:text-white">{selectedCliente.telefono}</strong></p>
                          )}
                          {selectedCliente.pais && (
                            <p className="text-gray-600 dark:text-emerald-300/80">País: <strong className="text-gray-900 dark:text-white">{selectedCliente.pais}</strong></p>
                          )}
                          {selectedCliente.ciudad && (
                            <p className="text-gray-600 dark:text-emerald-300/80">Ciudad: <strong className="text-gray-900 dark:text-white">{selectedCliente.ciudad}</strong></p>
                          )}
                          {selectedCliente.referenciasPersonales && (
                            <p className="text-gray-600 dark:text-emerald-300/80">Referencias: <strong className="text-gray-900 dark:text-white">{selectedCliente.referenciasPersonales}</strong></p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border border-blue-200 dark:border-[#1F3A36] rounded-xl p-4 bg-blue-50/60 dark:bg-[#152e2a] space-y-4">
                      <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3">
                        {editandoCliente ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="codigoCliente" className="text-sm font-medium text-gray-700 dark:text-gray-200">Código Cliente</Label>
                          <Input
                            id="codigoCliente"
                            type="text"
                            value={nuevoCliente.codigoCliente}
                            onChange={(e) => handleNuevoClienteChange('codigoCliente', e.target.value.toUpperCase())}
                            placeholder="CL001 (automático si vacío)"
                            className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                            disabled={creandoCliente}
                          />
                        </div>

                        <div>
                          <Label htmlFor="documento" className="text-sm font-medium text-gray-700 dark:text-gray-200">Documento *</Label>
                          <Input
                            id="documento"
                            type="text"
                            value={nuevoCliente.documento}
                            onChange={(e) => handleNuevoClienteChange('documento', e.target.value)}
                            placeholder="12345678"
                            className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                            disabled={creandoCliente}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="nombre" className="text-sm font-medium text-gray-700 dark:text-gray-200">Nombre *</Label>
                          <Input
                            id="nombre"
                            type="text"
                            value={nuevoCliente.nombre}
                            onChange={(e) => handleNuevoClienteChange('nombre', e.target.value)}
                            placeholder="María"
                            className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                            disabled={creandoCliente}
                          />
                        </div>

                        <div>
                          <Label htmlFor="apellido" className="text-sm font-medium text-gray-700 dark:text-gray-200">Apellido *</Label>
                          <Input
                            id="apellido"
                            type="text"
                            value={nuevoCliente.apellido}
                            onChange={(e) => handleNuevoClienteChange('apellido', e.target.value)}
                            placeholder="García"
                            className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                            disabled={creandoCliente}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="direccionCliente" className="text-sm font-medium text-gray-700 dark:text-gray-200">Dirección Cliente *</Label>
                        <Input
                          id="direccionCliente"
                          type="text"
                          value={nuevoCliente.direccionCliente}
                          onChange={(e) => handleNuevoClienteChange('direccionCliente', e.target.value)}
                          placeholder="Calle 123 #45-67, Barrio Centro, Ciudad"
                          className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                          disabled={creandoCliente}
                        />
                      </div>

                      <div>
                        <Label htmlFor="direccionCobro" className="text-sm font-medium text-gray-700 dark:text-gray-200">Dirección de Cobro</Label>
                        <Input
                          id="direccionCobro"
                          type="text"
                          value={nuevoCliente.direccionCobro}
                          onChange={(e) => handleNuevoClienteChange('direccionCobro', e.target.value)}
                          placeholder="Carrera 15 #23-45, Oficina, Ciudad (opcional)"
                          className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                          disabled={creandoCliente}
                        />
                      </div>

                      <div>
                        <Label htmlFor="telefono" className="text-sm font-medium text-gray-700 dark:text-gray-200">Teléfono</Label>
                        <Input
                          id="telefono"
                          type="text"
                          value={nuevoCliente.telefono}
                          onChange={(e) => handleNuevoClienteChange('telefono', e.target.value)}
                          placeholder="3001234567"
                          className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                          disabled={creandoCliente}
                        />
                      </div>

                      <div>
                        <Label htmlFor="referenciasPersonales" className="text-sm font-medium text-gray-700 dark:text-gray-200">Referencias Personales</Label>
                        <Textarea
                          id="referenciasPersonales"
                          value={nuevoCliente.referenciasPersonales}
                          onChange={(e) => handleNuevoClienteChange('referenciasPersonales', e.target.value)}
                          placeholder="Nombres y contactos de referencias personales del cliente..."
                          className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                          disabled={creandoCliente}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pais" className="text-sm font-medium text-gray-700 dark:text-gray-200">País</Label>
                          <Input
                            id="pais"
                            type="text"
                            value={nuevoCliente.pais}
                            onChange={(e) => handleNuevoClienteChange('pais', e.target.value)}
                            placeholder="Colombia"
                            className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                            disabled={creandoCliente}
                          />
                        </div>

                        <div>
                          <Label htmlFor="ciudad" className="text-sm font-medium text-gray-700 dark:text-gray-200">Ciudad</Label>
                          <Input
                            id="ciudad"
                            type="text"
                            value={nuevoCliente.ciudad}
                            onChange={(e) => handleNuevoClienteChange('ciudad', e.target.value)}
                            placeholder="Bogotá"
                            className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                            disabled={creandoCliente}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="ubicacion" className="text-sm font-medium text-gray-700 dark:text-gray-200">Ubicación</Label>
                        <Input
                          id="ubicacion"
                          type="text"
                          value={nuevoCliente.ubicacion}
                          onChange={(e) => handleNuevoClienteChange('ubicacion', e.target.value)}
                          placeholder="Ej: Zona Sur, cerca del mercado"
                          className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                          disabled={creandoCliente}
                        />
                      </div>

                      <div>
                        <Label htmlFor="mapLink" className="text-sm font-medium text-gray-700 dark:text-gray-200">Link de Google Maps (opcional)</Label>
                        <Input
                          id="mapLink"
                          type="text"
                          value={nuevoCliente.mapLink}
                          onChange={(e) => handleNuevoClienteChange('mapLink', e.target.value)}
                          placeholder="https://maps.app.goo.gl/..."
                          className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                          disabled={creandoCliente}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          💡 Comparte una ubicación desde Google Maps en tu teléfono y pega el link aquí
                        </p>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={cancelarEdicion}
                          disabled={creandoCliente}
                          className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={editandoCliente ? handleActualizarCliente : handleCrearCliente}
                          disabled={creandoCliente || !nuevoCliente.documento || !nuevoCliente.nombre || !nuevoCliente.apellido || !nuevoCliente.direccionCliente}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        >
                          {creandoCliente ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              {editandoCliente ? 'Actualizando...' : 'Creando...'}
                            </>
                          ) : (
                            editandoCliente ? "Actualizar Cliente" : "Crear Cliente"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Monto */}
                <div>
                  <Label htmlFor="monto" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Monto del préstamo *</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <Input
                      id="monto"
                      type="text"
                      value={monto}
                      onChange={(e) => handleMontoChange(e.target.value)}
                      placeholder="Ej: 20.000 o 20000"
                      className="pl-10 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Interés */}
                <div>
                  <Label htmlFor="interes" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Interés (%) *</Label>
                  <div className="relative mt-1">
                    <Calculator className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <Input
                      id="interes"
                      type="text"
                      value={interes}
                      onChange={(e) => handleInteresChange(e.target.value)}
                      placeholder="Ej: 15 o 15,5"
                      className="pl-10 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Tipo de crédito y configuraciones adicionales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tipoCredito" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tipo de crédito *</Label>
                    <Select value={tipoCredito} onValueChange={setTipoCredito}>
                      <SelectTrigger className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="diasGracia" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Días de gracia</Label>
                    <Input
                      id="diasGracia"
                      type="number"
                      value={diasGracia}
                      onChange={(e) => setDiasGracia(e.target.value)}
                      placeholder="0"
                      className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                      disabled={loading}
                      min="0"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Días antes de considerar morosidad
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="moraCredito" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Mora crédito (%)</Label>
                    <Input
                      id="moraCredito"
                      type="number"
                      step="0.01"
                      value={moraCredito}
                      onChange={(e) => setMoraCredito(e.target.value)}
                      placeholder="0"
                      className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                      disabled={loading}
                      min="0"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Porcentaje por días vencidos
                    </div>
                  </div>
                </div>

                {/* Microseguro */}
                <div className="border border-purple-200 dark:border-[#1F3A36] rounded-xl p-4 bg-purple-50/60 dark:bg-[#152e2a]">
                  <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-3 flex items-center">
                    <Receipt className="h-4 w-4 mr-2" />
                    Micro seguro
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="microseguroTipo" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tipo de microseguro</Label>
                      <Select
                        value={microseguroTipo}
                        onValueChange={(value) => {
                          setMicroseguroTipo(value)
                          if (value === 'NINGUNO') {
                            setMicroseguroValor('')
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                          <SelectItem value="NINGUNO">Sin microseguro</SelectItem>
                          <SelectItem value="MONTO_FIJO">Monto fijo</SelectItem>
                          <SelectItem value="PORCENTAJE">Porcentaje del préstamo</SelectItem>
                          <SelectItem value="DEVOLUCION">Devolución de micro seguro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {microseguroTipo !== 'NINGUNO' && (
                      <div>
                        <Label htmlFor="microseguroValor" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {microseguroTipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 
                           microseguroTipo === 'DEVOLUCION' ? 'Monto a devolver' : 'Monto del microseguro'}
                        </Label>
                        <div className="relative mt-1">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                          <Input
                            id="microseguroValor"
                            type="text"
                            value={microseguroValor}
                            onChange={(e) => handleMicroseguroValorChange(e.target.value)}
                            placeholder={microseguroTipo === 'MONTO_FIJO' || microseguroTipo === 'DEVOLUCION' ? 'Ej: 5000' : 'Ej: 2.5'}
                            className="pl-10 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                            disabled={loading}
                          />
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                          {microseguroTipo === 'MONTO_FIJO'
                            ? 'Monto fijo a cobrar por el microseguro'
                            : microseguroTipo === 'DEVOLUCION'
                            ? 'Monto a descontar del préstamo por devolución de seguro'
                            : 'Porcentaje del monto del préstamo'
                          }
                        </div>
                      </div>
                    )}
                  </div>

                  {microseguroTipo !== 'NINGUNO' && microseguroTotal > 0 && (
                    <div className="mt-3 p-3 bg-purple-100 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-purple-800 dark:text-purple-300 font-semibold">{microseguroTipo === 'DEVOLUCION' ? 'Devolución de seguro:' : 'Total del microseguro:'}</span>
                        <span className="text-lg font-bold text-purple-900 dark:text-purple-200">{microseguroTipo === 'DEVOLUCION' ? '-' : ''}{formatCurrency(microseguroTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tipo de pago y cuotas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipoPago" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tipo de pago *</Label>
                    <Select value={tipoPago} onValueChange={setTipoPago}>
                      <SelectTrigger className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                        <SelectItem value="DIARIO">Diario</SelectItem>
                        <SelectItem value="SEMANAL">Semanal</SelectItem>
                        <SelectItem value="LUNES_A_VIERNES">Lunes a Viernes</SelectItem>
                        <SelectItem value="LUNES_A_SABADO">Lunes a Sábado</SelectItem>
                        <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                        <SelectItem value="CATORCENAL">Catorcenal</SelectItem>
                        <SelectItem value="FIN_DE_MES">Fin de Mes</SelectItem>
                        <SelectItem value="MENSUAL">Mensual</SelectItem>
                        <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                        <SelectItem value="CUATRIMESTRAL">Cuatrimestral</SelectItem>
                        <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                        <SelectItem value="ANUAL">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cuotas" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Número de cuotas *</Label>
                    <Input
                      id="cuotas"
                      type="text"
                      value={cuotas}
                      onChange={(e) => handleCuotasChange(e.target.value)}
                      placeholder="0"
                      className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Fecha de inicio */}
                <div>
                  <Label htmlFor="fechaInicio" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Fecha de inicio *</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <Input
                      id="fechaInicio"
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      onClick={(e) => {
                        try {
                          if (typeof (e.target as HTMLInputElement).showPicker === 'function') {
                            (e.target as HTMLInputElement).showPicker()
                          }
                        } catch (error) {
                          console.log('showPicker not supported', error)
                        }
                      }}
                      className="pl-10 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white cursor-pointer"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <Label htmlFor="observaciones" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones opcionales..."
                    className="mt-1 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
                    disabled={loading}
                  />
                </div>

                {/* Resumen de cálculos */}
                {(monto && interes && cuotas) && (
                  <div className="bg-blue-50/60 dark:bg-[#152e2a] border border-blue-200 dark:border-[#1F3A36] rounded-xl p-4">
                    <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3">Resumen del préstamo</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-emerald-300/80">Monto prestado:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(parseSpanishNumber(monto))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-emerald-300/80">Interés ({interes}%):</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency((parseSpanishNumber(monto) * parseSpanishNumber(interes)) / 100)}</span>
                      </div>
                      {microseguroTipo !== 'NINGUNO' && microseguroTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-purple-700 dark:text-purple-300">{microseguroTipo === 'DEVOLUCION' ? 'Devolución de seguro:' : 'Microseguro:'}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{microseguroTipo === 'DEVOLUCION' ? '-' : ''}{formatCurrency(microseguroTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-blue-200 dark:border-[#1F3A36] pt-2">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Total a pagar:</span>
                        <span className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(montoTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Valor por cuota:</span>
                        <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(valorCuota)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-[#1F3A36]">
                  <Link href="/dashboard">
                    <Button variant="outline" disabled={loading} className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]">
                      Cancelar
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    disabled={loading || mostrarFormularioCliente || !clienteId || !monto || !interes || !cuotas}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      "Crear Préstamo"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Préstamo Creado */}
      <Dialog open={modalPrestamoAbierto} onOpenChange={handleCerrarModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
          <DialogHeader className="border-b border-gray-200 dark:border-[#1F3A36] pb-3">
            <DialogTitle className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <Check className="h-5 w-5" />
              <span>✅ Préstamo Creado Exitosamente</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-emerald-300/80">
              {prestamoCreado ? 'Revisa los detalles del préstamo y cierra cuando termines' : 'Preparando información...'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {prestamoCreado ? (
              <>
                <div ref={boletaRef} className="bg-white dark:bg-[#0E1F1C] p-2 rounded-xl">
                  <div className="max-w-md mx-auto space-y-4">
                    {/* Información del Cliente */}
                    <Card className="bg-white dark:bg-[#152e2a] border border-gray-200 dark:border-[#1F3A36] shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center mb-3">
                          <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Información del Cliente</h3>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                            {prestamoCreado.cliente.nombre} {prestamoCreado.cliente.apellido}
                          </h4>
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <CreditCard className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                            <span>Cédula: {prestamoCreado.cliente.cedula}</span>
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <User className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                            <span>{prestamoCreado.cliente.direccion}</span>
                          </div>
                          {prestamoCreado.cliente.telefono && (
                            <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                              <span className="text-sm font-medium">{prestamoCreado.cliente.telefono}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Información del Préstamo */}
                    <Card className="bg-white dark:bg-[#152e2a] border border-gray-200 dark:border-[#1F3A36] shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Información del Préstamo</h3>
                          </div>
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full font-semibold">
                            {prestamoCreado.estado}
                          </span>
                        </div>

                        {/* Montos principales */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrencyModal(prestamoCreado.monto)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-emerald-300/80 font-medium">Monto Prestado</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                              $ 0
                            </p>
                            <p className="text-xs text-gray-500 dark:text-emerald-300/80 font-medium">Total Pagado</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrencyModal(prestamoCreado.monto + (prestamoCreado.monto * prestamoCreado.interes / 100))}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-emerald-300/80 font-medium">Saldo Pendiente</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrencyModal(prestamoCreado.valorCuota)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-emerald-300/80 font-medium">Valor Cuota</p>
                          </div>
                        </div>

                        <Separator className="my-3 border-gray-200 dark:border-[#1F3A36]" />

                        {/* Detalles del préstamo */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-emerald-300/80">Tipo de pago:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">Diario</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-emerald-300/80">Total cuotas:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{prestamoCreado.cuotas}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-emerald-300/80">Cuotas pagadas:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-emerald-300/80">Fecha inicio:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatDateModal(prestamoCreado.fechaInicio)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-emerald-300/80">Fecha fin:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatDateModal(prestamoCreado.fechaFin)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-emerald-300/80">Monto total:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrencyModal(prestamoCreado.monto + (prestamoCreado.monto * prestamoCreado.interes / 100))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-emerald-300/80">Progreso del préstamo:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">0.0%</span>
                          </div>
                        </div>

                        {/* ID del préstamo */}
                        <div className="mt-4 bg-blue-50/70 dark:bg-[#0E1F1C] border border-blue-200 dark:border-[#1F3A36] rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-600 dark:text-emerald-300/80 mb-1">ID del Préstamo</p>
                          <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                            PREST-{prestamoCreado.id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Mensaje de éxito */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-4 border border-emerald-200 dark:border-emerald-900/50 text-center">
                  <div className="text-emerald-600 dark:text-emerald-400 mb-2">
                    <Check className="h-8 w-8 mx-auto mb-2" />
                    <h3 className="font-bold text-emerald-800 dark:text-emerald-300">¡Préstamo Registrado Exitosamente!</h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">El préstamo ha sido creado y está activo</p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-[#1F3A36]">
                  {/* Botón de compartir desplegable */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex-1 border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]">
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartir
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
                      <DropdownMenuItem
                        onClick={() => console.log('WhatsApp préstamo - Por implementar')}
                        className="flex items-center space-x-2 py-3 hover:bg-gray-100 dark:hover:bg-[#152e2a]"
                      >
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">WhatsApp</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Enviar información</span>
                        </div>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleDescargarPrestamo}
                        className="flex items-center space-x-2 py-3 hover:bg-gray-100 dark:hover:bg-[#152e2a]"
                      >
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Share2 className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">Descargar PNG</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Guardar como imagen</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    onClick={handleCerrarModal}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    size="lg"
                  >
                    ✅ Cerrar y Continuar
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Preparando información del préstamo...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

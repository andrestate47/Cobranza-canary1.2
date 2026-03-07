
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { ArrowLeft, Plus, Trash2, Edit2, Users, MapPin, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"

interface Ruta {
  id: string
  numero: string
  nombre: string
  descripcion: string | null
  color: string | null
  activa: boolean
  usuarios: {
    id: string
    name: string | null
    email: string
    role: string
  }[]
  clientes: {
    id: string
    nombre: string
    apellido: string
    codigoCliente: string
    documento: string
    telefono: string | null
  }[]
  _count: {
    usuarios: number
    clientes: number
  }
}

interface Usuario {
  id: string
  name: string | null
  email: string
  role: string
  rutaId: string | null
  numeroRuta: string | null
}

interface Cliente {
  id: string
  nombre: string
  apellido: string
  codigoCliente: string
  documento: string
  rutaId: string | null
}

interface FormularioRuta {
  id?: string
  numero: string
  nombre: string
  descripcion: string
  color: string
}

const COLORES_PREDEFINIDOS = [
  { valor: "#3B82F6", nombre: "Azul" },
  { valor: "#10B981", nombre: "Verde" },
  { valor: "#F59E0B", nombre: "Amarillo" },
  { valor: "#EF4444", nombre: "Rojo" },
  { valor: "#8B5CF6", nombre: "Morado" },
  { valor: "#EC4899", nombre: "Rosa" },
  { valor: "#06B6D4", nombre: "Cian" },
  { valor: "#F97316", nombre: "Naranja" },
]

export default function GestionRutas() {
  const router = useRouter()
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [cobradores, setCobradores] = useState<Usuario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Estados para modales
  const [modalRutaAbierto, setModalRutaAbierto] = useState(false)
  const [modalCobradorAbierto, setModalCobradorAbierto] = useState(false)
  const [modalClientesAbierto, setModalClientesAbierto] = useState(false)
  const [alertEliminarAbierto, setAlertEliminarAbierto] = useState(false)
  
  // Estados para formularios
  const [formularioRuta, setFormularioRuta] = useState<FormularioRuta>({
    numero: "",
    nombre: "",
    descripcion: "",
    color: COLORES_PREDEFINIDOS[0].valor
  })
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null)
  const [cobradorSeleccionado, setCobradorSeleccionado] = useState<string>("")
  const [rutaParaAsignar, setRutaParaAsignar] = useState<string>("")
  const [clientesSeleccionados, setClientesSeleccionados] = useState<string[]>([])
  const [rutaParaClientes, setRutaParaClientes] = useState<string>("")

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setLoading(true)
      
      // Cargar rutas
      const resRutas = await fetch("/api/admin/rutas")
      if (!resRutas.ok) throw new Error("Error al cargar rutas")
      const dataRutas = await resRutas.json()
      setRutas(dataRutas)

      // Cargar cobradores
      const resCobradores = await fetch("/api/usuarios?role=COBRADOR")
      if (!resCobradores.ok) throw new Error("Error al cargar cobradores")
      const dataCobradores = await resCobradores.json()
      setCobradores(dataCobradores)

      // Cargar clientes
      const resClientes = await fetch("/api/admin/clientes/todos")
      if (!resClientes.ok) throw new Error("Error al cargar clientes")
      const dataClientes = await resClientes.json()
      setClientes(dataClientes)

    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  function abrirModalNuevaRuta() {
    setFormularioRuta({
      numero: "",
      nombre: "",
      descripcion: "",
      color: COLORES_PREDEFINIDOS[0].valor
    })
    setModalRutaAbierto(true)
  }

  function abrirModalEditarRuta(ruta: Ruta) {
    setFormularioRuta({
      id: ruta.id,
      numero: ruta.numero,
      nombre: ruta.nombre,
      descripcion: ruta.descripcion || "",
      color: ruta.color || COLORES_PREDEFINIDOS[0].valor
    })
    setModalRutaAbierto(true)
  }

  async function guardarRuta() {
    if (!formularioRuta.numero || !formularioRuta.nombre) {
      toast.error("Número y nombre son obligatorios")
      return
    }

    try {
      setSaving(true)
      
      const esEdicion = !!formularioRuta.id
      const metodo = esEdicion ? "PUT" : "POST"
      
      const res = await fetch("/api/admin/rutas", {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formularioRuta)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar ruta")
      }

      toast.success(esEdicion ? "Ruta actualizada" : "Ruta creada exitosamente")
      setModalRutaAbierto(false)
      await cargarDatos()
    } catch (error: unknown) {
      console.error("Error al guardar ruta:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar ruta")
    } finally {
      setSaving(false)
    }
  }

  function confirmarEliminarRuta(ruta: Ruta) {
    setRutaSeleccionada(ruta)
    setAlertEliminarAbierto(true)
  }

  async function eliminarRuta() {
    if (!rutaSeleccionada) return

    try {
      setSaving(true)
      
      const res = await fetch(`/api/admin/rutas?id=${rutaSeleccionada.id}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al eliminar ruta")
      }

      const resultado = await res.json()
      toast.success(`Ruta eliminada. Se desasignaron ${resultado.desasociados.usuarios} cobradores y ${resultado.desasociados.clientes} clientes`)
      setAlertEliminarAbierto(false)
      await cargarDatos()
    } catch (error: unknown) {
      console.error("Error al eliminar ruta:", error)
      toast.error(error instanceof Error ? error.message : "Error al eliminar ruta")
    } finally {
      setSaving(false)
    }
  }

  function abrirModalAsignarCobrador(ruta: Ruta) {
    setRutaSeleccionada(ruta)
    setCobradorSeleccionado("")
    setModalCobradorAbierto(true)
  }

  async function asignarCobrador() {
    if (!cobradorSeleccionado || !rutaSeleccionada) {
      toast.error("Selecciona un cobrador")
      return
    }

    try {
      setSaving(true)
      
      const res = await fetch("/api/admin/rutas/asignar-cobrador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: cobradorSeleccionado,
          rutaId: rutaSeleccionada.id
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al asignar cobrador")
      }

      toast.success("Cobrador asignado exitosamente")
      setModalCobradorAbierto(false)
      await cargarDatos()
    } catch (error: unknown) {
      console.error("Error al asignar cobrador:", error)
      toast.error(error instanceof Error ? error.message : "Error al asignar cobrador")
    } finally {
      setSaving(false)
    }
  }

  async function desasignarCobrador(userId: string) {
    try {
      setSaving(true)
      
      const res = await fetch("/api/admin/rutas/asignar-cobrador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          rutaId: null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al desasignar cobrador")
      }

      toast.success("Cobrador desasignado exitosamente")
      await cargarDatos()
    } catch (error: unknown) {
      console.error("Error al desasignar cobrador:", error)
      toast.error(error instanceof Error ? error.message : "Error al desasignar cobrador")
    } finally {
      setSaving(false)
    }
  }

  async function desasignarCliente(clienteId: string) {
    try {
      setSaving(true)
      
      const res = await fetch("/api/admin/rutas/asignar-clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteIds: [clienteId],
          rutaId: null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al desasignar cliente")
      }

      toast.success("Cliente desasignado exitosamente")
      await cargarDatos()
    } catch (error: unknown) {
      console.error("Error al desasignar cliente:", error)
      toast.error(error instanceof Error ? error.message : "Error al desasignar cliente")
    } finally {
      setSaving(false)
    }
  }

  function abrirModalAsignarClientes() {
    setClientesSeleccionados([])
    setRutaParaClientes("")
    setModalClientesAbierto(true)
  }

  async function asignarClientes() {
    if (clientesSeleccionados.length === 0) {
      toast.error("Selecciona al menos un cliente")
      return
    }

    if (!rutaParaClientes) {
      toast.error("Selecciona una ruta")
      return
    }

    try {
      setSaving(true)
      
      const res = await fetch("/api/admin/rutas/asignar-clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteIds: clientesSeleccionados,
          rutaId: rutaParaClientes
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al asignar clientes")
      }

      const resultado = await res.json()
      toast.success(resultado.message)
      setModalClientesAbierto(false)
      await cargarDatos()
    } catch (error: unknown) {
      console.error("Error al asignar clientes:", error)
      toast.error(error instanceof Error ? error.message : "Error al asignar clientes")
    } finally {
      setSaving(false)
    }
  }

  function toggleClienteSeleccionado(clienteId: string) {
    setClientesSeleccionados(prev => {
      if (prev.includes(clienteId)) {
        return prev.filter(id => id !== clienteId)
      } else {
        return [...prev, clienteId]
      }
    })
  }

  function seleccionarTodosClientes() {
    const clientesSinRuta = clientes.filter(c => !c.rutaId)
    setClientesSeleccionados(clientesSinRuta.map(c => c.id))
  }

  function deseleccionarTodosClientes() {
    setClientesSeleccionados([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando gestión de rutas...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Gestión de Rutas</h1>
                  <p className="text-sm text-gray-500">Administra rutas y asigna cobradores</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={abrirModalAsignarClientes} 
                  disabled={saving}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Asignar Clientes
                </Button>
                <Button onClick={abrirModalNuevaRuta} disabled={saving}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Ruta
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Resumen */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rutas</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rutas.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobradores Asignados</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cobradores.filter(c => c.rutaId).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobradores Sin Ruta</CardTitle>
                <Users className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cobradores.filter(c => !c.rutaId).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cobradores</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cobradores.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Rutas */}
          <Card>
            <CardHeader>
              <CardTitle>Rutas Disponibles</CardTitle>
              <CardDescription>
                Gestiona las rutas de cobranza y sus cobradores asignados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rutas.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No hay rutas creadas</p>
                  <Button onClick={abrirModalNuevaRuta} disabled={saving}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Ruta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rutas.map((ruta) => (
                    <div
                      key={ruta.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: ruta.color || "#3B82F6" }}
                            />
                            <h3 className="font-semibold text-lg text-gray-900">
                              Ruta {ruta.numero} - {ruta.nombre}
                            </h3>
                          </div>
                          {ruta.descripcion && (
                            <p className="text-sm text-gray-600 mb-2">{ruta.descripcion}</p>
                          )}
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>{ruta._count.usuarios} cobradores</span>
                            <span>•</span>
                            <span>{ruta._count.clientes} clientes</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalAsignarCobrador(ruta)}
                            disabled={saving}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Asignar Cobrador
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalEditarRuta(ruta)}
                            disabled={saving}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmarEliminarRuta(ruta)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>

                      {/* Cobradores asignados */}
                      {ruta.usuarios.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Cobradores Asignados:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ruta.usuarios.map((usuario) => (
                              <div
                                key={usuario.id}
                                className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-300"
                              >
                                <span className="text-sm">{usuario.name || usuario.email}</span>
                                <button
                                  onClick={() => desasignarCobrador(usuario.id)}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={saving}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clientes asignados */}
                      {ruta.clientes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Clientes Asignados ({ruta.clientes.length}):
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                            {ruta.clientes.map((cliente) => (
                              <div
                                key={cliente.id}
                                className="flex items-start justify-between gap-2 bg-white p-3 rounded-lg border border-gray-300 hover:border-blue-400 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900 truncate">
                                    {cliente.nombre} {cliente.apellido}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Código: {cliente.codigoCliente}
                                  </div>
                                  {cliente.telefono && (
                                    <div className="text-xs text-gray-500">
                                      Tel: {cliente.telefono}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => desasignarCliente(cliente.id)}
                                  className="text-red-600 hover:text-red-700 flex-shrink-0"
                                  disabled={saving}
                                  title="Desasignar cliente"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cobradores Sin Asignar */}
          {cobradores.filter(c => !c.rutaId).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cobradores Sin Ruta Asignada</CardTitle>
                <CardDescription>
                  Estos cobradores no tienen una ruta asignada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cobradores.filter(c => !c.rutaId).map((cobrador) => (
                    <div
                      key={cobrador.id}
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {cobrador.name || cobrador.email}
                        </div>
                        <div className="text-sm text-gray-500">{cobrador.email}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCobradorSeleccionado(cobrador.id)
                          setRutaSeleccionada(null)
                          setModalCobradorAbierto(true)
                        }}
                        disabled={saving}
                      >
                        Asignar a Ruta
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Crear/Editar Ruta */}
      <Dialog open={modalRutaAbierto} onOpenChange={setModalRutaAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formularioRuta.id ? "Editar Ruta" : "Nueva Ruta"}
            </DialogTitle>
            <DialogDescription>
              {formularioRuta.id 
                ? "Modifica los datos de la ruta" 
                : "Crea una nueva ruta de cobranza"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="numero">Número de Ruta *</Label>
              <Input
                id="numero"
                type="text"
                value={formularioRuta.numero}
                onChange={(e) => setFormularioRuta({...formularioRuta, numero: e.target.value})}
                placeholder="Ej: 001"
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                type="text"
                value={formularioRuta.nombre}
                onChange={(e) => setFormularioRuta({...formularioRuta, nombre: e.target.value})}
                placeholder="Ej: Ruta Centro"
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formularioRuta.descripcion}
                onChange={(e) => setFormularioRuta({...formularioRuta, descripcion: e.target.value})}
                placeholder="Descripción de la ruta (opcional)"
                disabled={saving}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2 mt-2">
                {COLORES_PREDEFINIDOS.map((colorItem) => (
                  <button
                    key={colorItem.valor}
                    type="button"
                    onClick={() => setFormularioRuta({...formularioRuta, color: colorItem.valor})}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formularioRuta.color === colorItem.valor 
                        ? "border-gray-900 scale-110" 
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: colorItem.valor }}
                    disabled={saving}
                    title={colorItem.nombre}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalRutaAbierto(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={guardarRuta} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Asignar Cobrador */}
      <Dialog open={modalCobradorAbierto} onOpenChange={setModalCobradorAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Cobrador a Ruta</DialogTitle>
            <DialogDescription>
              {rutaSeleccionada 
                ? `Selecciona un cobrador para asignar a ${rutaSeleccionada.nombre}` 
                : "Selecciona una ruta para el cobrador"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!rutaSeleccionada && (
              <div>
                <Label htmlFor="ruta-select">Ruta</Label>
                <Select
                  value={rutaParaAsignar}
                  onValueChange={setRutaParaAsignar}
                  disabled={saving}
                >
                  <SelectTrigger id="ruta-select">
                    <SelectValue placeholder="Selecciona una ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {rutas.map((ruta) => (
                      <SelectItem key={ruta.id} value={ruta.id}>
                        Ruta {ruta.numero} - {ruta.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="cobrador-select">Cobrador</Label>
              <Select
                value={cobradorSeleccionado}
                onValueChange={setCobradorSeleccionado}
                disabled={saving}
              >
                <SelectTrigger id="cobrador-select">
                  <SelectValue placeholder="Selecciona un cobrador" />
                </SelectTrigger>
                <SelectContent>
                  {cobradores
                    .filter(c => !rutaSeleccionada || !c.rutaId || c.rutaId !== rutaSeleccionada.id)
                    .map((cobrador) => (
                      <SelectItem key={cobrador.id} value={cobrador.id}>
                        {cobrador.name || cobrador.email}
                        {cobrador.rutaId && " (Ya asignado)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalCobradorAbierto(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (rutaSeleccionada) {
                  await asignarCobrador()
                } else if (rutaParaAsignar && cobradorSeleccionado) {
                  try {
                    setSaving(true)
                    const res = await fetch("/api/admin/rutas/asignar-cobrador", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: cobradorSeleccionado,
                        rutaId: rutaParaAsignar
                      })
                    })
                    if (!res.ok) throw new Error("Error al asignar")
                    toast.success("Cobrador asignado exitosamente")
                    setModalCobradorAbierto(false)
                    await cargarDatos()
                  } catch (error) {
                    toast.error("Error al asignar cobrador")
                  } finally {
                    setSaving(false)
                  }
                }
              }} 
              disabled={saving || !cobradorSeleccionado || (!rutaSeleccionada && !rutaParaAsignar)}
            >
              {saving ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Asignar Clientes */}
      <Dialog open={modalClientesAbierto} onOpenChange={setModalClientesAbierto}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Asignar Clientes a Ruta</DialogTitle>
            <DialogDescription>
              Selecciona los clientes sin ruta asignada y la ruta a la que deseas asignarlos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ruta-clientes">Ruta Destino</Label>
              <Select
                value={rutaParaClientes}
                onValueChange={setRutaParaClientes}
                disabled={saving}
              >
                <SelectTrigger id="ruta-clientes">
                  <SelectValue placeholder="Selecciona una ruta" />
                </SelectTrigger>
                <SelectContent>
                  {rutas.map((ruta) => (
                    <SelectItem key={ruta.id} value={ruta.id}>
                      Ruta {ruta.numero} - {ruta.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Clientes Sin Ruta ({clientes.filter(c => !c.rutaId).length})</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={seleccionarTodosClientes}
                    disabled={saving}
                  >
                    Seleccionar Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deseleccionarTodosClientes}
                    disabled={saving}
                  >
                    Deseleccionar
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                {clientes.filter(c => !c.rutaId).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No hay clientes sin ruta asignada
                  </div>
                ) : (
                  <div className="divide-y">
                    {clientes.filter(c => !c.rutaId).map((cliente) => (
                      <label
                        key={cliente.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={clientesSeleccionados.includes(cliente.id)}
                          onChange={() => toggleClienteSeleccionado(cliente.id)}
                          disabled={saving}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {cliente.nombre} {cliente.apellido}
                          </div>
                          <div className="text-sm text-gray-500">
                            Código: {cliente.codigoCliente} • Doc: {cliente.documento}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {clientesSeleccionados.length > 0 && (
                <div className="mt-2 text-sm text-blue-600">
                  {clientesSeleccionados.length} cliente(s) seleccionado(s)
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalClientesAbierto(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={asignarClientes} 
              disabled={saving || clientesSeleccionados.length === 0 || !rutaParaClientes}
            >
              {saving ? "Asignando..." : `Asignar ${clientesSeleccionados.length} Cliente(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: Eliminar Ruta */}
      <AlertDialog open={alertEliminarAbierto} onOpenChange={setAlertEliminarAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la ruta <strong>{rutaSeleccionada?.nombre}</strong>.
              Los cobradores y clientes asignados serán desasociados de esta ruta.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarRuta}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


"use client"

import { useState, useEffect } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  RefreshCw,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Save, X, Trash2 } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"

interface CierreDia {
  id: string
  fecha: string
  totalCobrado: number
  totalPrestado: number
  totalGastos: number
  saldoEfectivo: number
  observaciones?: string
  createdAt: string
  usuario: {
    nombre: string
  }
}

interface CierresDiaClientProps {
  session: Session
}

export default function CierresDiaClient({ session }: CierresDiaClientProps) {
  const [cierres, setCierres] = useState<CierreDia[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Estados para edición
  const [editingCierre, setEditingCierre] = useState<CierreDia | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Estados para eliminación
  const [deletingCierre, setDeletingCierre] = useState<CierreDia | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    totalCobrado: "",
    totalPrestado: "",
    totalGastos: "",
    saldoEfectivo: "",
    observaciones: ""
  })

  const fetchCierres = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cierre-dia')
      if (response.ok) {
        const data = await response.json()
        setCierres(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los cierres",
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

  useEffect(() => {
    fetchCierres()
  }, [])

  const handleEditClick = (cierre: CierreDia) => {
    setEditingCierre(cierre)
    setFormData({
      totalCobrado: cierre.totalCobrado.toString(),
      totalPrestado: cierre.totalPrestado.toString(),
      totalGastos: cierre.totalGastos.toString(),
      saldoEfectivo: cierre.saldoEfectivo.toString(),
      observaciones: cierre.observaciones || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (cierre: CierreDia) => {
    setDeletingCierre(cierre)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingCierre) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/cierre-dia?id=${deletingCierre.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Cierre eliminado correctamente",
          variant: "default",
        })
        setIsDeleteDialogOpen(false)
        setDeletingCierre(null)
        fetchCierres() // Recargar datos
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error delete:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el cierre",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCierre = async () => {
    if (!editingCierre) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/cierre-dia', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCierre.id,
          totalCobrado: formData.totalCobrado,
          totalPrestado: formData.totalPrestado,
          totalGastos: formData.totalGastos,
          saldoEfectivo: formData.saldoEfectivo,
          observaciones: formData.observaciones
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Cierre actualizado correctamente",
          variant: "default",
        })
        setIsEditDialogOpen(false)
        fetchCierres() // Recargar datos
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al actualizar")
      }
    } catch (error) {
      console.error("Error update:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el cierre",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const { format: formatCurrency } = useCurrency()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#071311] transition-colors">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071311] pb-12 transition-colors">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-[#0E1F1C]/90 border-b border-gray-200 dark:border-[#1F3A36] shadow-sm">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Cierres del Día</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCierres}
                className="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#1A3330]"
              >
                <RefreshCw className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Actualizar</span>
              </Button>
              <Link href="/informes-dia">
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-sm">
                  <Eye className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Ver Informe Hoy</span>
                  <span className="md:hidden">Informe</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        {/* Estadísticas generales */}
        {cierres.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="animate-fadeInScale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Días</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {cierres.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Días cerrados
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fadeInScale" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(cierres.reduce((sum, c) => sum + c.totalCobrado, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Todos los días
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fadeInScale" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Prestado</CardTitle>
                <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(cierres.reduce((sum, c) => sum + c.totalPrestado, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Todos los días
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fadeInScale" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Último Saldo</CardTitle>
                <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${cierres[0]?.saldoEfectivo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                  {formatCurrency(cierres[0]?.saldoEfectivo || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(cierres[0]?.fecha)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de cierres */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Historial de Cierres
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {cierres.length} cierre{cierres.length !== 1 ? 's' : ''}
            </div>
          </div>

          {cierres.map((cierre, index) => (
            <Card
              key={cierre.id}
              className="list-item animate-fadeInScale"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {formatDate(cierre.fecha)}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <User className="h-3 w-3" />
                      <span>Cerrado por {cierre.usuario.nombre}</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(cierre.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {session.user.role === "ADMINISTRADOR" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                          onClick={() => handleDeleteClick(cierre)}
                          title="Eliminar cierre"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950"
                          onClick={() => handleEditClick(cierre)}
                          title="Editar cierre"
                        >
                          <Pencil className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      </>
                    )}
                    <Badge variant="default" className="bg-green-500 dark:bg-emerald-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Cerrado
                    </Badge>
                  </div>
                </div>

                {/* Métricas del día */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800/80 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(cierre.totalCobrado)}
                    </div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Cobrado</div>
                  </div>

                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(cierre.totalPrestado)}
                    </div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Prestado</div>
                  </div>

                  <div className="text-center p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-lg">
                    <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(cierre.totalGastos)}
                    </div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Gastos</div>
                  </div>

                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 rounded-lg">
                    <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                    <div className={`text-lg font-bold ${cierre.saldoEfectivo >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                      }`}>
                      {formatCurrency(cierre.saldoEfectivo)}
                    </div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Saldo Final</div>
                  </div>
                </div>

                {cierre.observaciones && (
                  <div className="bg-gray-50 dark:bg-[#173333] border dark:border-[#34766D] rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Observaciones:
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {cierre.observaciones}
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <Link href={`/informes-dia?fecha=${cierre.fecha.split('T')[0]}`}>
                    <Button variant="outline" size="sm" className="border-gray-300 dark:border-[#1F3A36] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330] font-semibold">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalle
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {cierres.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay cierres registrados
              </h3>
              <p className="text-gray-500 mb-6">
                Los cierres del día aparecerán aquí una vez que se realicen
              </p>
              <Link href="/informes-dia">
                <Button className="btn-primary">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Informe del Día
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Cierre del Día</DialogTitle>
            <DialogDescription>
              Modifica los valores del cierre. Esta acción solo la pueden realizar administradores.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalCobrado">Total Cobrado</Label>
                <div className="relative">
                  <span className="absolute left-2 top-2.5 text-gray-500">$</span>
                  <Input
                    id="totalCobrado"
                    value={formData.totalCobrado}
                    onChange={(e) => setFormData({ ...formData, totalCobrado: e.target.value })}
                    className="pl-6"
                    type="number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalPrestado">Total Prestado</Label>
                <div className="relative">
                  <span className="absolute left-2 top-2.5 text-gray-500">$</span>
                  <Input
                    id="totalPrestado"
                    value={formData.totalPrestado}
                    onChange={(e) => setFormData({ ...formData, totalPrestado: e.target.value })}
                    className="pl-6"
                    type="number"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalGastos">Total Gastos</Label>
                <div className="relative">
                  <span className="absolute left-2 top-2.5 text-gray-500">$</span>
                  <Input
                    id="totalGastos"
                    value={formData.totalGastos}
                    onChange={(e) => setFormData({ ...formData, totalGastos: e.target.value })}
                    className="pl-6"
                    type="number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="saldoEfectivo">Saldo Efectivo</Label>
                <div className="relative">
                  <span className="absolute left-2 top-2.5 text-gray-500">$</span>
                  <Input
                    id="saldoEfectivo"
                    value={formData.saldoEfectivo}
                    onChange={(e) => setFormData({ ...formData, saldoEfectivo: e.target.value })}
                    className="pl-6"
                    type="number"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={handleUpdateCierre} disabled={isSubmitting}>
              {isSubmitting ? (
                <>Guardando...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Eliminar Cierre del Día
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar el cierre del día <strong>{deletingCierre ? formatDate(deletingCierre.fecha) : ''}</strong>?
              <br /><br />
              <span className="font-semibold text-red-500">Esta acción no se puede deshacer.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Eliminando...' : 'Sí, eliminar cierre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

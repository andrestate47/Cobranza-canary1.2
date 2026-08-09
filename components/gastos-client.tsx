
"use client"

import { useState, useEffect, useMemo } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  Receipt,
  RefreshCw,
  User,
  DollarSign,
  Trash2,
  FileText,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import dynamic from "next/dynamic"
import { useInView } from "react-intersection-observer"

const NuevoGastoModal = dynamic(() => import("@/components/nuevo-gasto-modal"), { ssr: false })
const ImageViewerModal = dynamic(() => import("@/components/image-viewer-modal"), { ssr: false })
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

interface Gasto {
  id: string
  concepto: string
  monto: number
  fecha: string
  observaciones?: string
  tieneComprobante?: boolean
  usuario: {
    nombre: string
  }
}

interface GastosClientProps {
  session: Session
}

export default function GastosClient({ session }: GastosClientProps) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [fechaFiltro, setFechaFiltro] = useState("")
  const [showNuevoGasto, setShowNuevoGasto] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)

  // Estado para visualización de imagen
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string, title: string, subtitle?: string } | null>(null)

  const { ref: observerRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  })

  // Cargar más al llegar al final
  useEffect(() => {
    if (inView) {
      setVisibleCount(prev => prev + 20)
    }
  }, [inView])

  // Resetear el conteo visible al cambiar los filtros
  useEffect(() => {
    setVisibleCount(20)
  }, [searchTerm, fechaFiltro])

  // Estado para eliminación
  const [gastoAEliminar, setGastoAEliminar] = useState<{ id: string, concepto: string } | null>(null)
  const [eliminandoGasto, setEliminandoGasto] = useState(false)

  const { toast } = useToast()

  const fetchGastos = async () => {
    setLoading(true)
    try {
      let url = '/api/gastos'
      if (fechaFiltro) {
        url += `?fecha=${fechaFiltro}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setGastos(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los gastos",
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
    fetchGastos()
  }, [fechaFiltro])

  const filteredGastos = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    return gastos.filter(gasto => {
      return (
        gasto.concepto.toLowerCase().includes(searchLower) ||
        gasto.usuario.nombre.toLowerCase().includes(searchLower) ||
        gasto.observaciones?.toLowerCase().includes(searchLower)
      )
    })
  }, [searchTerm, gastos])

  const onGastoSuccess = () => {
    setShowNuevoGasto(false)
    fetchGastos() // Recargar lista
    toast({
      title: "Gasto registrado",
      description: "El gasto se ha registrado exitosamente",
    })
  }

  const handleVerComprobante = async (gastoId: string) => {
    try {
      const response = await fetch(`/api/gastos/comprobante/${gastoId}`)
      if (response.ok) {
        const data = await response.json()

        // Buscar el gasto para el título
        const gasto = gastos.find(g => g.id === gastoId)

        setSelectedImage({
          url: data.url,
          title: "Comprobante de Gasto",
          subtitle: gasto ? `${gasto.concepto} - ${formatCurrency(gasto.monto)}` : ""
        })
        setShowImageModal(true)
      } else {
        toast({
          title: "Error",
          description: "No se pudo obtener el comprobante",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error al obtener el comprobante",
        variant: "destructive",
      })
    }
  }

  const confirmarEliminacion = (gastoId: string, concepto: string) => {
    setGastoAEliminar({ id: gastoId, concepto })
  }

  const hacerEliminacion = async () => {
    if (!gastoAEliminar) return

    setEliminandoGasto(true)
    const { id } = gastoAEliminar

    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Gasto eliminado",
          description: "El gasto ha sido eliminado correctamente",
        })
        fetchGastos()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo eliminar el gasto",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al eliminar:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setEliminandoGasto(false)
      setGastoAEliminar(null)
    }
  }

  const { format: formatCurrency } = useCurrency()

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO')
  }

  const getTotalGastos = () => {
    return filteredGastos.reduce((total, gasto) => total + gasto.monto, 0)
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#071311] text-foreground transition-colors duration-200 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-[#0E1F1C]/90 border-b border-gray-200 dark:border-[#1F3A36] shadow-sm">
        <div className="container-mobile">
          <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between md:h-16 md:py-0">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3330]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Gastos</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-start md:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchGastos}
                className="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#1A3330]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button
                onClick={() => setShowNuevoGasto(true)}
                className="btn-primary"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Gasto
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        {/* Filtros */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Buscar por concepto, usuario u observaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="date"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="pl-10 bg-white dark:bg-[#0E1F1C] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {filteredGastos.length} resultado{filteredGastos.length !== 1 ? 's' : ''}
            </div>

            {filteredGastos.length > 0 && (
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                Total: {formatCurrency(getTotalGastos())}
              </div>
            )}
          </div>
        </div>

        {/* Lista de gastos */}
        <div className="space-y-4">
          {filteredGastos.slice(0, visibleCount).map((gasto, index) => (
            <Card
              key={gasto.id}
              className="list-item animate-fadeInScale bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] transition-all"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center border border-transparent dark:border-red-900/30 flex-shrink-0">
                        <Receipt className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                          {gasto.concepto}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 dark:text-emerald-300/80 mt-1">
                          <User className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-emerald-400/60 flex-shrink-0" />
                          <span className="truncate">{gasto.usuario.nombre}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-emerald-300/80 mt-1">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-emerald-400/60 flex-shrink-0" />
                          <span>{formatDateTime(gasto.fecha)}</span>
                        </div>
                        {gasto.observaciones && (
                          <p className="text-sm text-gray-600 dark:text-emerald-200/90 mt-2 bg-gray-50 dark:bg-[#152e2a] border border-gray-100 dark:border-[#1F3A36] p-2 rounded-md">
                            {gasto.observaciones}
                          </p>
                        )}
                        {gasto.tieneComprobante && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 text-gray-700 dark:text-emerald-300 border-gray-300 dark:border-[#1F3A36] hover:bg-gray-100 dark:hover:bg-[#152e2a]"
                            onClick={() => handleVerComprobante(gasto.id)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver comprobante
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2 ml-3">
                    <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(gasto.monto)}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 h-8 w-8 p-0 md:h-9 md:w-auto md:px-3"
                      onClick={() => confirmarEliminacion(gasto.id, gasto.concepto)}
                    >
                      <Trash2 className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">Eliminar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {visibleCount < filteredGastos.length && (
            <div ref={observerRef} className="py-6 flex justify-center items-center text-sm text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Cargando más gastos...
            </div>
          )}

          {filteredGastos.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay gastos registrados
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {fechaFiltro || searchTerm
                  ? "No se encontraron gastos que coincidan con los filtros"
                  : "Comienza registrando tu primer gasto"
                }
              </p>
              <Button
                onClick={() => setShowNuevoGasto(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Gasto
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de nuevo gasto */}
      <NuevoGastoModal
        isOpen={showNuevoGasto}
        onClose={() => setShowNuevoGasto(false)}
        onSuccess={onGastoSuccess}
      />

      {/* Modal de visualización de imagen */}
      {
        selectedImage && (
          <ImageViewerModal
            isOpen={showImageModal}
            onClose={() => setShowImageModal(false)}
            imageUrl={selectedImage.url}
            title={selectedImage.title}
            subtitle={selectedImage.subtitle}
          />
        )
      }

      <AlertDialog open={!!gastoAEliminar} onOpenChange={(open) => !open && setGastoAEliminar(null)}>
        <AlertDialogContent className="bg-white dark:bg-[#0E1F1C] border-gray-200 dark:border-[#1F3A36] text-gray-900 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-300">
              Estás a punto de eliminar el gasto <strong className="text-gray-900 dark:text-white">"{gastoAEliminar?.concepto}"</strong>.
              <br /><br />
              <span className="text-red-600 dark:text-red-400 font-semibold">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoGasto} className="dark:bg-[#152e2a] dark:text-gray-200 dark:border-[#1F3A36]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                hacerEliminacion()
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              disabled={eliminandoGasto}
            >
              {eliminandoGasto ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


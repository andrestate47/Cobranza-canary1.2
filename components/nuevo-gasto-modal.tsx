
"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Receipt, DollarSign, Loader2, Upload, X, Image as ImageIcon, Camera } from "lucide-react"
import Image from "next/image"
import CameraModal from "@/components/camera-modal"

interface NuevoGastoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NuevoGastoModal({
  isOpen,
  onClose,
  onSuccess
}: NuevoGastoModalProps) {
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [foto, setFoto] = useState<File | string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleMontoChange = (value: string) => {
    // Reemplazar coma por punto para soporte de teclados latinos
    let formattedValue = value.replace(',', '.')
    
    // Solo permitir números y un punto decimal
    let numericValue = formattedValue.replace(/[^0-9.]/g, '')

    // Asegurar que solo haya un punto decimal
    const parts = numericValue.split('.')
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('')
    }

    // Limitar a 2 decimales
    if (parts.length === 2 && parts[1].length > 2) {
      numericValue = parts[0] + '.' + parts[1].substring(0, 2)
    }

    // Evitar que empiece con punto
    if (numericValue.startsWith('.')) {
      numericValue = '0' + numericValue
    }

    setMonto(numericValue)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP) o PDF",
        variant: "destructive",
      })
      return
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "El archivo es demasiado grande. Tamaño máximo: 5MB",
        variant: "destructive",
      })
      return
    }

    setFoto(file)

    // Crear preview solo para imágenes
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleRemoveFile = () => {
    setFoto(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleCameraCapture = (fotoBase64: string) => {
    setFoto(fotoBase64)
    setPreviewUrl(fotoBase64)
    setShowCameraModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const montoNumerico = parseFloat(monto)
    if (!concepto.trim()) {
      toast({
        title: "Error",
        description: "El concepto es obligatorio",
        variant: "destructive",
      })
      return
    }

    if (!montoNumerico || montoNumerico <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      let fotoBase64 = null

      if (foto) {
        if (typeof foto === 'string') {
          fotoBase64 = foto
        } else if (foto.type.startsWith('image/')) {
          fotoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const img = document.createElement('img')
              img.onload = () => {
                const canvas = document.createElement('canvas')
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width = Math.round((width * MAX_HEIGHT) / height);
                    height = MAX_HEIGHT;
                  }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height)
                  resolve(canvas.toDataURL('image/jpeg', 0.6))
                } else {
                  resolve(e.target?.result)
                }
              }
              img.onerror = reject
              img.src = e.target?.result as string
            }
            reader.onerror = reject
            reader.readAsDataURL(foto)
          })
        } else {
          const reader = new FileReader()
          fotoBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(foto)
          })
        }
      }

      const response = await fetch('/api/gastos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concepto: concepto.trim(),
          monto: montoNumerico,
          observaciones: observaciones.trim() || undefined,
          fotoComprobante: fotoBase64
        }),
      })

      if (response.ok) {
        onSuccess()
        handleClose()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo registrar el gasto",
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

  const handleClose = () => {
    setConcepto("")
    setMonto("")
    setObservaciones("")
    setFoto(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-red-600" />
            <span>Nuevo Gasto</span>
          </DialogTitle>
          <DialogDescription>
            Registra un nuevo gasto en el sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="concepto">Concepto del gasto *</Label>
            <Input
              id="concepto"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Combustible, Almuerzo, Papelería..."
              className="mt-1"
              required
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="monto">Monto *</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="monto"
                type="text"
                value={monto}
                onChange={(e) => handleMontoChange(e.target.value)}
                placeholder="0"
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalles adicionales del gasto..."
              className="mt-1"
              disabled={loading}
              maxLength={255}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="foto">Foto de la boleta o factura</Label>
              {!foto && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCameraModal(true)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                  disabled={loading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tomar Foto
                </Button>
              )}
            </div>
            <div className="mt-1">
              {!foto ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary cursor-pointer transition-colors"
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Haz clic para subir una foto
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, WEBP o PDF (máx. 5MB)
                  </p>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4">
                  {previewUrl ? (
                    <div className="relative">
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2">
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-600">
                          <ImageIcon className="h-4 w-4 mr-2" />
                          <span className="truncate max-w-[200px]">{typeof foto === 'string' ? 'Foto capturada.jpg' : foto.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                          disabled={loading}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <Receipt className="h-4 w-4 mr-2" />
                        <span className="truncate max-w-[200px]">{foto.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                id="foto"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="btn-primary"
              disabled={loading || !concepto.trim() || !monto}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Registrar Gasto"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        mode="simple"
      />
    </Dialog>
  )
}

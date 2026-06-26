

"use client"

import { useState, useRef, useEffect } from "react"
import {
  Camera,
  Upload,
  X,
  Loader2,
  DollarSign,
  Building,
  CreditCard,
  FileText,
  Receipt,
  Share2,
  MessageCircle,
  ChevronDown
} from "lucide-react"
import BoletaPago from "@/components/boleta-pago"
import html2canvas from "html2canvas"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import { format } from "date-fns"

interface TransferenciaModalProps {
  isOpen: boolean
  onClose: () => void
  prestamoId: string
  clienteNombre: string
  onTransferenciaSaved: () => void
}

export default function TransferenciaModal({
  isOpen,
  onClose,
  prestamoId,
  clienteNombre,
  onTransferenciaSaved
}: TransferenciaModalProps) {
  const [monto, setMonto] = useState("")
  const [metodoPago, setMetodoPago] = useState<'TRANSFERENCIA' | 'DEPOSITO'>('TRANSFERENCIA')
  const [banco, setBanco] = useState("")
  const [referencia, setReferencia] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [fotoComprobante, setFotoComprobante] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [capturandoFoto, setCapturandoFoto] = useState(false)
  const [fecha, setFecha] = useState<Date>(new Date())

  // Actualiza la fecha a la hora actual cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFecha(new Date())
    }
  }, [isOpen])

  // Nuevos estados para la boleta
  const [step, setStep] = useState<'form' | 'boleta'>('form')
  const [pagoRegistrado, setPagoRegistrado] = useState<any | null>(null)
  const boletaRef = useRef<HTMLDivElement>(null)

  // Cambio: usar useRef para el stream
  const streamRef = useRef<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()

  // Cambio: Cleanup al desmontar o cerrar modal
  useEffect(() => {
    return () => {
      detenerCamara()
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      detenerCamara()
    }
  }, [isOpen])

  const iniciarCamara = async () => {
    // Cambio: Prevenir doble inicio
    if (streamRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Camera] Stream already active, ignoring start request')
      }
      return
    }

    try {
      setCapturandoFoto(true)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Camera] Requesting access...')
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Cámara trasera preferida
      })

      streamRef.current = mediaStream

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        // Cambio: manejar video.play() con onloadedmetadata
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            if (process.env.NODE_ENV === 'development') {
              console.log('[Camera] Playback started')
            }
          } catch (e: any) {
            // Cambio: ignorar AbortError
            if (e.name !== 'AbortError') {
              console.error('[Camera] Play error:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error al acceder a la cámara:", error)
      setCapturandoFoto(false) // Reset state on error
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara. Verifica los permisos.",
        variant: "destructive",
      })
    }
  }

  const detenerCamara = () => {
    if (streamRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Camera] Stopping stream')
      }
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Camera] Track ${track.kind} stopped`)
        }
      })
      streamRef.current = null
    }

    // Cambio: asegurar video.srcObject = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCapturandoFoto(false)
  }

  const capturarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current

      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;

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
        ctx.drawImage(video, 0, 0, width, height)
        const dataURL = canvas.toDataURL('image/jpeg', 0.6)
        setFotoComprobante(dataURL)
        detenerCamara()

        toast({
          title: "Foto capturada",
          description: "La imagen del comprobante se ha capturado exitosamente",
        })
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor selecciona una imagen válida",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
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
            const dataURL = canvas.toDataURL('image/jpeg', 0.6)
            setFotoComprobante(dataURL)
            toast({
              title: "Imagen cargada",
              description: "La imagen del comprobante se ha cargado exitosamente",
            })
          }
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!monto || !fotoComprobante) {
      toast({
        title: "Error",
        description: "El monto y la foto del comprobante son obligatorios",
        variant: "destructive",
      })
      return
    }

    const montoNum = parseFloat(monto)
    if (montoNum <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser mayor a cero",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/transferencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prestamoId,
          monto: montoNum,
          banco: banco.trim() || null,
          referencia: referencia.trim() || null,
          observaciones: observaciones.trim() || null,
          fotoComprobante,
          metodoPago,
          fecha: fecha.toISOString()
        }),
      })

      if (response.ok) {
        const data = await response.json()

        if (data.pago) {
          setPagoRegistrado(data.pago)
          setStep('boleta')
          toast({
            title: "Transferencia registrada",
            description: `Se ha generado la boleta ${data.pago.numeroBoleta}`,
          })
          // No llamamos a onTransferenciaSaved() ni handleClose() todavía
        } else {
          // Fallback por si la API no devuelve el pago (mantiene comportamiento anterior)
          toast({
            title: "Transferencia registrada",
            description: `Se ha registrado la transferencia por ${formatCurrency(montoNum)}`,
          })
          onTransferenciaSaved()
          handleClose()
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "No se pudo registrar la transferencia",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión al registrar la transferencia",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Si se completó un pago, notificamos al padre al cerrar
    if (pagoRegistrado) {
      onTransferenciaSaved()
    }

    detenerCamara()
    setMonto("")
    setMetodoPago('TRANSFERENCIA')
    setBanco("")
    setReferencia("")
    setObservaciones("")
    setFotoComprobante(null)
    setStep('form')
    setPagoRegistrado(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClose()
  }

  const handleCompartirWhatsApp = async () => {
    if (!boletaRef.current || !pagoRegistrado) return

    try {
      toast({
        title: "Generando imagen...",
        description: "Por favor espera un momento",
      })

      const canvas = await html2canvas(boletaRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      })

      const telefono = pagoRegistrado.cliente.telefono?.replace(/\D/g, '') || ''
      const mensaje = `Hola ${pagoRegistrado.cliente.nombre}, adjunto tu comprobante de transferencia N° ${pagoRegistrado.numeroBoleta}. ¡Gracias confirmar! ✅`
      const mensajeCodificado = encodeURIComponent(mensaje)
      const fileName = `boleta-${pagoRegistrado.numeroBoleta}.png`

      // Intentar Web Share API
      if (navigator.share && typeof navigator.canShare === 'function') {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0))
          if (blob) {
            const file = new File([blob], fileName, { type: 'image/png' })
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `Boleta ${pagoRegistrado.numeroBoleta}`,
                text: mensaje
              })
              toast({ title: "¡Compartido!", description: "La boleta se envió correctamente" })
              return
            }
          }
        } catch (e) {
          console.log('Share API falló, usando fallback')
        }
      }

      // Fallback: Descargar y abrir WhatsApp
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      const link = document.createElement('a')
      link.download = fileName
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => {
        const urlWhatsApp = telefono
          ? `https://wa.me/${telefono}?text=${mensajeCodificado}`
          : `https://wa.me/?text=${mensajeCodificado}`
        window.open(urlWhatsApp, '_blank')
        toast({ title: "Imagen descargada", description: "Ábrela en WhatsApp para enviar" })
      }, 800)

    } catch (error) {
      console.error('Error sharing:', error)
      toast({ title: "Error", description: "No se pudo generar la imagen", variant: "destructive" })
    }
  }

  const handleDescargarBoleta = async () => {
    if (!boletaRef.current || !pagoRegistrado) return
    try {
      const canvas = await html2canvas(boletaRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const link = document.createElement('a')
      link.download = `boleta-${pagoRegistrado.numeroBoleta}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "No se pudo descargar", variant: "destructive" })
    }
  }

  const { format: formatCurrency } = useCurrency()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={step === 'boleta' ? "max-w-[850px] w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-hidden" : "sm:max-w-lg max-h-[90vh] overflow-y-auto"}>
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-blue-600">
                <CreditCard className="h-5 w-5" />
                <span>Registrar Transferencia Bancaria</span>
              </DialogTitle>
              <DialogDescription>
                Cliente: <strong>{clienteNombre}</strong>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Monto */}
              <div>
                <Label htmlFor="monto">Monto de la transferencia *</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="monto"
                    type="text"
                    value={monto}
                    onChange={(e) => handleMontoChange(e.target.value)}
                    className="pl-10"
                    placeholder="0.00"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <Label htmlFor="fecha">Fecha de transferencia *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={format(fecha, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const [year, month, day] = val.split('-').map(Number);
                      const nuevaFecha = new Date(fecha);
                      nuevaFecha.setFullYear(year, month - 1, day);
                      setFecha(nuevaFecha);
                    }
                  }}
                  className="mt-1 cursor-pointer"
                  onClick={(e) => {
                    try {
                      if (typeof (e.target as HTMLInputElement).showPicker === 'function') {
                        (e.target as HTMLInputElement).showPicker()
                      }
                    } catch (error) {
                      console.log('showPicker not supported', error)
                    }
                  }}
                  required
                  disabled={loading}
                />
              </div>

              {/* Método de pago */}
              <div>
                <Label htmlFor="metodoPago">Método de pago *</Label>
                <Select
                  value={metodoPago}
                  onValueChange={(value: 'TRANSFERENCIA' | 'DEPOSITO') => setMetodoPago(value)}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFERENCIA">🏦 Transferencia</SelectItem>
                    <SelectItem value="DEPOSITO">🏧 Depósito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Banco */}
              <div>
                <Label htmlFor="banco">Banco</Label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="banco"
                    type="text"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="pl-10"
                    placeholder="Ej: Bancolombia, Nequi, Daviplata..."
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Referencia */}
              <div>
                <Label htmlFor="referencia">Número de referencia</Label>
                <div className="relative mt-1">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="referencia"
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="pl-10"
                    placeholder="Ej: 123456789"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Foto del comprobante */}
              <div>
                <Label>Comprobante de transferencia *</Label>
                <div className="mt-2 space-y-2">
                  {!fotoComprobante ? (
                    <div className="space-y-2">
                      {!capturandoFoto ? (
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={iniciarCamara}
                            disabled={loading}
                            className="w-full"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Tomar foto con cámara
                          </Button>

                          <div className="relative">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={loading}
                              className="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Subir desde galería
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <video
                            ref={videoRef}
                            className="w-full rounded-lg border"
                            autoPlay
                            playsInline
                            muted
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={capturarFoto}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Capturar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={detenerCamara}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <img
                          src={fotoComprobante}
                          alt="Comprobante de transferencia"
                          className="w-full max-h-64 object-contain rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFotoComprobante(null)}
                          className="absolute top-2 right-2 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones adicionales sobre la transferencia..."
                  className="mt-1"
                  disabled={loading}
                />
              </div>

              {/* Botones */}
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
                  disabled={loading || !monto || !fotoComprobante}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Registrar Transferencia
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-green-600">
                <Receipt className="h-5 w-5" />
                <span>✅ Transferencia Registrada - Boleta</span>
              </DialogTitle>
              <DialogDescription>
                Revisa los detalles y comparte el comprobante
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {pagoRegistrado && (
                <>
                  <BoletaPago ref={boletaRef} data={pagoRegistrado} />

                  <div className="flex space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Share2 className="mr-2 h-4 w-4" />
                          Compartir
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={handleCompartirWhatsApp} className="gap-2 py-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">WhatsApp</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDescargarBoleta} className="gap-2 py-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Share2 className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">Descargar PNG</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button onClick={handleClose} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      ✅ Finalizar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  )
}


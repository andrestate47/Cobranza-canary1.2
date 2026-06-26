
"use client"

import { useState, useRef, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DollarSign, User, Calculator, Loader2, Plus, Receipt, Share2, MessageCircle, ChevronDown, CalendarIcon, Camera, Upload, X } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import BoletaPago from "@/components/boleta-pago"
import html2canvas from "html2canvas"
import { useCurrency } from "@/hooks/use-currency"

interface PrestamoConCliente {
  id: string
  monto: number
  interes: number
  cuotas: number
  valorCuota: number
  cliente: {
    nombre: string
    apellido: string
    documento: string
    telefono?: string
    direccionCliente?: string
  }
  saldoPendiente: number
  cuotasPagadas: number
}

interface PagoRegistrado {
  id: string
  monto: number
  fecha: string
  observaciones?: string
  numeroBoleta: string
  prestamo: {
    id: string
    monto: number
    interes: number
    valorCuota: number
    montoTotal: number
    saldoPendiente: number
    fechaInicio: string
    tipoPago: string
    cuotas: number
    ultimoPago?: {
      fecha: string
      monto: number
    }
  }
  cliente: {
    nombre: string
    apellido: string
    documento: string
    telefono?: string
    direccionCliente: string
  }
  usuario: {
    nombre: string
  }
  // Nuevos campos adicionales
  tipoCredito?: string
  tipoPagoMetodo?: string
}

interface PagoRapidoModalProps {
  isOpen: boolean
  onClose: () => void
  prestamo: PrestamoConCliente
  onSuccess: () => void
}

export default function PagoRapidoModal({
  isOpen,
  onClose,
  prestamo,
  onSuccess
}: PagoRapidoModalProps) {
  const [step, setStep] = useState<'form' | 'boleta'>('form')
  const [monto, setMonto] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO')
  const [fecha, setFecha] = useState<Date>(new Date())
  const [fotoComprobante, setFotoComprobante] = useState<string | null>(null)
  const [capturandoFoto, setCapturandoFoto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pagoRegistrado, setPagoRegistrado] = useState<PagoRegistrado | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const boletaRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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
    if (streamRef.current) return
    try {
      setCapturandoFoto(true)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
          } catch (e: any) {
            if (e.name !== 'AbortError') console.error('[Camera] Play error:', e)
          }
        }
      }
    } catch (error) {
      console.error("Error al acceder a la cámara:", error)
      setCapturandoFoto(false)
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara. Verifica los permisos.",
        variant: "destructive",
      })
    }
  }

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
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

  // Actualiza la fecha a la fecha y hora actual cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFecha(new Date())
    }
  }, [isOpen])

  const { format: formatCurrency } = useCurrency()

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

  const setPagoCuota = () => {
    // Formatear el número para que sea compatible con nuestras validaciones
    const valorFormateado = Math.round(prestamo.valorCuota * 100) / 100
    setMonto(valorFormateado.toString())
  }

  const setPagoCompleto = () => {
    // Formatear el número para que sea compatible con nuestras validaciones
    const saldoFormateado = Math.round(prestamo.saldoPendiente * 100) / 100
    setMonto(saldoFormateado.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones de entrada más robustas
    if (!monto || monto.trim() === '') {
      toast({
        title: "Campo requerido",
        description: "Por favor ingresa el monto del pago",
        variant: "destructive",
      })
      return
    }

    // Limpiar el monto de cualquier formato y validar que solo contenga números y punto decimal
    const montoLimpio = monto.replace(/[^0-9.]/g, '')

    if (montoLimpio === '' || montoLimpio === '.') {
      toast({
        title: "Monto inválido",
        description: "El monto debe ser un número válido",
        variant: "destructive",
      })
      return
    }

    const montoNumerico = parseFloat(montoLimpio)

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      toast({
        title: "Monto inválido",
        description: "El monto debe ser un número positivo mayor a cero",
        variant: "destructive",
      })
      return
    }

    // Validar que no tenga más de 2 decimales
    const decimales = montoLimpio.split('.')
    if (decimales.length === 2 && decimales[1].length > 2) {
      toast({
        title: "Formato inválido",
        description: "El monto no puede tener más de 2 decimales",
        variant: "destructive",
      })
      return
    }

    if (montoNumerico > 1000000000) {
      toast({
        title: "Monto muy grande",
        description: "El monto ingresado es demasiado grande. Verifica la cantidad",
        variant: "destructive",
      })
      return
    }

    if (montoNumerico > prestamo.saldoPendiente) {
      const saldoFormateado = formatCurrency(prestamo.saldoPendiente)
      const montoFormateado = formatCurrency(montoNumerico)
      toast({
        title: "Monto excede el saldo",
        description: `El monto (${montoFormateado}) no puede ser mayor al saldo pendiente (${saldoFormateado})`,
        variant: "destructive",
      })
      return
    }

    if (!prestamo.id || typeof prestamo.id !== 'string') {
      toast({
        title: "Error de datos",
        description: "Información del préstamo no válida. Por favor recarga la página e intenta de nuevo",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const requestBody = {
        prestamoId: prestamo.id,
        monto: montoNumerico,
        observaciones: observaciones.trim() || undefined,
        metodoPago: metodoPago,
        fotoComprobante: fotoComprobante || undefined,
        fecha: fecha ? fecha.toISOString() : undefined
      }

      const response = await fetch('/api/pagos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include' // Asegurar que las cookies de sesión se incluyan
      })

      if (response.ok) {
        const result = await response.json()

        // Verificar que tenemos los datos necesarios
        if (result.pago && result.pago.numeroBoleta) {
          setPagoRegistrado(result.pago)
          setStep('boleta')

          toast({
            title: "¡Pago registrado exitosamente!",
            description: `Se generó la boleta ${result.pago.numeroBoleta}`,
            variant: "default",
          })
        } else {
          throw new Error("Los datos del pago están incompletos. Intenta nuevamente.")
        }
      } else {
        // Manejar respuestas HTTP de error
        let errorMsg = "Error al procesar el pago. Por favor intenta nuevamente."

        try {
          const errorData = await response.json()
          if (errorData.error && typeof errorData.error === 'string') {
            errorMsg = errorData.error
          }
        } catch {
          // Si no se puede parsear JSON, usar mensaje por defecto
          if (response.status === 401) {
            errorMsg = "Tu sesión ha expirado. Por favor vuelve a iniciar sesión."
          } else if (response.status === 403) {
            errorMsg = "No tienes permisos para realizar esta acción."
          } else if (response.status === 500) {
            errorMsg = "Error interno del servidor. Por favor intenta más tarde."
          }
        }

        toast({
          title: "Error al procesar el pago",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (error) {
      // Manejar errores de red y otros errores inesperados
      let errorMsg = "Error de conexión. Verifica tu conexión a internet e intenta nuevamente."

      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMsg = "No se pudo conectar con el servidor. Verifica tu conexión a internet."
        } else if (error.message.includes('timeout')) {
          errorMsg = "La solicitud tardó demasiado tiempo. Por favor intenta nuevamente."
        } else if (error.message.includes('NetworkError')) {
          errorMsg = "Error de red. Verifica tu conexión a internet."
        } else {
          errorMsg = error.message
        }
      }

      toast({
        title: "Error de conexión",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Si había un pago registrado, llamar onSuccess antes de cerrar
    if (pagoRegistrado) {
      onSuccess()
    }

    // Limpiar estado
    setStep('form')
    setMonto("")
    setObservaciones("")
    setMetodoPago('EFECTIVO')
    setFecha(new Date())
    setFotoComprobante(null)
    setPagoRegistrado(null)
    detenerCamara()
    onClose()
  }

  const handleCompartirWhatsApp = async () => {
    if (!boletaRef.current || !pagoRegistrado) return

    try {
      // Generar la imagen de la boleta
      toast({
        title: "Generando imagen...",
        description: "Por favor espera un momento",
        variant: "default",
      })

      const canvas = await html2canvas(boletaRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      })

      // Preparar mensaje para WhatsApp
      const telefono = pagoRegistrado.cliente.telefono?.replace(/\D/g, '') || ''
      const mensaje = `Hola ${pagoRegistrado.cliente.nombre}, adjunto tu boleta de pago N° ${pagoRegistrado.numeroBoleta}. ¡Gracias por tu pago! ✅`
      const mensajeCodificado = encodeURIComponent(mensaje)

      // Nombre de archivo
      const fileName = `boleta-${pagoRegistrado.numeroBoleta}.png`

      // Intentar usar Web Share API en dispositivos móviles
      if (navigator.share && typeof navigator.canShare === 'function') {
        try {
          // Convertir canvas a blob
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0)
          })

          if (!blob) {
            throw new Error('No se pudo generar la imagen')
          }

          const file = new File([blob], fileName, { type: 'image/png' })

          // Verificar si se puede compartir archivos
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Boleta ${pagoRegistrado.numeroBoleta}`,
              text: mensaje
            })

            toast({
              title: "¡Compartido!",
              description: "La boleta se envió correctamente",
              variant: "default",
            })
            return
          }
        } catch (shareError) {
          console.log('Web Share API no disponible, usando método alternativo')
        }
      }

      // Fallback: Descargar imagen y abrir WhatsApp
      const dataUrl = canvas.toDataURL('image/png', 1.0)

      // Descargar la imagen
      const link = document.createElement('a')
      link.download = fileName
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Esperar un momento y abrir WhatsApp
      setTimeout(() => {
        const urlWhatsApp = telefono
          ? `https://wa.me/${telefono}?text=${mensajeCodificado}`
          : `https://wa.me/?text=${mensajeCodificado}`

        window.open(urlWhatsApp, '_blank')

        toast({
          title: "Imagen descargada",
          description: "Se descargó la imagen. Ahora puedes adjuntarla en WhatsApp",
          variant: "default",
        })
      }, 800)

    } catch (error) {
      console.error('Error al compartir por WhatsApp:', error)
      toast({
        title: "Error al compartir",
        description: error instanceof Error ? error.message : "No se pudo generar la imagen. Intenta descargarla manualmente.",
        variant: "destructive",
      })
    }
  }

  const handleDescargarBoleta = async () => {
    if (!boletaRef.current || !pagoRegistrado) return

    try {
      const canvas = await html2canvas(boletaRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      })

      const link = document.createElement('a')
      link.download = `boleta-${pagoRegistrado.numeroBoleta}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Error al descargar boleta:', error)
      toast({
        title: "Error",
        description: "No se pudo descargar la boleta",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("max-h-[95vh] overflow-y-auto transition-all duration-300", step === 'boleta' ? "max-w-[850px] w-[95vw] overflow-x-hidden" : "sm:max-w-md sm:max-w-xl")}>
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span>Pago Rápido</span>
              </DialogTitle>
              <DialogDescription>
                Registrar pago para el préstamo
              </DialogDescription>
            </DialogHeader>

            {/* Info del cliente */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3 mb-3">
                <User className="h-8 w-8 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {prestamo.cliente.nombre} {prestamo.cliente.apellido}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Documento: {prestamo.cliente.documento}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cuota sugerida:</span>
                  <p className="font-semibold">{formatCurrency(prestamo.valorCuota)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Saldo pendiente:</span>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(prestamo.saldoPendiente)}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Columna Izquierda: Monto */}
              <div className="space-y-2">
                <div>
                  <Label htmlFor="monto">Monto del pago *</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="monto"
                      type="text"
                      value={monto}
                      onChange={(e) => handleMontoChange(e.target.value)}
                      placeholder="0"
                      className="pl-10 h-10"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Botones de monto rápido */}
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={setPagoCuota}
                      disabled={loading}
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Cuota
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={setPagoCompleto}
                      disabled={loading}
                    >
                      Pago Total
                    </Button>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Fecha */}
              <div>
                <Label className="block mb-1">Fecha de Pago</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal h-10",
                        !fecha && "text-muted-foreground"
                      )}
                      disabled={loading}
                    >
                      {fecha ? (
                        format(fecha, "PPP", { locale: es })
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={(selectedDate) => {
                        if (selectedDate) {
                          const newDate = new Date(selectedDate)
                          const now = new Date()
                          newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
                          setFecha(newDate)
                          setIsCalendarOpen(false)
                        }
                      }}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Fila Completa Intermedia: Método de Pago */}
              <div className="sm:col-span-2">
                <Label htmlFor="metodoPago">Método de Pago *</Label>
                <Select
                  value={metodoPago}
                  onValueChange={(value: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO') => setMetodoPago(value)}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue placeholder="Selecciona método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">💵 Efectivo</SelectItem>
                    <SelectItem value="TRANSFERENCIA">🏦 Transferencia</SelectItem>
                    <SelectItem value="DEPOSITO">🏧 Depósito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Foto del comprobante */}
              <div className="sm:col-span-2">
                <Label>Foto de boleta / comprobante (opcional)</Label>
                <div className="mt-2 space-y-2">
                  {!fotoComprobante ? (
                    <div className="space-y-2">
                      {!capturandoFoto ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={iniciarCamara}
                            disabled={loading}
                            className="flex-1"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Cámara
                          </Button>

                          <div className="relative flex-1">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={loading}
                              className="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Galería
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
                            className="w-full max-h-64 object-cover rounded-lg border bg-black"
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
                      <div className="relative w-full sm:w-1/2 mx-auto">
                        <img
                          src={fotoComprobante}
                          alt="Comprobante"
                          className="w-full max-h-48 object-contain rounded-lg border bg-gray-50"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => setFotoComprobante(null)}
                          className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fila Completa Inferior: Observaciones */}
              <div className="sm:col-span-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones opcionales..."
                  className="mt-1 min-h-[80px]"
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2 sm:col-span-2">
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
                  disabled={loading || !monto}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 h-4 w-4" />
                      Registrar Pago
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {step === 'boleta' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-green-600">
                <Receipt className="h-5 w-5" />
                <span>✅ Pago Registrado - Boleta de Pago</span>
              </DialogTitle>
              <DialogDescription>
                {pagoRegistrado ? 'Revisa los detalles del pago y cierra cuando termines' : 'Preparando boleta...'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {pagoRegistrado ? (
                <>
                  <div className="w-full overflow-x-auto">
                    <div className="transform origin-top-left scale-[0.40] xs:scale-[0.45] sm:scale-[0.75] md:scale-100 mb-[-60%] sm:mb-[-25%] md:mb-0 w-[800px]">
                      <BoletaPago ref={boletaRef} data={pagoRegistrado} />
                    </div>
                  </div>

                  {/* Mensaje de éxito */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
                    <div className="text-green-600 mb-2">
                      <Receipt className="h-8 w-8 mx-auto mb-2" />
                      <h3 className="font-semibold text-green-800">¡Boleta Generada Exitosamente!</h3>
                      <p className="text-sm text-green-600">El pago ha sido registrado correctamente</p>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex space-x-2">
                    {/* Botón de compartir desplegable */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Share2 className="mr-2 h-4 w-4" />
                          Compartir
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem
                          onClick={handleCompartirWhatsApp}
                          className="flex items-center space-x-2 py-3"
                        >
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">WhatsApp</span>
                            <span className="text-xs text-gray-500">Enviar por WhatsApp</span>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={handleDescargarBoleta}
                          className="flex items-center space-x-2 py-3"
                        >
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Share2 className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">Descargar PNG</span>
                            <span className="text-xs text-gray-500">Guardar como imagen</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      onClick={handleClose}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      ✅ Cerrar y Finalizar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Generando boleta...</p>
                </div>
              )}
            </div>
          </>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  )
}

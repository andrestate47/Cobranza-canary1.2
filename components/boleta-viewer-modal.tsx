"use client"

import { useState, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Receipt, Share2, ChevronDown, MessageCircle } from "lucide-react"
import BoletaPago from "@/components/boleta-pago" // Adjust path if needed
import { useToast } from "@/hooks/use-toast"
import html2canvas from "html2canvas"

// Reusing interfaces from BoletaPago (or close to it)
// In a real app, these should be shared in a types file.
interface BoletaPagoData {
    id: string
    monto: number
    fecha: string | Date
    observaciones?: string | null
    numeroBoleta: string
    prestamo: {
        id: string
        monto: number
        interes: number
        valorCuota: number
        montoTotal: number
        saldoPendiente: number
        fechaInicio: string | Date
        tipoPago: string
        cuotas: number
        microseguroTipo?: string
        microseguroValor?: number
        microseguroTotal?: number
        ultimoPago?: {
            fecha: string | Date
            monto: number
        }
    }
    cliente: {
        nombre: string
        apellido: string
        documento: string
        telefono?: string | null
        direccionCliente: string
    }
    usuario: {
        nombre: string
    }
    tipoCredito?: string
    tipoPagoMetodo?: string
    fotoComprobante?: string | null
}

interface BoletaViewerModalProps {
    isOpen: boolean
    onClose: () => void
    data: BoletaPagoData | null
}

export default function BoletaViewerModal({ isOpen, onClose, data }: BoletaViewerModalProps) {
    const boletaRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()

    if (!data) return null

    const handleCompartirWhatsApp = async () => {
        if (!boletaRef.current) return

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

            const telefono = data.cliente.telefono?.replace(/\D/g, '') || ''
            const mensaje = `Hola ${data.cliente.nombre}, adjunto tu boleta N° ${data.numeroBoleta}.`
            const mensajeCodificado = encodeURIComponent(mensaje)
            const fileName = `boleta-${data.numeroBoleta}.png`

            // Intentar Web Share API
            if (navigator.share && typeof navigator.canShare === 'function') {
                try {
                    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0))
                    if (blob) {
                        const file = new File([blob], fileName, { type: 'image/png' })
                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                files: [file],
                                title: `Boleta ${data.numeroBoleta}`,
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
        if (!boletaRef.current) return
        try {
            const canvas = await html2canvas(boletaRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
            const link = document.createElement('a')
            link.download = `boleta-${data.numeroBoleta}.png`
            link.href = canvas.toDataURL()
            link.click()
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "No se pudo descargar", variant: "destructive" })
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[850px] w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2 text-green-600">
                        <Receipt className="h-5 w-5" />
                        <span>Boleta de Pago - Histórico</span>
                    </DialogTitle>
                    <DialogDescription>
                        Visualiza y comparte comprobantes anteriores
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="w-full flex justify-center overflow-x-auto py-2">
                        <div className="[zoom:0.40] xs:[zoom:0.45] sm:[zoom:0.75] md:[zoom:1] w-[800px]">
                            <BoletaPago ref={boletaRef} data={data as any} />
                        </div>
                    </div>

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

                        <Button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-700">
                            Cerrar
                        </Button>
                    </div>

                    {/* Foto del comprobante adjunto (visible sólo en la UI, no en la captura compartida) */}
                    {data.fotoComprobante && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Comprobante Adjunto <span className="text-xs text-gray-500 font-normal">(No visible al compartir)</span></h3>
                            <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={data.fotoComprobante} 
                                    alt="Comprobante de pago adjunto" 
                                    className="w-full object-contain max-h-[400px]"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

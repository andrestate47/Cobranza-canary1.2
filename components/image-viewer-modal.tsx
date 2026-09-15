"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  Move
} from "lucide-react"
import { Button } from "@/components/ui/button"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useToast } from "@/hooks/use-toast"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  title: string
  subtitle?: string
}

export default function ImageViewerModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title, 
  subtitle 
}: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flipX, setFlipX] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const { toast } = useToast()
  const containerRef = useRef<HTMLDivElement>(null)

  // Mobile gesture refs
  const touchDistanceRef = useRef<number | null>(null)
  const lastTapRef = useRef<number>(0)

  const handleZoomIn = () => {
    setZoom(prev => Math.min(Number((prev + 0.25).toFixed(2)), 4))
  }

  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5)
      if (next <= 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handleRotateCw = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleRotateCcw = () => {
    setRotation(prev => (prev - 90 + 360) % 360)
  }

  const handleFlipHorizontal = () => {
    setFlipX(prev => !prev)
  }

  const resetTransforms = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setFlipX(false)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleClose = () => {
    resetTransforms()
    onClose()
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Imagen descargada",
        description: "La imagen se ha descargado exitosamente",
      })
    } catch (error) {
      console.error('Error downloading image:', error)
      toast({
        title: "Error de descarga",
        description: "No se pudo descargar la imagen",
        variant: "destructive",
      })
    }
  }

  // Mouse pan logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return
    e.preventDefault()
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Mobile Touch handlers: Pinch-to-zoom + Pan + Double tap
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchDistanceRef.current = dist
    } else if (e.touches.length === 1) {
      // Single finger drag if zoomed
      if (zoom > 1) {
        setIsDragging(true)
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y
        })
      }

      // Double tap detection for mobile phones
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        if (zoom === 1) {
          setZoom(2)
        } else {
          resetTransforms()
        }
      }
      lastTapRef.current = now
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      // Pinching
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / touchDistanceRef.current
      touchDistanceRef.current = dist

      setZoom(prev => {
        const newZoom = Math.min(Math.max(Number((prev * factor).toFixed(2)), 0.5), 4)
        if (newZoom <= 1) setPosition({ x: 0, y: 0 })
        return newZoom
      })
    } else if (e.touches.length === 1 && isDragging && zoom > 1) {
      // Single finger panning
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    touchDistanceRef.current = null
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        handleZoomIn()
      } else if (e.key === "-") {
        handleZoomOut()
      } else if (e.key === "r" || e.key === "R") {
        handleRotateCw()
      } else if (e.key === "0") {
        resetTransforms()
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, resetTransforms])

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        <DialogPrimitive.Content 
          ref={containerRef}
          className="fixed inset-0 z-50 w-full h-full p-0 border-none outline-none overflow-hidden bg-black/95 text-white flex flex-col justify-between shadow-2xl rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <VisuallyHidden>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description>{subtitle || "Visor de imágenes en alta resolución"}</DialogPrimitive.Description>
          </VisuallyHidden>

          {/* Top Header Bar */}
          <div className="relative z-20 w-full bg-gradient-to-b from-black/90 via-black/60 to-transparent p-3 sm:p-6 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1 text-white">
              <h3 className="font-bold text-base sm:text-xl truncate tracking-tight drop-shadow-sm">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] sm:text-sm text-gray-300 truncate font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-9 w-9 sm:h-10 sm:w-10 text-gray-200 hover:text-white hover:bg-white/15 active:scale-95 rounded-full transition-all"
                title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-9 w-9 sm:h-10 sm:w-10 text-gray-200 hover:text-white hover:bg-white/15 active:scale-95 rounded-full transition-all"
                title="Descargar imagen"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-9 w-9 sm:h-10 sm:w-10 bg-white/15 text-white hover:bg-red-600 hover:text-white active:scale-95 rounded-full transition-all ml-1 shadow-lg"
                title="Cerrar (Esc)"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Central Image Viewport */}
          <div 
            className="relative flex-1 w-full flex items-center justify-center overflow-hidden select-none cursor-default touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={imageUrl}
              alt={title}
              draggable={false}
              className={`max-w-full max-h-full object-contain transition-transform duration-150 ease-out ${
                zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
              }`}
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1})`,
                transformOrigin: 'center center'
              }}
              onError={(e) => {
                console.error('Error loading image:', e)
                toast({
                  title: "Error de carga",
                  description: "No se pudo visualizar la imagen",
                  variant: "destructive",
                })
              }}
              onDoubleClick={() => {
                if (zoom === 1) {
                  setZoom(2)
                } else {
                  resetTransforms()
                }
              }}
            />

            {/* Indicator when zoomed in */}
            {zoom > 1 && (
              <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] sm:text-xs flex items-center gap-1.5 shadow-lg border border-white/15 pointer-events-none animate-fadeIn">
                <Move className="w-3.5 h-3.5 text-blue-400" />
                <span>Arrastra la imagen</span>
              </div>
            )}
          </div>

          {/* Floating Bottom Controls */}
          <div className="relative z-20 w-full p-3 sm:p-6 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-full bg-white/15 backdrop-blur-2xl border border-white/20 shadow-2xl max-w-[96vw] overflow-x-auto scrollbar-none">
              {/* Zoom Out */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="h-9 w-9 text-white hover:bg-white/20 active:scale-95 rounded-full disabled:opacity-30 transition-all shrink-0"
                title="Alejar (-)"
              >
                <ZoomOut className="h-4.5 w-4.5" />
              </Button>

              {/* Zoom Percentage */}
              <button
                onClick={resetTransforms}
                className="px-2.5 py-1 text-xs font-bold text-white hover:text-blue-300 active:scale-95 rounded-full hover:bg-white/10 transition-all shrink-0 min-w-[3.2rem] text-center"
                title="Haz clic para restablecer zoom"
              >
                {Math.round(zoom * 100)}%
              </button>

              {/* Zoom In */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="h-9 w-9 text-white hover:bg-white/20 active:scale-95 rounded-full disabled:opacity-30 transition-all shrink-0"
                title="Acercar (+)"
              >
                <ZoomIn className="h-4.5 w-4.5" />
              </Button>

              <div className="w-[1px] h-5 bg-white/25 mx-0.5 shrink-0" />

              {/* Rotate Left */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotateCcw}
                className="h-9 w-9 text-white hover:bg-white/20 active:scale-95 rounded-full transition-all shrink-0"
                title="Rotar antihorario"
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </Button>

              {/* Rotate Right */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotateCw}
                className="h-9 w-9 text-white hover:bg-white/20 active:scale-95 rounded-full transition-all shrink-0"
                title="Rotar horario (R)"
              >
                <RotateCw className="h-4.5 w-4.5" />
              </Button>

              {/* Flip Horizontal */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFlipHorizontal}
                className={`h-9 w-9 text-white hover:bg-white/20 active:scale-95 rounded-full transition-all shrink-0 ${flipX ? 'bg-white/30' : ''}`}
                title="Reflejar horizontalmente"
              >
                <FlipHorizontal className="h-4.5 w-4.5" />
              </Button>

              {/* Reset */}
              {(zoom !== 1 || rotation !== 0 || flipX || position.x !== 0 || position.y !== 0) && (
                <>
                  <div className="w-[1px] h-5 bg-white/25 mx-0.5 shrink-0" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetTransforms}
                    className="h-9 w-9 text-amber-300 hover:text-amber-200 hover:bg-white/20 active:scale-95 rounded-full transition-all shrink-0"
                    title="Restablecer ajustes (0)"
                  >
                    <RefreshCw className="h-4.5 w-4.5" />
                  </Button>
                </>
              )}
            </div>

            <p className="text-gray-300 text-[11px] sm:text-xs text-center font-medium">
              📱 Toca 2 veces o pellizca para zoom • Desliza para mover la foto
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}


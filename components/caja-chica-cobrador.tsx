
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Wallet, TrendingUp, TrendingDown, History, Calendar as CalendarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useCurrency } from "@/hooks/use-currency"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Movimiento {
  id: string
  tipo: string
  monto: number
  saldoAnterior: number
  saldoNuevo: number
  fecha: string
  observaciones: string | null
  asignadoPor: string | null
}

export function CajaChicaCobrador() {
  const { format: formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [saldoActual, setSaldoActual] = useState(0)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState("")

  const fetchData = async () => {
    try {
      setLoading(true)
      const url = fechaSeleccionada ? `/api/caja-chica?fecha=${fechaSeleccionada}` : "/api/caja-chica"
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setSaldoActual(data.saldoActual)
        setMovimientos(data.movimientos)
      }
    } catch (error) {
      console.error("Error al cargar caja chica:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fechaSeleccionada])

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      ENTREGA: "Entrega",
      DEVOLUCION: "Devolución",
      AJUSTE: "Ajuste",
      GASTO: "Gasto",
    }
    return labels[tipo] || tipo
  }

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ENTREGA: "default",
      DEVOLUCION: "secondary",
      AJUSTE: "outline",
      GASTO: "destructive",
    }
    return variants[tipo] || "default"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Caja Chica
            </CardTitle>
            <CardDescription>
              Gestiona tu saldo en efectivo diario
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <div className="flex items-center gap-2 mr-2">
              <Label htmlFor="fecha-cobrador" className="text-sm text-gray-500 hidden sm:inline-block">Fecha:</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                <Input
                  id="fecha-cobrador"
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="pl-9 h-9 w-[140px] sm:w-[160px] cursor-pointer"
                />
              </div>
              {fechaSeleccionada && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFechaSeleccionada("")}
                  className="text-xs text-muted-foreground px-2 h-9"
                >
                  Limpiar
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Saldo Actual */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 mb-6">
          <p className="text-sm font-medium opacity-90 mb-1">Saldo Disponible</p>
          <p className="text-4xl font-bold">
            {formatCurrency(saldoActual)}
          </p>
        </div>

        {/* Historial de Movimientos */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de Movimientos
          </h3>
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Cargando movimientos...</p>
              </div>
            ) : movimientos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No hay movimientos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {movimientos.map((mov) => (
                  <div
                    key={mov.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {mov.tipo === "ENTREGA" ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <Badge variant={getTipoBadge(mov.tipo)}>
                          {getTipoLabel(mov.tipo)}
                        </Badge>
                      </div>
                      <span className={`text-lg font-semibold ${
                        mov.tipo === "ENTREGA" ? "text-green-600" : "text-red-600"
                      }`}>
                        {mov.tipo === "ENTREGA" ? "+" : "-"}{formatCurrency(mov.monto).replace(/^[^\d-]+/, '')}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600">
                        Saldo: {formatCurrency(mov.saldoAnterior)} → {formatCurrency(mov.saldoNuevo)}
                      </p>
                      <p className="text-gray-500">
                        {format(new Date(mov.fecha), "PPp", { locale: es })}
                      </p>
                      {mov.asignadoPor && (
                        <p className="text-gray-500">
                          Por: {mov.asignadoPor}
                        </p>
                      )}
                      {mov.observaciones && (
                        <p className="text-gray-600 mt-2 italic">
                          {mov.observaciones}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

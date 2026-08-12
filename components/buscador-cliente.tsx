"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Search, X, User, Check, Plus, Phone, MapPin, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface Cliente {
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

interface BuscadorClienteProps {
  clientes: Cliente[]
  clienteSeleccionadoId: string
  onSelectCliente: (clienteId: string) => void
  onCrearNuevoConTexto?: (texto: string) => void
  loading?: boolean
}

// Función auxiliar para quitar acentos y normalizar texto
const normalizeText = (text: string = "") => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export default function BuscadorCliente({
  clientes,
  clienteSeleccionadoId,
  onSelectCliente,
  onCrearNuevoConTexto,
  loading = false,
}: BuscadorClienteProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Cliente actualmente seleccionado
  const selectedCliente = useMemo(() => {
    return clientes.find((c) => c.id === clienteSeleccionadoId) || null
  }, [clientes, clienteSeleccionadoId])

  // Filtrar clientes con predicción en tiempo real por múltiples campos y palabras
  const filteredClientes = useMemo(() => {
    const query = normalizeText(searchTerm)
    if (!query) {
      // Si no hay búsqueda, mostrar los primeros 8 clientes como sugerencia rápida
      return clientes.slice(0, 8)
    }

    const tokens = query.split(/\s+/).filter(Boolean)

    return clientes.filter((c) => {
      const fullSearchable = normalizeText(
        `${c.codigoCliente} ${c.documento} ${c.nombre} ${c.apellido} ${c.nombre} ${c.apellido} ${c.telefono || ""} ${c.direccionCliente || ""} ${c.ciudad || ""}`
      )
      return tokens.every((token) => fullSearchable.includes(token))
    }).slice(0, 15) // Limitar a 15 mejores predicciones para máximo rendimiento
  }, [clientes, searchTerm])

  // Cerrar lista al hacer click fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Sincronizar campo de texto con la selección si se cierra o cambia
  useEffect(() => {
    if (selectedCliente && !isOpen) {
      setSearchTerm(`${selectedCliente.nombre} ${selectedCliente.apellido}`)
    }
  }, [selectedCliente, isOpen])

  // Manejo de teclado (flechas arriba/abajo, enter, escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true)
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredClientes.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredClientes.length - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < filteredClientes.length) {
        handleSelect(filteredClientes[selectedIndex])
      } else if (filteredClientes.length > 0) {
        handleSelect(filteredClientes[0])
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  const handleSelect = (cliente: Cliente) => {
    onSelectCliente(cliente.id)
    setSearchTerm(`${cliente.nombre} ${cliente.apellido}`)
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const handleClear = () => {
    onSelectCliente("")
    setSearchTerm("")
    setIsOpen(true)
    inputRef.current?.focus()
  }

  const getInitials = (nombre: string, apellido: string) => {
    const n = nombre ? nombre.charAt(0).toUpperCase() : ""
    const a = apellido ? apellido.charAt(0).toUpperCase() : ""
    return `${n}${a}` || "CL"
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input principal con la Lupita */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 dark:text-emerald-400 pointer-events-none z-10" />

        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            setSelectedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="🔍 Buscar cliente por nombre, documento, código (CL...), teléfono..."
          className="pl-10 pr-24 py-2.5 bg-white dark:bg-[#152e2a] border-gray-300 dark:border-[#1F3A36] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-emerald-300/50 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium text-sm shadow-sm"
          disabled={loading}
          autoComplete="off"
        />

        {/* Botones de acción en la derecha del buscador */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F3A36] transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {selectedCliente && (
            <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
              <Check className="h-3 w-3" /> Seleccionado
            </span>
          )}
        </div>
      </div>

      {/* Menú flotante de predicciones (Autocompletado activo) */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#0E1F1C] border border-gray-200 dark:border-[#1F3A36] rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-[#1F3A36]/60 transition-all"
        >
          {/* Header de sugerencias */}
          <div className="px-3.5 py-2 bg-gray-50/80 dark:bg-[#152e2a]/80 text-[11px] font-semibold text-gray-500 dark:text-emerald-300/70 flex items-center justify-between border-b border-gray-100 dark:border-[#1F3A36]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              {searchTerm ? "Predicciones encontradas" : "Clientes frecuentes / sugeridos"}
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono">
              {filteredClientes.length} {filteredClientes.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>

          {/* Lista de clientes predecidos */}
          {filteredClientes.length > 0 ? (
            <div className="py-1">
              {filteredClientes.map((cliente, idx) => {
                const isSelected = cliente.id === clienteSeleccionadoId
                const isFocused = idx === selectedIndex

                return (
                  <div
                    key={cliente.id}
                    onClick={() => handleSelect(cliente)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-[#152e2a] text-emerald-900 dark:text-emerald-100"
                        : isFocused
                        ? "bg-emerald-50/60 dark:bg-[#1A3330] text-gray-900 dark:text-white"
                        : "hover:bg-gray-50 dark:hover:bg-[#152e2a]/70 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Avatar / Iniciales */}
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-transform ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-sm scale-105"
                            : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {getInitials(cliente.nombre, cliente.apellido)}
                      </div>

                      {/* Info del Cliente */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {cliente.nombre} {cliente.apellido}
                          </span>
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-gray-100 dark:bg-[#1F3A36] text-gray-600 dark:text-emerald-300">
                            {cliente.codigoCliente}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          <span>Doc: <strong className="text-gray-700 dark:text-gray-300 font-medium">{cliente.documento}</strong></span>
                          {cliente.telefono && (
                            <span className="hidden sm:inline-flex items-center gap-0.5">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {cliente.telefono}
                            </span>
                          )}
                          {cliente.direccionCliente && (
                            <span className="hidden md:inline-flex items-center gap-0.5 truncate">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {cliente.direccionCliente}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Icono de Selección */}
                    {isSelected && (
                      <div className="ml-2 shrink-0 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Sin resultados */
            <div className="p-4 text-center space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No se encontraron clientes que coincidan con &quot;<span className="font-semibold text-gray-700 dark:text-gray-200">{searchTerm}</span>&quot;
              </p>
              {onCrearNuevoConTexto && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false)
                    onCrearNuevoConTexto(searchTerm)
                  }}
                  className="w-full text-xs border-dashed border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Registrar &quot;{searchTerm}&quot; como nuevo cliente
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

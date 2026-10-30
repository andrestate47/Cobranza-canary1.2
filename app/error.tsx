'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error no capturado:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold text-rose-400">Ocurrió un error inesperado</h2>
        <p className="text-sm text-slate-400">{error?.message || 'Error en el servidor al procesar la solicitud'}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}

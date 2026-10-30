import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold text-slate-200">Página no encontrada (404)</h2>
        <p className="text-sm text-slate-400">La página a la que intentas acceder no existe o fue movida.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition-colors"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  )
}

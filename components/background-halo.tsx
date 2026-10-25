"use client"

export default function BackgroundHalo() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 hidden dark:block" aria-hidden="true">
      {/* Halo central superior detrás del contenido */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[700px] sm:w-[850px] h-[360px] rounded-full bg-gradient-to-r from-cyan-500/25 via-teal-400/30 to-emerald-500/25 blur-[120px] animate-pulse-slow pointer-events-none" />
      {/* Patrón sutil de cuadrícula */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  )
}

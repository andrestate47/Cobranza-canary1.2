"use client"

export default function BackgroundHalo() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 hidden dark:block"
      style={{ contain: "strict" }}
      aria-hidden="true"
    >
      {/* Halo central superior optimizado con radial-gradient nativo (0 coste de cálculo de blur) */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[750px] sm:w-[950px] h-[450px] animate-pulse-slow pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 30%, rgba(20, 184, 166, 0.32) 0%, rgba(6, 182, 212, 0.22) 35%, rgba(16, 185, 129, 0.08) 60%, transparent 80%)",
          transform: "translate3d(-50%, 0, 0)",
          willChange: "opacity",
        }}
      />
      {/* Patrón sutil de cuadrícula aislado */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
          transform: "translateZ(0)",
        }}
      />
    </div>
  )
}

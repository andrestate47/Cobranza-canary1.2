"use client"

import React from "react"
import { CreditScoreResult } from "@/lib/credit-score"
import { useCurrency } from "@/hooks/use-currency"

interface CreditScoreCardProps {
  scoreData: CreditScoreResult
  className?: string
}

export default function CreditScoreCard({ scoreData, className = "" }: CreditScoreCardProps) {
  const { format: formatCurrency } = useCurrency()

  const {
    score,
    nivel,
    colorTexto,
    colorRing,
    colorHex,
    completados,
    enMora,
    puntualidad,
    historial,
    consistencia,
    antiguedad,
    montoMaximoSugerido
  } = scoreData

  // Cálculo del offset circular para el score (radio 24, circunferencia ~150.8)
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-between mb-3.5">
        <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Score crediticio
        </h4>
      </div>

      {/* Cabecera del Score con Anillo y Nivel */}
      <div className="flex items-center gap-3.5 mb-4 sm:mb-5">
        {/* Círculo con indicador visual tipo gauge */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 60 60">
            {/* Círculo de fondo */}
            <circle
              cx="30"
              cy="30"
              r={radius}
              stroke="currentColor"
              strokeWidth="4.5"
              className="text-gray-100 dark:text-gray-800"
              fill="transparent"
            />
            {/* Círculo de progreso animado */}
            <circle
              cx="30"
              cy="30"
              r={radius}
              stroke={colorHex}
              strokeWidth="4.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <span className={`absolute font-bold text-lg sm:text-xl ${colorTexto}`}>
            {score}
          </span>
        </div>

        {/* Nivel y resumen */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-base sm:text-lg font-bold tracking-tight ${colorTexto}`}>
              {nivel}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate mt-0.5">
            {completados} completados · {enMora} en mora
          </p>
        </div>
      </div>

      {/* Desglose de los 4 Pilares */}
      <div className="space-y-3 sm:space-y-3.5 mb-4 sm:mb-5 text-xs sm:text-[13px]">
        {/* 1. Puntualidad */}
        <div>
          <div className="flex justify-between items-center mb-1 text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-600 dark:text-gray-400">Puntualidad</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {puntualidad.puntos}/{puntualidad.max}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-blue-600 dark:bg-blue-500"
              style={{ width: `${Math.min(100, Math.max(0, puntualidad.porcentaje))}%` }}
            />
          </div>
        </div>

        {/* 2. Historial de pago */}
        <div>
          <div className="flex justify-between items-center mb-1 text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-600 dark:text-gray-400">Historial de pago</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {historial.puntos}/{historial.max}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-blue-600 dark:bg-blue-500"
              style={{ width: `${Math.min(100, Math.max(0, historial.porcentaje))}%` }}
            />
          </div>
        </div>

        {/* 3. Consistencia */}
        <div>
          <div className="flex justify-between items-center mb-1 text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-600 dark:text-gray-400">Consistencia</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {consistencia.puntos}/{consistencia.max}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-blue-600 dark:bg-blue-500"
              style={{ width: `${Math.min(100, Math.max(0, consistencia.porcentaje))}%` }}
            />
          </div>
        </div>

        {/* 4. Antigüedad */}
        <div>
          <div className="flex justify-between items-center mb-1 text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-600 dark:text-gray-400">Antigüedad</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {antiguedad.puntos}/{antiguedad.max}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-blue-600 dark:bg-blue-500"
              style={{ width: `${Math.min(100, Math.max(0, antiguedad.porcentaje))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Caja Inferior de Monto Máximo Sugerido */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 sm:p-3.5 text-center border border-slate-100 dark:border-slate-800">
        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-normal block">
          Monto máximo sugerido
        </span>
        <span className="text-base sm:text-xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight mt-0.5 block">
          {formatCurrency(montoMaximoSugerido)}
        </span>
      </div>
    </div>
  )
}

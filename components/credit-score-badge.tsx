"use client"

import React from "react"
import { CreditScoreResult } from "@/lib/credit-score"

interface CreditScoreBadgeProps {
  scoreData: CreditScoreResult
  onClick?: (e: React.MouseEvent) => void
  className?: string
  mostrarTexto?: boolean
}

export default function CreditScoreBadge({
  scoreData,
  onClick,
  className = "",
  mostrarTexto = true
}: CreditScoreBadgeProps) {
  const { score, nivel } = scoreData

  // Estilos sutiles y elegantes según el nivel
  let badgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
  let dotColor = "bg-blue-500"

  if (score >= 80) {
    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
    dotColor = "bg-emerald-500"
  } else if (score >= 65) {
    badgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
    dotColor = "bg-blue-500"
  } else if (score >= 50) {
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
    dotColor = "bg-amber-500"
  } else {
    badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
    dotColor = "bg-rose-500"
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-150 select-none shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${badgeStyle} ${
        onClick ? "cursor-pointer hover:opacity-85 active:scale-95" : ""
      } ${className}`}
      title={`Score Crediticio: ${score}/100 (${nivel})`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className="font-bold">{score}</span>
      {mostrarTexto && <span className="opacity-75 font-medium">{nivel}</span>}
    </span>
  )
}

"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const currentTheme = resolvedTheme || theme
    setTheme(currentTheme === "dark" ? "light" : "dark")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-gray-200 dark:border-[#1F3A36] bg-white dark:bg-[#152e2a] hover:bg-gray-100 dark:hover:bg-[#1A3330] focus-visible:ring-0 transition-all shrink-0"
      title="Cambiar tema claro/oscuro"
      aria-label="Cambiar tema"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[#36E2C2]" />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  )
}


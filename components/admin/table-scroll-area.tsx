"use client"

import { cn } from "@/lib/utils"

type TableScrollAreaProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Contenedor de tabla a ancho completo con scroll vertical (y horizontal si hace falta).
 * Usa thead sticky dentro del área de scroll para que el encabezado permanezca visible.
 */
export function TableScrollArea({ children, className }: TableScrollAreaProps) {
  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className="max-h-[min(50vh,28rem)] w-full overflow-y-auto overflow-x-auto rounded-md border border-zinc-200 dark:border-emerald-800">
        {children}
      </div>
    </div>
  )
}

"use client"

import { CalendarRange } from "lucide-react"

import { useAdminPeriod } from "@/components/providers/admin-period-provider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAdminYearBounds } from "@/lib/admin-period"
import { cn } from "@/lib/utils"

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const monthNum = i + 1
  const label = new Intl.DateTimeFormat("es", { month: "long" }).format(
    new Date(2020, i, 1)
  )
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1)
  return { value: String(monthNum), label: capitalized }
})

const triggerClass = cn(
  "h-9 min-w-[10.5rem] rounded-xl border-zinc-200 bg-white text-zinc-900 shadow-xs",
  "hover:bg-zinc-50 focus-visible:ring-emerald-500/50 dark:border-zinc-700 dark:bg-zinc-900/80",
  "dark:text-zinc-50 dark:hover:bg-zinc-800/80"
)

const contentClass = cn(
  "rounded-xl border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
)

export const AdminPeriodToolbar = () => {
  const { month, year, monthLabel, setMonth, setYear } = useAdminPeriod()
  const { minYear, maxYear } = getAdminYearBounds()
  const yearOptions: number[] = []
  for (let y = minYear; y <= maxYear; y += 1) {
    yearOptions.push(y)
  }

  const handleMonthChange = (value: string) => {
    const next = Number(value)
    setMonth(next)
  }

  const handleYearChange = (value: string) => {
    const next = Number(value)
    setYear(next)
  }

  return (
    <div
      role="region"
      aria-label="Período a administrar"
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-4 flex flex-wrap items-end gap-3 border-b border-zinc-200/80",
        "bg-zinc-50/95 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90",
        "md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
      )}
    >
      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
          aria-hidden
        >
          <CalendarRange className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Período activo
          </p>
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {monthLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-period-month" className="text-xs text-zinc-500 dark:text-zinc-400">
            Mes
          </Label>
          <Select value={String(month)} onValueChange={handleMonthChange}>
            <SelectTrigger
              id="admin-period-month"
              size="sm"
              className={triggerClass}
              aria-label="Seleccionar mes a administrar"
            >
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent className={contentClass} position="popper">
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-period-year" className="text-xs text-zinc-500 dark:text-zinc-400">
            Año
          </Label>
          <Select value={String(year)} onValueChange={handleYearChange}>
            <SelectTrigger
              id="admin-period-year"
              size="sm"
              className={cn(triggerClass, "min-w-[6.5rem]")}
              aria-label="Seleccionar año a administrar"
            >
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent className={contentClass} position="popper">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {String(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

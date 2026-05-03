"use client"

import { useState } from "react"
import { CalendarRange } from "lucide-react"

import { useAdminPeriod } from "@/components/providers/admin-period-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

/** Pestaña en el pie del sidebar: abre el modal de mes / año. */
export const AdminPeriodToolbar = () => {
  const { month, year, monthLabel, setMonth, setYear } = useAdminPeriod()
  const { minYear, maxYear } = getAdminYearBounds()
  const [open, setOpen] = useState(false)

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
    <div className="w-full">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative flex w-full flex-col gap-0.5 rounded-t-2xl rounded-b-md border px-3 py-2.5 text-left",
              "border-emerald-400/55 bg-linear-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-md",
              "ring-1 ring-white/15 transition hover:brightness-110 focus:outline-none focus-visible:ring-2",
              "focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-900",
              "dark:border-emerald-500/35 dark:from-emerald-800 dark:via-emerald-900 dark:to-teal-950 dark:shadow-[0_12px_40px_-12px_rgba(6,78,59,0.65)]"
            )}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`Periodo: ${monthLabel}. Abrir para cambiar mes y año`}
          >
            <span className="pr-8 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/95">
              Periodo
            </span>
            <span className="truncate text-sm font-semibold tabular-nums text-white">{monthLabel}</span>
            <CalendarRange
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-85"
              aria-hidden
            />
          </button>
        </DialogTrigger>
        <DialogContent className="gap-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Período a administrar</DialogTitle>
            <DialogDescription>
              Mes y año activos: <span className="font-medium text-zinc-800 dark:text-zinc-200">{monthLabel}</span>
            </DialogDescription>
          </DialogHeader>

          <div
            role="group"
            aria-label="Seleccionar mes y año a administrar"
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="admin-period-month" className="text-xs text-zinc-500 dark:text-zinc-400">
                Mes
              </Label>
              <Select value={String(month)} onValueChange={handleMonthChange}>
                <SelectTrigger
                  id="admin-period-month"
                  size="sm"
                  className={cn(triggerClass, "w-full")}
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

            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="admin-period-year" className="text-xs text-zinc-500 dark:text-zinc-400">
                Año
              </Label>
              <Select value={String(year)} onValueChange={handleYearChange}>
                <SelectTrigger
                  id="admin-period-year"
                  size="sm"
                  className={cn(triggerClass, "min-w-0 w-full sm:min-w-26")}
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
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { buildHtmlMonth } from "@/lib/admin-period"
import {
  getAdminPeriodClientSnapshot,
  getAdminPeriodServerSnapshot,
  subscribeAdminPeriod,
  writeAdminPeriod,
} from "@/lib/admin-period-store"
import { formatHtmlMonthLabel, monthBoundsFromHtmlMonth } from "@/lib/monthly-finance"

export type AdminPeriodContextValue = {
  /** Valor `YYYY-MM` alineado con `type="month"` y utilidades en `@/lib/monthly-finance`. */
  htmlMonth: string
  month: number
  year: number
  /** Etiqueta legible en español (mes largo + año). */
  monthLabel: string
  setHtmlMonth: (value: string) => void
  setMonth: (month: number) => void
  setYear: (year: number) => void
}

const AdminPeriodContext = createContext<AdminPeriodContextValue | null>(null)

export const AdminPeriodProvider = ({ children }: { children: ReactNode }) => {
  const htmlMonth = useSyncExternalStore(
    subscribeAdminPeriod,
    getAdminPeriodClientSnapshot,
    getAdminPeriodServerSnapshot
  )

  const persist = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!monthBoundsFromHtmlMonth(trimmed)) return
    writeAdminPeriod(trimmed)
  }, [])

  const setHtmlMonth = useCallback(
    (value: string) => {
      persist(value)
    },
    [persist]
  )

  const { month, year } = useMemo(() => {
    const part = htmlMonth.trim()
    const [y, m] = part.split("-").map(Number)
    if (!y || !m || m < 1 || m > 12) {
      const d = new Date()
      return { month: d.getMonth() + 1, year: d.getFullYear() }
    }
    return { month: m, year: y }
  }, [htmlMonth])

  const setMonth = useCallback(
    (m: number) => {
      if (!Number.isFinite(m) || m < 1 || m > 12) return
      writeAdminPeriod(buildHtmlMonth(year, m))
    },
    [year]
  )

  const setYear = useCallback(
    (y: number) => {
      if (!Number.isFinite(y)) return
      writeAdminPeriod(buildHtmlMonth(y, month))
    },
    [month]
  )

  const monthLabel = useMemo(() => formatHtmlMonthLabel(htmlMonth), [htmlMonth])

  const value = useMemo(
    (): AdminPeriodContextValue => ({
      htmlMonth,
      month,
      year,
      monthLabel,
      setHtmlMonth,
      setMonth,
      setYear,
    }),
    [htmlMonth, month, year, monthLabel, setHtmlMonth, setMonth, setYear]
  )

  return (
    <AdminPeriodContext.Provider value={value}>{children}</AdminPeriodContext.Provider>
  )
}

export const useAdminPeriod = (): AdminPeriodContextValue => {
  const ctx = useContext(AdminPeriodContext)
  if (!ctx) {
    throw new Error("useAdminPeriod debe usarse dentro de AdminPeriodProvider")
  }
  return ctx
}

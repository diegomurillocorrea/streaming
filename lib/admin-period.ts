import {
  getHtmlMonthValueForToday,
  monthBoundsFromHtmlMonth,
} from "@/lib/monthly-finance"

/** Clave en localStorage para el período global de administración (YYYY-MM). */
export const ADMIN_PERIOD_STORAGE_KEY = "streaming-admin-period"

export const getAdminYearBounds = (): { minYear: number; maxYear: number } => {
  const y = new Date().getFullYear()
  return { minYear: y - 10, maxYear: y + 2 }
}

/** Devuelve un YYYY-MM válido para la UI, acotado al rango de años permitido. */
export const normalizeAdminHtmlMonth = (htmlMonth: string): string => {
  const trimmed = htmlMonth.trim()
  const bounds = monthBoundsFromHtmlMonth(trimmed)
  if (!bounds) return getHtmlMonthValueForToday()

  const { minYear, maxYear } = getAdminYearBounds()
  let y = bounds.start.getFullYear()
  const m = bounds.start.getMonth() + 1
  const mm = String(m).padStart(2, "0")

  if (y < minYear) return `${minYear}-${mm}`
  if (y > maxYear) return `${maxYear}-${mm}`
  return `${y}-${mm}`
}

export const buildHtmlMonth = (year: number, month: number): string => {
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return getHtmlMonthValueForToday()
  }
  const m = Math.min(12, Math.max(1, Math.floor(month)))
  return `${Math.floor(year)}-${String(m).padStart(2, "0")}`
}

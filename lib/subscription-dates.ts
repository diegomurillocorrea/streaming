/**
 * Clave "año-mes" con mes 0–11, alineada con Date#getMonth().
 */
export function getCurrentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}`
}

/**
 * Extrae año y mes calendario desde Postgres `date` / string `YYYY-MM-DD`
 * sin desfases por parseo ISO en UTC (evita mes incorrecto en algunas zonas).
 */
export function monthKeyFromDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const part = String(dateStr).split("T")[0]
  const [y, m] = part.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return ""
  return `${y}-${m - 1}`
}

/**
 * Primer día del mes local actual (`YYYY-MM-DD`) para columna `paid_month` en inserts.
 */
export function firstDayOfCurrentMonthLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, "0")}-01`
}

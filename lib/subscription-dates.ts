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
 * Convierte `YYYY-MM` (mes del período global) a la misma clave que usa
 * `monthKeyFromDateOnly` sobre `paid_month` (`año-mesJS` con mes 0–11).
 */
export function monthKeyFromHtmlMonth(htmlMonth: string): string {
  const part = htmlMonth.trim()
  const [y, m] = part.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return getCurrentMonthKey()
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

/**
 * Primer día del mes (`YYYY-MM-01`) al sumar `monthsToAdd` meses calendario (UTC estable).
 */
export function addCalendarMonthsFirstDay(
  paidMonthFirstDay: string,
  monthsToAdd: number
): string {
  const part = String(paidMonthFirstDay).split("T")[0]
  const [y, m] = part.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) {
    return paidMonthFirstDay
  }
  const utc = new Date(Date.UTC(y, m - 1 + monthsToAdd, 1))
  const yy = utc.getUTCFullYear()
  const mm = utc.getUTCMonth() + 1
  return `${yy}-${String(mm).padStart(2, "0")}-01`
}

/**
 * Claves `año-mesJS` (como `monthKeyFromDateOnly`) de los primeros `spanMonths`
 * meses calendario desde `paidMonthFirstDay`.
 */
export function paidMonthCalendarMonthKeys(
  paidMonthFirstDay: string,
  spanMonths: number
): string[] {
  const span = Math.min(Math.max(1, Math.floor(spanMonths)), 36)
  const keys: string[] = []
  for (let i = 0; i < span; i++) {
    const iso = addCalendarMonthsFirstDay(paidMonthFirstDay, i)
    keys.push(monthKeyFromDateOnly(iso))
  }
  return keys
}

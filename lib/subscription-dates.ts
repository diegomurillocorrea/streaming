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
 * Orden cronológico real entre claves `año-mesJS` (como `monthKeyFromDateOnly`),
 * sin comparar lexicográficamente el segmento del mes (evita errores p. ej. octubre vs noviembre).
 */
export function compareCalendarMonthKeys(a: string, b: string): number {
  const [ayRaw, amRaw] = a.split("-")
  const [byRaw, bmRaw] = b.split("-")
  const ay = Number(ayRaw)
  const am = Number(amRaw)
  const by = Number(byRaw)
  const bm = Number(bmRaw)
  if (!Number.isFinite(ay) || !Number.isFinite(am)) return 0
  if (!Number.isFinite(by) || !Number.isFinite(bm)) return 0
  if (ay !== by) return ay - by
  return am - bm
}

/**
 * True si debe evaluarse cobro/pendiente para ese mes: la suscripción ya existía
 * en ese mes calendario (inicio de servicio ≤ último día del mes consultado).
 */
export function subscriptionDebtAppliesToCalendarMonthKey(
  serviceStartDate: string | null | undefined,
  monthKey: string
): boolean {
  if (!serviceStartDate?.trim()) return true
  const startKey = monthKeyFromDateOnly(serviceStartDate)
  if (!startKey) return true
  return compareCalendarMonthKeys(monthKey, startKey) >= 0
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
 * Mes y año en español desde ISO (`created_at`, etc.) o `YYYY-MM-DD`, sin corrimientos por UTC.
 */
export function formatSpanishMonthYearFromIso(
  iso: string | null | undefined
): string {
  if (!iso?.trim()) return "—"
  const raw = String(iso).trim()
  const datePart = raw.includes("T")
    ? raw.split("T")[0]
    : raw.split(" ")[0] ?? raw
  const d = new Date(`${datePart}T12:00:00`)
  if (Number.isNaN(d.getTime())) {
    const d2 = new Date(raw)
    if (Number.isNaN(d2.getTime())) return "—"
    return new Intl.DateTimeFormat("es", {
      month: "long",
      year: "numeric",
    }).format(d2)
  }
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(d)
}

/**
 * Suma meses calendario a una fecha `YYYY-MM-DD` usando mediodía local
 * (reduce saltos por DST al avanzar el mes).
 */
export function addCalendarMonthsToYmdLocal(
  ymd: string,
  monthsToAdd: number
): string {
  const part = String(ymd).split("T")[0]
  const [y, m, d] = part.split("-").map(Number)
  if (!y || !m || !d) return ymd
  const n = Math.floor(Number(monthsToAdd))
  if (!Number.isFinite(n)) return ymd
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0)
  dt.setMonth(dt.getMonth() + n)
  const yy = dt.getFullYear()
  const mm = dt.getMonth() + 1
  const dd = dt.getDate()
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
}

export function normalizeSubscriptionPeriodMonths(
  periodMonthsRaw: number | null | undefined
): number {
  if (periodMonthsRaw === null || periodMonthsRaw === undefined) return 1
  const p = Math.floor(Number(periodMonthsRaw))
  if (!Number.isFinite(p) || p < 1) return 1
  return p
}

function daysInCalendarMonthLocal(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/** Día del mes (1–31) desde `accounts.payment_date` u otra fecha `YYYY-MM-DD`. */
export function paymentDayOfMonthFromAccountDate(
  accountPaymentDate: string | null | undefined
): number | null {
  if (!accountPaymentDate?.trim()) return null
  const dPart = String(accountPaymentDate).split("T")[0]
  const seg = dPart.split("-")
  if (seg.length < 3) return null
  const dd = Number(seg[2])
  if (Number.isNaN(dd) || dd < 1 || dd > 31) return null
  return dd
}

/**
 * Igual que «Próximo pago» / «Próximo ciclo» en el panel: siguiente cobro a partir de
 * `service_start_date` y `period_in_months`.
 *
 * Si la cuenta tiene **día de pago** (`payment_date`), el cobro cae en el mes
 * calendario que resulta de sumar `period` al **mes de inicio** (día 1), usando ese
 * día del mes (p. ej. inicio 6 abr + período 1 + día cuenta 5 → 5 may).
 *
 * Si no hay día en cuenta, se suma `period` meses a la fecha completa de inicio (local).
 */
/**
 * Fecha de vencimiento del cobro según **solo** inicio de servicio y período:
 * suma `period_in_months` meses calendario a la fecha de inicio (mismo día del mes cuando el mes destino lo permite).
 * No usa `accounts.payment_date`. Es la fecha que el cliente asocia a «cada período desde el día que empezó».
 */
export function subscriptionCalendarPaymentDueYmd(
  serviceStartDate: string | null | undefined,
  periodMonthsRaw: number | null | undefined
): string | null {
  if (!serviceStartDate?.trim()) return null
  const part = String(serviceStartDate).split("T")[0]
  const [y0, m0, d0] = part.split("-").map(Number)
  if (!y0 || !m0 || !d0) return null
  const period = normalizeSubscriptionPeriodMonths(periodMonthsRaw)
  const startYmd = `${y0}-${String(m0).padStart(2, "0")}-${String(d0).padStart(2, "0")}`
  return addCalendarMonthsToYmdLocal(startYmd, period)
}

export function subscriptionNextPaymentAfterStartYmd(
  serviceStartDate: string | null | undefined,
  periodMonthsRaw: number | null | undefined,
  accountPaymentDate?: string | null | undefined
): string | null {
  if (!serviceStartDate?.trim()) return null
  const part = String(serviceStartDate).split("T")[0]
  const [y0, m0, d0] = part.split("-").map(Number)
  if (!y0 || !m0 || !d0) return null
  const period = normalizeSubscriptionPeriodMonths(periodMonthsRaw)

  const accountDay = paymentDayOfMonthFromAccountDate(accountPaymentDate)
  if (accountDay === null) {
    const startYmd = `${y0}-${String(m0).padStart(2, "0")}-${String(d0).padStart(2, "0")}`
    return addCalendarMonthsToYmdLocal(startYmd, period)
  }

  const anchor = new Date(y0, m0 - 1, 1, 12, 0, 0, 0)
  anchor.setMonth(anchor.getMonth() + period)
  const yy = anchor.getFullYear()
  const monthIndex = anchor.getMonth()
  const dim = daysInCalendarMonthLocal(yy, monthIndex)
  const day = Math.min(accountDay, dim)
  const mm = monthIndex + 1
  return `${yy}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`
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

/**
 * Clave `YYYY-MM-DD` para ordenar cobros pendientes del mes activo (día 1–31).
 * Usa el día de `fechaDePagoIso` o, si falta, el de `accounts.payment_date`.
 * Sin día usable → `9999-12-31` (al final).
 */
export function subscriptionPaymentDueSortYmdInPendingMonth(
  selectedMonthKey: string,
  fechaDePagoIso: string | null | undefined,
  accountPaymentDate: string | null | undefined
): string {
  const [yearRaw, monthIndexRaw] = selectedMonthKey.split("-")
  const year = Number(yearRaw)
  const monthIndex = Number(monthIndexRaw)
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return fechaDePagoIso?.split("T")[0] ?? "9999-12-31"
  }

  const month = monthIndex + 1
  const day =
    paymentDayOfMonthFromAccountDate(fechaDePagoIso) ??
    paymentDayOfMonthFromAccountDate(accountPaymentDate)

  if (day === null) return "9999-12-31"

  const maxDay = daysInCalendarMonthLocal(year, monthIndex)
  const clamped = Math.min(Math.max(day, 1), maxDay)
  return `${year}-${String(month).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`
}

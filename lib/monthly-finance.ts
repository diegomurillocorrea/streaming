/**
 * Utilidades para el dashboard de finanzas mensuales (alineado con
 * `isPaymentConfirmedForMonth` en subscriptions/[id]/page.tsx).
 */

export const getHtmlMonthValueForToday = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, "0")}`
}

export const firstDayFromHtmlMonth = (htmlMonth: string): string => {
  const part = htmlMonth.trim()
  const [y, m] = part.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return ""
  return `${y}-${String(m).padStart(2, "0")}-01`
}

export const monthBoundsFromHtmlMonth = (
  htmlMonth: string
): { start: Date; end: Date } | null => {
  const part = htmlMonth.trim()
  const [y, m] = part.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0)
  const end = new Date(y, m, 0, 23, 59, 59, 999)
  return { start, end }
}

export const formatHtmlMonthLabel = (htmlMonth: string): string => {
  const bounds = monthBoundsFromHtmlMonth(htmlMonth)
  if (!bounds) return htmlMonth
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(bounds.start)
}

export const isPaymentRowConfirmed = (
  amount: number | null | undefined,
  accountPriceByClient: number | null | undefined
): boolean => {
  const amountNum =
    amount !== null && amount !== undefined ? Number(amount) : 0
  if (Number.isNaN(amountNum)) return false

  if (accountPriceByClient === null || accountPriceByClient === undefined) {
    return amountNum > 0
  }

  const priceNum = Number(accountPriceByClient)
  if (Number.isNaN(priceNum) || priceNum <= 0) {
    return amountNum > 0
  }

  return amountNum >= priceNum
}

export const parseCompanyMembershipCost = (
  companies: unknown
): number => {
  const co = Array.isArray(companies) ? companies[0] : companies
  const v = (co as { membership_monthly_cost?: unknown } | null)
    ?.membership_monthly_cost
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isNaN(n) || n < 0 ? 0 : n
}

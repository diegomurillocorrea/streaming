/**
 * Utilidades para el dashboard de finanzas mensuales (alineado con
 * criterio de monto en suscripciones; la confirmación con comprobante vive en
 * `@/lib/payment-confirmation`).
 */

import { isPaymentSlotAmountConfirmed } from "@/lib/payment-confirmation"

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
  accountPriceByClient: number | null | undefined,
  subscriptionPeriodMonths?: number | null
): boolean =>
  isPaymentSlotAmountConfirmed(
    amount,
    accountPriceByClient,
    subscriptionPeriodMonths
  )

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

/**
 * Solo cuentas cuya empresa tiene costo de membresía mensual configurado (> 0)
 * entran en agregados financieros (ej. Gmail sin costo queda fuera de finanzas).
 */
export const isCompanyInFinancialScope = (companies: unknown): boolean =>
  parseCompanyMembershipCost(companies) > 0

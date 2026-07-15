import { hasReceiptEvidence } from "@/lib/payment-evidence"
import {
  MAX_PAYMENT_MONTH_SPREAD,
  roundMoney2,
} from "@/lib/multi-month-payment"
import {
  compareCalendarMonthKeys,
  monthKeyFromDateOnly,
  paidMonthCalendarMonthKeys,
} from "@/lib/subscription-dates"

export type PaymentMonthBadgeStatus = "CONFIRMADO" | "REGISTRADO" | "PENDIENTE"

export type PaymentRowLike = {
  id_payment?: number
  id_bank_account?: number | null
  paid_month?: string | null
  amount?: number | null
  payment_date?: string | null
  payment_reference?: string | null
  receipt_storage_path?: string | null
  months_covered?: number | null
  bank_accounts?: unknown
}

/** Normaliza months_covered de un pago (default 1, max 24). */
export const normalizeMonthsCovered = (
  monthsCovered: number | null | undefined
): number => {
  if (monthsCovered === null || monthsCovered === undefined) return 1
  const n = Math.floor(Number(monthsCovered))
  if (Number.isNaN(n) || n < 1) return 1
  return Math.min(MAX_PAYMENT_MONTH_SPREAD, n)
}

/**
 * Cuántos meses calendario cubre un pago desde su `paid_month` (ancla).
 * Usa `months_covered` explícito; no infiere repartiendo el monto.
 */
export const coverageSpanMonthsFromPayment = (
  payment: PaymentRowLike | number,
  _unitPrice?: number,
  _subscriptionPeriodMonths?: number | null | undefined
): number => {
  // Firma legacy (amount, unitPrice, period) — solo amount numérico sin objeto.
  if (typeof payment === "number") {
    return 1
  }
  return normalizeMonthsCovered(payment.months_covered)
}

/**
 * Meses restantes de cobertura respecto al Periodo activo.
 * Ancla junio + months_covered 2 → jun=2, jul=1, ago=0.
 */
export const remainingCoveredMonths = (
  payment: PaymentRowLike | null | undefined,
  selectedMonthKey: string
): number => {
  if (!payment?.paid_month) return 0
  const span = normalizeMonthsCovered(payment.months_covered)
  const anchorKey = monthKeyFromDateOnly(payment.paid_month)
  if (!anchorKey || !selectedMonthKey) return 0

  const elapsed = compareCalendarMonthKeys(selectedMonthKey, anchorKey)
  if (elapsed < 0) return 0
  return Math.max(0, span - elapsed)
}

/**
 * Monto mínimo del prepago: precio_unitario * meses cubiertos.
 */
export const minimumAmountDueForPrepaid = (
  accountPrice: number | null | undefined,
  monthsCovered: number | null | undefined
): number | null => {
  if (accountPrice === null || accountPrice === undefined) return null
  const priceNum = Number(accountPrice)
  if (Number.isNaN(priceNum) || priceNum <= 0) return null
  const months = normalizeMonthsCovered(monthsCovered)
  return roundMoney2(priceNum * months)
}

/** @deprecated Preferir minimumAmountDueForPrepaid; umbral por mes = precio unitario. */
export const minimumAmountDueForCalendarMonth = (
  accountPrice: number | null | undefined,
  _subscriptionPeriodMonths?: number | null | undefined
): number | null => {
  if (accountPrice === null || accountPrice === undefined) return null
  const priceNum = Number(accountPrice)
  if (Number.isNaN(priceNum) || priceNum <= 0) return null
  return roundMoney2(priceNum)
}

/** Monto del pago alcanza lo debido por su ventana (precio * months_covered). */
export const isPaymentAmountComplete = (
  payment: PaymentRowLike,
  accountPrice: number | null
): boolean => {
  const amountNum =
    payment.amount !== null && payment.amount !== undefined
      ? Number(payment.amount)
      : 0
  if (Number.isNaN(amountNum)) return false

  const threshold = minimumAmountDueForPrepaid(
    accountPrice,
    payment.months_covered
  )
  if (threshold === null) return amountNum > 0
  return amountNum >= threshold - 1e-9
}

/** Filas de finanzas: monto vs precio unitario del mes ancla (pago completo). */
export const isPaymentSlotAmountConfirmed = (
  amount: number | null | undefined,
  accountPrice: number | null | undefined,
  monthsCovered?: number | null
): boolean => {
  const amountNum =
    amount !== null && amount !== undefined ? Number(amount) : 0
  if (Number.isNaN(amountNum)) return false

  const threshold = minimumAmountDueForPrepaid(accountPrice, monthsCovered ?? 1)
  if (threshold === null) return amountNum > 0
  return amountNum >= threshold - 1e-9
}

/** @deprecated Usar isPaymentAmountComplete. */
export const isPaymentAmountCompleteForMonth = (
  payment: PaymentRowLike,
  monthKey: string,
  accountPrice: number | null,
  _subscriptionPeriodMonths?: number | null
): boolean => {
  if (!payment?.paid_month) return false
  if (monthKeyFromDateOnly(payment.paid_month) !== monthKey) {
    // Puede ser ancla de otro mes que aún cubre este
    const remaining = remainingCoveredMonths(payment, monthKey)
    if (remaining <= 0) return false
  }
  return isPaymentAmountComplete(payment, accountPrice)
}

/** Pago cuya ventana [paid_month, +months_covered) incluye `monthKey` (sin exigir monto). */
export const findPaymentInCoverageWindow = (
  payments: PaymentRowLike[],
  monthKey: string
): PaymentRowLike | null => {
  let best: PaymentRowLike | null = null
  let bestRemaining = -1

  for (const p of payments) {
    if (!p?.paid_month) continue
    const remaining = remainingCoveredMonths(p, monthKey)
    if (remaining <= 0) continue
    if (remaining > bestRemaining) {
      best = p
      bestRemaining = remaining
    }
  }

  return best
}

/** Pago ancla con monto completo cuya ventana incluye `monthKey`. */
export const findPaymentCoveringCalendarMonth = (
  payments: PaymentRowLike[],
  monthKey: string,
  accountPrice: number | null,
  _subscriptionPeriodMonths?: number | null
): PaymentRowLike | null => {
  let best: PaymentRowLike | null = null
  let bestRemaining = -1

  for (const p of payments) {
    if (!p?.paid_month) continue
    const remaining = remainingCoveredMonths(p, monthKey)
    if (remaining <= 0) continue
    if (!isPaymentAmountComplete(p, accountPrice)) continue
    if (remaining > bestRemaining) {
      best = p
      bestRemaining = remaining
    }
  }

  return best
}

/** Hay cobertura activa (con monto completo) para el mes calendario. */
export const hasPaidCalendarMonthForSubscription = (
  payments: PaymentRowLike[],
  monthKey: string,
  accountPrice: number | null,
  _subscriptionPeriodMonths?: number | null
): boolean => {
  return (
    findPaymentCoveringCalendarMonth(payments, monthKey, accountPrice) !== null
  )
}

/**
 * Estado de comprobante para el mes.
 * CONFIRMADO = cobertura + monto OK + archivo de comprobante.
 * REGISTRADO = cobertura + monto OK sin archivo.
 */
export const subscriptionPaymentBadgeStatus = (
  payments: PaymentRowLike[],
  monthKey: string,
  accountPrice: number | null,
  _subscriptionPeriodMonths?: number | null
): PaymentMonthBadgeStatus => {
  const covering = findPaymentCoveringCalendarMonth(
    payments,
    monthKey,
    accountPrice
  )
  if (!covering) return "PENDIENTE"
  return hasReceiptEvidence(covering) ? "CONFIRMADO" : "REGISTRADO"
}

/** @deprecated Usar `subscriptionPaymentBadgeStatus` con la lista completa de pagos. */
export const paymentMonthBadgeStatus = (
  payment: PaymentRowLike | null | undefined,
  monthKey: string,
  accountPrice: number | null,
  subscriptionPeriodMonths?: number | null
): PaymentMonthBadgeStatus =>
  subscriptionPaymentBadgeStatus(
    payment ? [payment] : [],
    monthKey,
    accountPrice,
    subscriptionPeriodMonths
  )

/** Monto completo y además hay archivo de comprobante. */
export const isPaymentFullyConfirmedForMonth = (
  payment: PaymentRowLike,
  monthKey: string,
  accountPrice: number | null,
  _subscriptionPeriodMonths?: number | null
): boolean => {
  const remaining = remainingCoveredMonths(payment, monthKey)
  if (remaining <= 0) return false
  return isPaymentAmountComplete(payment, accountPrice) && hasReceiptEvidence(payment)
}

/** Claves de meses cubiertos por un pago (desde ancla). */
export const calendarMonthKeysCoveredByPayment = (
  payment: PaymentRowLike
): string[] => {
  if (!payment.paid_month) return []
  const span = normalizeMonthsCovered(payment.months_covered)
  return paidMonthCalendarMonthKeys(payment.paid_month, span)
}

import { hasPaymentEvidence } from "@/lib/payment-evidence"
import {
  fullMonthsCoveredByAmount,
  MAX_PAYMENT_MONTH_SPREAD,
  roundMoney2,
} from "@/lib/multi-month-payment"
import {
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
  bank_accounts?: unknown
}

const normalizePeriodMonths = (
  subscriptionPeriodMonths: number | null | undefined
): number => {
  if (
    subscriptionPeriodMonths === null ||
    subscriptionPeriodMonths === undefined
  ) {
    return 1
  }
  const p = Math.floor(Number(subscriptionPeriodMonths))
  if (Number.isNaN(p) || p < 1) return 1
  return p
}

/**
 * Cuántos meses calendario cubre un único registro de pago desde su `paid_month`
 * (ancla), según monto y período de suscripción.
 */
export const coverageSpanMonthsFromPayment = (
  paymentAmount: number,
  unitPrice: number,
  subscriptionPeriodMonths: number | null | undefined
): number => {
  const period = normalizePeriodMonths(subscriptionPeriodMonths)
  const dollarMonths = fullMonthsCoveredByAmount(paymentAmount, unitPrice)

  let span: number
  if (dollarMonths >= 2) {
    span = dollarMonths
  } else if (period > 1) {
    span = period
  } else {
    span = 1
  }
  return Math.min(MAX_PAYMENT_MONTH_SPREAD, span)
}

/**
 * Monto mínimo por mes calendario: precio al cliente, o precio/período si cobran cada N meses.
 */
export const minimumAmountDueForCalendarMonth = (
  accountPrice: number | null | undefined,
  subscriptionPeriodMonths: number | null | undefined
): number | null => {
  if (accountPrice === null || accountPrice === undefined) return null
  const priceNum = Number(accountPrice)
  if (Number.isNaN(priceNum) || priceNum <= 0) return null

  const period = normalizePeriodMonths(subscriptionPeriodMonths)

  if (period <= 1) return roundMoney2(priceNum)
  return roundMoney2(priceNum / period)
}

/** Filas de finanzas / lista sin `paid_month`: mismo umbral que la tabla de suscripciones. */
export const isPaymentSlotAmountConfirmed = (
  amount: number | null | undefined,
  accountPrice: number | null | undefined,
  subscriptionPeriodMonths?: number | null
): boolean => {
  const amountNum =
    amount !== null && amount !== undefined ? Number(amount) : 0
  if (Number.isNaN(amountNum)) return false

  const threshold = minimumAmountDueForCalendarMonth(
    accountPrice,
    subscriptionPeriodMonths
  )
  if (threshold === null) return amountNum > 0
  return amountNum >= threshold - 1e-9
}

/** Monto del mes alcanza lo debido (o &gt; 0 si no hay precio). */
export const isPaymentAmountCompleteForMonth = (
  payment: PaymentRowLike,
  monthKey: string,
  accountPrice: number | null,
  subscriptionPeriodMonths?: number | null
): boolean => {
  if (!payment?.paid_month) return false
  if (monthKeyFromDateOnly(payment.paid_month) !== monthKey) {
    return false
  }

  const amountNum =
    payment.amount !== null && payment.amount !== undefined
      ? Number(payment.amount)
      : 0
  if (Number.isNaN(amountNum)) return false

  const threshold = minimumAmountDueForCalendarMonth(
    accountPrice,
    subscriptionPeriodMonths
  )
  if (threshold === null) return amountNum > 0

  return amountNum >= threshold - 1e-9
}

/** Pago ancla (monto ≥ precio mensual cuenta) que incluye `monthKey` en su ventana. */
export const findPaymentCoveringCalendarMonth = (
  payments: PaymentRowLike[],
  monthKey: string,
  accountPrice: number | null,
  subscriptionPeriodMonths?: number | null
): PaymentRowLike | null => {
  if (accountPrice === null || accountPrice === undefined) return null
  const priceNum = Number(accountPrice)
  if (Number.isNaN(priceNum) || priceNum <= 0) return null

  const period = normalizePeriodMonths(subscriptionPeriodMonths)

  for (const p of payments) {
    if (!p?.paid_month) continue
    const amt = p.amount !== null && p.amount !== undefined ? Number(p.amount) : 0
    if (Number.isNaN(amt) || amt < priceNum - 1e-9) continue

    const span = coverageSpanMonthsFromPayment(amt, priceNum, period)
    const keys = paidMonthCalendarMonthKeys(p.paid_month, span)
    if (keys.includes(monthKey)) return p
  }

  return null
}

/** Hay fila del mes que cumple umbral, o un pago ancla que cubre ese mes calendario. */
export const hasPaidCalendarMonthForSubscription = (
  payments: PaymentRowLike[],
  monthKey: string,
  accountPrice: number | null,
  subscriptionPeriodMonths?: number | null
): boolean => {
  const paymentThisMonth = payments.find((p) => {
    if (!p.paid_month) return false
    return monthKeyFromDateOnly(p.paid_month) === monthKey
  })

  if (
    paymentThisMonth &&
    isPaymentAmountCompleteForMonth(
      paymentThisMonth,
      monthKey,
      accountPrice,
      subscriptionPeriodMonths
    )
  ) {
    return true
  }

  return (
    findPaymentCoveringCalendarMonth(
      payments,
      monthKey,
      accountPrice,
      subscriptionPeriodMonths
    ) !== null
  )
}

/** Estado de comprobante para el mes (incluye cobertura por pago en mes ancla). */
export const subscriptionPaymentBadgeStatus = (
  payments: PaymentRowLike[],
  monthKey: string,
  accountPrice: number | null,
  subscriptionPeriodMonths?: number | null
): PaymentMonthBadgeStatus => {
  const paymentThisMonth = payments.find((p) => {
    if (!p.paid_month) return false
    return monthKeyFromDateOnly(p.paid_month) === monthKey
  })

  if (
    paymentThisMonth &&
    isPaymentAmountCompleteForMonth(
      paymentThisMonth,
      monthKey,
      accountPrice,
      subscriptionPeriodMonths
    )
  ) {
    return hasPaymentEvidence(paymentThisMonth) ? "CONFIRMADO" : "REGISTRADO"
  }

  const anchor = findPaymentCoveringCalendarMonth(
    payments,
    monthKey,
    accountPrice,
    subscriptionPeriodMonths
  )
  if (anchor) {
    return hasPaymentEvidence(anchor) ? "CONFIRMADO" : "REGISTRADO"
  }

  return "PENDIENTE"
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

/** Monto completo y además hay referencia o archivo de comprobante. */
export const isPaymentFullyConfirmedForMonth = (
  payment: PaymentRowLike,
  monthKey: string,
  accountPrice: number | null,
  subscriptionPeriodMonths?: number | null
): boolean =>
  isPaymentAmountCompleteForMonth(
    payment,
    monthKey,
    accountPrice,
    subscriptionPeriodMonths
  ) && hasPaymentEvidence(payment)

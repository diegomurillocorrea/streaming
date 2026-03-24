/**
 * Cuentas sin día de pago ni precio no pueden abrir la vista de suscripciones
 * (/administration/subscriptions/[id]).
 */
export function accountLacksPaymentDayAndPrice(acc: {
  payment_date?: string | null
  price?: number | null
}) {
  const noPaymentDay =
    !acc.payment_date || String(acc.payment_date).trim() === ""
  const noPrice = acc.price === null || acc.price === undefined
  return noPaymentDay && noPrice
}

export function canAccessAccountSubscriptionsPage(acc: {
  payment_date?: string | null
  price?: number | null
}) {
  return !accountLacksPaymentDayAndPrice(acc)
}

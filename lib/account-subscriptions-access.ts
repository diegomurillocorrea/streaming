/**
 * Cuentas sin día de pago ni precio no pueden abrir la vista de suscripciones
 * (/administration/subscriptions/[id]).
 */
export function accountLacksPaymentDayAndPrice(acc: {
  payment_date?: string | null
  account_price_by_client?: number | null
}) {
  const noPaymentDay =
    !acc.payment_date || String(acc.payment_date).trim() === ""
  const noPrice =
    acc.account_price_by_client === null ||
    acc.account_price_by_client === undefined
  return noPaymentDay && noPrice
}

export function canAccessAccountSubscriptionsPage(acc: {
  payment_date?: string | null
  account_price_by_client?: number | null
}) {
  return !accountLacksPaymentDayAndPrice(acc)
}

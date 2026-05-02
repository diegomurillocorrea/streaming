/** Máximo de meses consecutivos que se pueden registrar en un solo guardado. */
export const MAX_PAYMENT_MONTH_SPREAD = 24

export const roundMoney2 = (n: number): number =>
  Math.round(n * 100) / 100

/**
 * Cuántos meses completos cubre `totalAmount` si cada mes cuesta `unitPrice` (> 0).
 * Ej. $10 con precio $5 → 2. Con $9 → 1.
 */
export const fullMonthsCoveredByAmount = (
  totalAmount: number,
  unitPrice: number
): number => {
  if (
    unitPrice <= 0 ||
    totalAmount < unitPrice ||
    Number.isNaN(totalAmount) ||
    Number.isNaN(unitPrice)
  ) {
    return 0
  }
  return Math.min(
    MAX_PAYMENT_MONTH_SPREAD,
    Math.floor(totalAmount / unitPrice + 1e-9)
  )
}

/**
 * Monto del mes `sliceIndex` (0-based) al repartir `totalAmount` en `totalSlices` meses:
 * los primeros llevan `unitPrice`; el último lleva el resto (incluye propinas / centavos).
 */
export const paymentSliceAmount = (
  totalAmount: number,
  unitPrice: number,
  sliceIndex: number,
  totalSlices: number
): number => {
  if (sliceIndex < 0 || sliceIndex >= totalSlices || totalSlices < 1) return 0
  if (sliceIndex === totalSlices - 1) {
    return roundMoney2(totalAmount - unitPrice * (totalSlices - 1))
  }
  return roundMoney2(unitPrice)
}

/**
 * Reparte el efectivo total en partes iguales por mes (último mes absorbe redondeo).
 * Para cuando una cuota única cubre varios meses según `period_in_months`.
 */
export const splitTotalAcrossSlices = (
  totalAmount: number,
  sliceIndex: number,
  totalSlices: number
): number => {
  if (sliceIndex < 0 || sliceIndex >= totalSlices || totalSlices < 1) return 0
  const share = roundMoney2(totalAmount / totalSlices)
  if (sliceIndex === totalSlices - 1) {
    return roundMoney2(totalAmount - share * (totalSlices - 1))
  }
  return share
}

/**
 * Cuántos `paid_month` consecutivos crear/actualizar al guardar `totalAmount`.
 * - Si el monto cubre ≥ 2 veces el precio mensual → tantos meses como indique el dinero.
 * - Si no, pero `period ≥ 2` y el monto alcanza **una** cuota al precio mensual → `period` meses
 *   (un solo pago repartido; ej. período 2 y $3 con precio $3 → abril + mayo).
 */
export const spreadMonthsCount = (
  totalAmount: number,
  unitPrice: number,
  subscriptionPeriodMonths: number
): number => {
  const period =
    subscriptionPeriodMonths > 0 && !Number.isNaN(subscriptionPeriodMonths)
      ? Math.floor(subscriptionPeriodMonths)
      : 1

  const dollarMonths = fullMonthsCoveredByAmount(totalAmount, unitPrice)

  if (dollarMonths >= 2) {
    return dollarMonths
  }

  if (period >= 2 && totalAmount >= unitPrice && dollarMonths >= 1) {
    return Math.min(MAX_PAYMENT_MONTH_SPREAD, period)
  }

  return dollarMonths >= 1 ? 1 : 0
}

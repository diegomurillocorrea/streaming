export type SubscriptionPaymentBadgeStatus =
  | "CONFIRMADO"
  | "REGISTRADO"
  | "PENDIENTE"
  /** El período activo es anterior al mes calendario de `service_start_date`. */
  | "NO_APLICA"

export type SubscriptionTableRow = {
  id_subscription: number
  /** Para enlazar a Clientes y abrir el modal de edición */
  id_client: number | null
  user: string
  pin: string
  firstName: string
  lastName: string
  email: string
  phone: string
  serviceStartRaw: string | null
  /** Meses restantes de cobertura (o valor a registrar si no hay cobertura). */
  periodInMonths: number | null
  /** months_covered del pago efectivo (ancla). */
  monthsCovered: number | null
  remainingMonths: number
  /** True si el mes activo está cubierto por un pago anclado en otro mes. */
  coveredByPriorMonth: boolean
  monthsPaid: number
  lastPaidMonth: string | null
  lastPaymentDate: string | null
  lastPaymentAmount: number | null
  lastPaymentBank: string | null
  lastPaymentBankId: number | null
  lastPaymentId: number | null
  lastPaymentReference: string | null
  lastPaymentReceiptPath: string | null
  /** `subscriptions.created_at` — mes en que el cliente se vinculó a la cuenta */
  subscriptionCreatedAt: string | null
  status: SubscriptionPaymentBadgeStatus
}

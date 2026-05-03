import type {
  SubscriptionPaymentBadgeStatus,
  SubscriptionTableRow,
} from "@/components/admin/account-subscriptions-table"
import {
  findPaymentCoveringCalendarMonth,
  subscriptionPaymentBadgeStatus,
} from "@/lib/payment-confirmation"
import {
  monthKeyFromDateOnly,
  subscriptionDebtAppliesToCalendarMonthKey,
} from "@/lib/subscription-dates"

export type SubscriptionPaymentPayload = {
  id_payment?: number
  id_bank_account?: number | null
  amount?: number | null
  payment_date?: string | null
  paid_month?: string | null
  payment_reference?: string | null
  receipt_storage_path?: string | null
  bank_accounts?: unknown
}

export type SubscriptionPayloadClient = {
  name?: string | null
  lastName?: string | null
  email?: string | null
  phoneNumber?: string | null
}

export type SubscriptionPayloadRow = {
  id_subscription: number
  id_client?: number | null
  user?: string | null
  pin?: string | null
  service_start_date?: string | null
  period_in_months?: number | null
  /** Alta de la fila en BD = mes en que se agregó el cliente a la cuenta */
  created_at?: string | null
  clients?: SubscriptionPayloadClient | SubscriptionPayloadClient[] | null
  payments?: SubscriptionPaymentPayload[] | null
}

const pickNested = <T,>(value: T | T[] | null | undefined): T | null => {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export const buildSubscriptionTableRows = (
  list: SubscriptionPayloadRow[],
  selectedMonthKey: string,
  accountPrice: number | null
): {
  rows: SubscriptionTableRow[]
  confirmedCount: number
  registeredCount: number
  pendingCount: number
} => {
  const rows: SubscriptionTableRow[] = list.map((sub) => {
    const payments = sub.payments || []
    const client = pickNested(sub.clients)

    const monthsPaid = payments.length

    const sortedPayments = [...payments].sort(
      (a, b) =>
        new Date(String(b.paid_month ?? 0)).getTime() -
        new Date(String(a.paid_month ?? 0)).getTime()
    )
    const lastPayment = sortedPayments[0]

    const paymentThisMonth = payments.find((p) => {
      if (!p.paid_month) return false
      return monthKeyFromDateOnly(p.paid_month) === selectedMonthKey
    })

    const paymentForEdit = paymentThisMonth ?? null

    const coveringPayment =
      paymentForEdit != null
        ? null
        : findPaymentCoveringCalendarMonth(
            payments,
            selectedMonthKey,
            accountPrice,
            sub.period_in_months
          )

    const effectivePaymentRow = paymentForEdit ?? coveringPayment

    /** Último pago (por mes) que ya tiene cuenta/banco — mismo método mes a mes hasta que se cambie y guarde. */
    const latestPaymentWithBank = sortedPayments.find((p) => {
      const id = p.id_bank_account
      return id != null && id !== undefined && !Number.isNaN(Number(id))
    })

    const bankSourcePayment =
      paymentThisMonth?.id_bank_account != null
        ? paymentThisMonth
        : coveringPayment?.id_bank_account != null
          ? coveringPayment
          : latestPaymentWithBank ?? null

    const lastPaymentBankData: unknown = bankSourcePayment?.bank_accounts

    let lastPaymentAmount: number | null = null
    if (paymentForEdit) {
      const raw = paymentForEdit.amount
      if (raw !== null && raw !== undefined) {
        const n = Number(raw)
        if (!Number.isNaN(n)) lastPaymentAmount = n
      }
    } else if (coveringPayment) {
      const raw = coveringPayment.amount
      if (raw !== null && raw !== undefined) {
        const n = Number(raw)
        if (!Number.isNaN(n)) lastPaymentAmount = n
      }
    }

    const status: SubscriptionPaymentBadgeStatus =
      !subscriptionDebtAppliesToCalendarMonthKey(
        sub.service_start_date,
        selectedMonthKey
      )
        ? "NO_APLICA"
        : subscriptionPaymentBadgeStatus(
            payments,
            selectedMonthKey,
            accountPrice,
            sub.period_in_months
          )

    return {
      id_subscription: sub.id_subscription,
      id_client:
        typeof sub.id_client === "number" && !Number.isNaN(sub.id_client)
          ? sub.id_client
          : null,
      user: sub.user ?? "",
      pin: sub.pin ?? "",
      firstName: client?.name ?? "",
      lastName: client?.lastName ?? "",
      email: client?.email ?? "-",
      phone: client?.phoneNumber ?? "-",
      serviceStartRaw: sub.service_start_date ?? null,
      periodInMonths: sub.period_in_months ?? null,
      monthsPaid,
      lastPaidMonth: lastPayment?.paid_month ?? null,
      lastPaymentDate:
        effectivePaymentRow?.payment_date ?? lastPayment?.payment_date ?? null,
      lastPaymentAmount,
      lastPaymentBank: Array.isArray(lastPaymentBankData)
        ? lastPaymentBankData[0]?.bank_name ?? null
        : (lastPaymentBankData as { bank_name?: string } | null)?.bank_name ??
          null,
      lastPaymentBankId: bankSourcePayment?.id_bank_account ?? null,
      lastPaymentId: effectivePaymentRow?.id_payment ?? null,
      lastPaymentReference: effectivePaymentRow?.payment_reference ?? null,
      lastPaymentReceiptPath: effectivePaymentRow?.receipt_storage_path ?? null,
      subscriptionCreatedAt:
        sub.created_at != null && sub.created_at !== undefined
          ? String(sub.created_at)
          : null,
      status,
    }
  })

  const confirmedCount = rows.filter((r) => r.status === "CONFIRMADO").length
  const registeredCount = rows.filter((r) => r.status === "REGISTRADO").length
  const pendingCount = rows.filter((r) => r.status === "PENDIENTE").length

  return { rows, confirmedCount, registeredCount, pendingCount }
}

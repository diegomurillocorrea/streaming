"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { SubscriptionTableRow } from "@/components/admin/account-subscriptions-table"
import { firstDayOfCurrentMonthLocal } from "@/lib/subscription-dates"
import { DeleteSubscriptionButton } from "./DeleteSubscriptionButton"

const BANK_NONE = "__none__"

function formatDisplayDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d)
}

function calcNextPaymentDate(serviceStart: string, periodStr: string) {
  if (!serviceStart) return ""
  const months = Number(periodStr)
  if (!months || Number.isNaN(months)) return ""

  const d = new Date(serviceStart)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

type BankAccountOption = {
  id_bank_account: number
  bank_name: string
}

type SubscriptionRowProps = {
  index: number
  row: SubscriptionTableRow
  bankAccounts: BankAccountOption[]
  accountPrice: number | null
  showPinColumn?: boolean
}

export function SubscriptionRow({
  index,
  row,
  bankAccounts,
  accountPrice,
  showPinColumn = true,
}: SubscriptionRowProps) {
  const supabase = createBrowserClient()
  const router = useRouter()

  const [userValue, setUserValue] = useState(row.user || "")
  const [pin, setPin] = useState(row.pin || "")
  const [serviceStart, setServiceStart] = useState(row.serviceStartRaw || "")
  const [period, setPeriod] = useState(
    row.periodInMonths != null ? String(row.periodInMonths) : "1"
  )
  const [bankAccountId, setBankAccountId] = useState(
    row.lastPaymentBankId ? String(row.lastPaymentBankId) : ""
  )
  const [paymentAmount, setPaymentAmount] = useState(
    row.lastPaymentAmount != null ? String(row.lastPaymentAmount) : ""
  )

  const [savingSubscription, setSavingSubscription] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setUserValue(row.user || "")
  }, [row.user])

  useEffect(() => {
    setPin(row.pin || "")
  }, [row.pin])

  useEffect(() => {
    setServiceStart(row.serviceStartRaw || "")
  }, [row.serviceStartRaw])

  useEffect(() => {
    setPeriod(
      row.periodInMonths != null ? String(row.periodInMonths) : "1"
    )
  }, [row.periodInMonths])

  useEffect(() => {
    setBankAccountId(
      row.lastPaymentBankId ? String(row.lastPaymentBankId) : ""
    )
  }, [row.lastPaymentBankId])

  useEffect(() => {
    setPaymentAmount(
      row.lastPaymentAmount != null ? String(row.lastPaymentAmount) : ""
    )
  }, [row.lastPaymentAmount])

  const nextPaymentDate = useMemo(
    () => calcNextPaymentDate(serviceStart, period),
    [serviceStart, period]
  )

  const nextPaymentDisplay = useMemo(
    () => (nextPaymentDate ? formatDisplayDate(nextPaymentDate) : "-"),
    [nextPaymentDate]
  )

  const isPaid = useMemo(() => {
    const amountNum =
      paymentAmount !== "" && paymentAmount != null
        ? Number(paymentAmount)
        : row.lastPaymentAmount != null
          ? Number(row.lastPaymentAmount)
          : 0

    if (Number.isNaN(amountNum)) return false

    const priceNum =
      accountPrice !== null && accountPrice !== undefined
        ? Number(accountPrice)
        : null

    if (priceNum === null || Number.isNaN(priceNum) || priceNum <= 0) {
      return amountNum > 0
    }

    return amountNum >= priceNum
  }, [accountPrice, paymentAmount, row.lastPaymentAmount])

  const paymentStatusLabel = isPaid ? "PAGADO" : "PENDIENTE"

  const persistSubscription = async (): Promise<boolean> => {
    setSavingSubscription(true)
    setFeedback(null)
    try {
      const updates: Record<string, string | number | null> = {
        user: userValue || null,
        service_start_date: serviceStart || null,
      }

      if (showPinColumn) {
        updates.pin = pin || null
      }

      const periodNum = Number(period)
      updates.period_in_months =
        Number.isNaN(periodNum) || periodNum <= 0 ? null : periodNum

      const { error } = await supabase
        .from("subscriptions")
        .update(updates)
        .eq("id_subscription", row.id_subscription)

      if (error) {
        console.error("update subscription error", error)
        setFeedback(error.message || "No se pudo guardar la suscripción")
        return false
      }

      setFeedback(null)
      router.refresh()
      return true
    } finally {
      setSavingSubscription(false)
    }
  }

  const persistPayment = async (
    override: { paymentAmount?: string; bankAccountId?: string } = {}
  ): Promise<boolean> => {
    const effectiveAmount =
      override.paymentAmount !== undefined
        ? override.paymentAmount
        : paymentAmount

    const effectiveBankRaw =
      override.bankAccountId !== undefined
        ? override.bankAccountId
        : bankAccountId

    const hasAmount =
      effectiveAmount !== "" &&
      effectiveAmount !== null &&
      effectiveAmount !== undefined

    const hasBank =
      effectiveBankRaw !== "" &&
      effectiveBankRaw !== null &&
      effectiveBankRaw !== undefined

    const parsedAmount = hasAmount ? Number(effectiveAmount) : 0
    const amountNum = Number.isNaN(parsedAmount) ? 0 : parsedAmount
    const bankIdNum = hasBank ? Number(effectiveBankRaw) : null

    if (!row.lastPaymentId && !hasAmount && !hasBank) {
      return true
    }

    setSavingPayment(true)
    setFeedback(null)
    try {
      const paidMonth = firstDayOfCurrentMonthLocal()
      const now = new Date()

      let paymentIdToUpdate = row.lastPaymentId

      if (!paymentIdToUpdate) {
        const { data: existingRow, error: lookupError } = await supabase
          .from("payments")
          .select("id_payment")
          .eq("id_subscription", row.id_subscription)
          .eq("paid_month", paidMonth)
          .maybeSingle()

        if (lookupError) {
          console.error("payments lookup error", lookupError)
          setFeedback(lookupError.message || "No se pudo comprobar el pago del mes")
          return false
        }

        if (existingRow?.id_payment) {
          paymentIdToUpdate = existingRow.id_payment
        }
      }

      const updatePayload: {
        amount: number
        id_bank_account: number | null
      } = {
        amount: amountNum,
        id_bank_account: bankIdNum,
      }

      if (paymentIdToUpdate) {
        const { error } = await supabase
          .from("payments")
          .update(updatePayload)
          .eq("id_payment", paymentIdToUpdate)

        if (error) {
          console.error("update payment error", error)
          setFeedback(error.message || "No se pudo guardar el pago")
          return false
        }

        router.refresh()
        return true
      }

      const insertData: {
        id_subscription: number
        amount: number
        payment_date: string
        paid_month: string
        id_bank_account?: number | null
      } = {
        id_subscription: row.id_subscription,
        amount: amountNum,
        payment_date: now.toISOString(),
        paid_month: paidMonth,
      }

      if (bankIdNum !== null) {
        insertData.id_bank_account = bankIdNum
      }

      const { error: insertError } = await supabase
        .from("payments")
        .insert(insertData)

      if (insertError?.code === "23505") {
        const { data: conflictRow } = await supabase
          .from("payments")
          .select("id_payment")
          .eq("id_subscription", row.id_subscription)
          .eq("paid_month", paidMonth)
          .maybeSingle()

        if (conflictRow?.id_payment) {
          const { error: retryError } = await supabase
            .from("payments")
            .update(updatePayload)
            .eq("id_payment", conflictRow.id_payment)

          if (retryError) {
            console.error("update payment after duplicate", retryError)
            setFeedback(retryError.message || "No se pudo guardar el pago")
            return false
          }

          router.refresh()
          return true
        }

        console.error("insert payment error", insertError)
        setFeedback(
          insertError.message || "No se pudo registrar el pago (duplicado)"
        )
        return false
      }

      if (insertError) {
        console.error("insert payment error", insertError)
        setFeedback(insertError.message || "No se pudo registrar el pago")
        return false
      }

      router.refresh()
      return true
    } finally {
      setSavingPayment(false)
    }
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d{0,4}$/.test(value)) {
      setPin(value)
    }
  }

  const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === "") {
      setPeriod("")
      return
    }
    const num = Number(value)
    if (!Number.isNaN(num) && num >= 1) {
      setPeriod(value)
    }
  }

  const handleBankChange = async (value: string) => {
    const next = value === BANK_NONE ? "" : value
    setBankAccountId(next)
    await persistPayment({ bankAccountId: next })
  }

  const handlePaymentBlur = async (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    await persistPayment({ paymentAmount: e.target.value })
  }

  const handleSubscriptionBlur = async () => {
    await persistSubscription()
  }

  const bankSelectValue = bankAccountId || BANK_NONE

  const isBusy = savingSubscription || savingPayment

  const clientEditHref =
    row.id_client != null
      ? `/administration/clients?edit=${row.id_client}`
      : null

  const clientEditLabel =
    `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Cliente"

  return (
    <tr className="border-b border-zinc-100 text-zinc-900 last:border-b-0 dark:border-emerald-900/60 dark:text-emerald-50">
      <td className="w-8 min-w-8 max-w-8 px-2 py-3.5 align-top text-center text-xs tabular-nums">
        {index + 1}
      </td>

      <td className="w-[6rem] min-w-[6rem] max-w-[6rem] px-1.5 py-3.5 align-top text-xs">
        {clientEditHref ? (
          <Link
            href={clientEditHref}
            className="block min-w-0 truncate font-medium text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-emerald-200"
            title={row.firstName || undefined}
            aria-label={`Abrir edición de cliente: ${clientEditLabel} (nombre)`}
          >
            {row.firstName || "-"}
          </Link>
        ) : (
          <span
            className="block min-w-0 truncate font-medium"
            title={row.firstName || undefined}
          >
            {row.firstName || "-"}
          </span>
        )}
      </td>

      <td className="w-[6rem] min-w-[6rem] max-w-[6rem] px-1.5 py-3.5 align-top text-xs">
        {clientEditHref ? (
          <Link
            href={clientEditHref}
            className="block min-w-0 truncate text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-emerald-200"
            title={row.lastName || undefined}
            aria-label={`Abrir edición de cliente: ${clientEditLabel} (apellido)`}
          >
            {row.lastName || "-"}
          </Link>
        ) : (
          <span
            className="block min-w-0 truncate"
            title={row.lastName || undefined}
          >
            {row.lastName || "-"}
          </span>
        )}
      </td>

      <td className="w-[6.5rem] min-w-[6.5rem] max-w-[6.5rem] px-2 py-3.5 align-top">
        <Input
          type="text"
          value={userValue}
          onChange={(e) => setUserValue(e.target.value)}
          onBlur={handleSubscriptionBlur}
          disabled={isBusy}
          className="h-8 w-full min-w-0 max-w-[6rem] border-zinc-200 bg-white text-xs text-zinc-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-50"
          placeholder="Usuario"
          aria-label="Usuario de la plataforma"
        />
      </td>

      {showPinColumn && (
        <td className="py-3.5 px-4 align-top">
          <Input
            type="text"
            inputMode="numeric"
            value={pin}
            onChange={handlePinChange}
            onBlur={handleSubscriptionBlur}
            disabled={isBusy}
            maxLength={4}
            className="h-8 w-20 border-zinc-200 bg-white text-center text-xs text-zinc-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-50"
            placeholder="PIN"
            aria-label="PIN (hasta 4 dígitos)"
          />
        </td>
      )}

      <td className="py-3.5 px-4 align-top text-xs">{row.phone || "-"}</td>

      <td className="py-3.5 px-4 align-top">
        <Input
          type="date"
          value={serviceStart || ""}
          onChange={(e) => setServiceStart(e.target.value)}
          onBlur={handleSubscriptionBlur}
          disabled={isBusy}
          className="h-8 border-zinc-200 bg-white text-xs text-zinc-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-50"
          aria-label="Fecha de inicio de servicio"
        />
      </td>

      <td className="py-3.5 px-4 align-top text-center">
        <Input
          type="number"
          min={1}
          value={period}
          onChange={handlePeriodChange}
          onBlur={handleSubscriptionBlur}
          disabled={isBusy}
          className="mx-auto h-8 w-20 border-zinc-200 bg-white text-center text-xs text-zinc-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-50"
          aria-label="Período en meses"
        />
      </td>

      <td className="py-3.5 px-4 align-top text-xs">{nextPaymentDisplay}</td>

      <td className="py-3.5 px-4 align-top">
        <Select
          value={bankSelectValue}
          onValueChange={handleBankChange}
          disabled={isBusy}
        >
          <SelectTrigger
            className="h-8 border-zinc-200 bg-white text-xs text-zinc-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-50"
            aria-label="Cuenta bancaria del pago del mes"
          >
            <SelectValue placeholder="Seleccionar banco" />
          </SelectTrigger>
          <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-50">
            <SelectItem value={BANK_NONE} className="text-zinc-900 dark:text-emerald-50">
              Sin banco
            </SelectItem>
            {bankAccounts.map((bank) => (
              <SelectItem
                key={bank.id_bank_account}
                value={String(bank.id_bank_account)}
                className="text-zinc-900 dark:text-emerald-50"
              >
                {bank.bank_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      <td className="w-[7.5rem] min-w-[7.5rem] max-w-[7.5rem] px-2 py-3.5 align-top">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-0.5">
            <span className="shrink-0 text-xs text-zinc-700 dark:text-emerald-50">$</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              onBlur={handlePaymentBlur}
              disabled={isBusy}
              className="h-8 min-w-0 w-full max-w-[6.5rem] flex-1 border-zinc-200 bg-white text-xs text-zinc-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-50"
              aria-label="Monto del pago del mes"
            />
          </div>
          {feedback && (
            <span className="text-[11px] text-red-600 dark:text-red-400" role="alert">
              {feedback}
            </span>
          )}
        </div>
      </td>

      <td className="py-3.5 px-4 align-top text-center">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
            isPaid
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-50"
              : "bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-50"
          }`}
        >
          {paymentStatusLabel}
        </span>
      </td>

      <td className="py-3.5 px-4 align-top text-center">
        <DeleteSubscriptionButton subscriptionId={row.id_subscription} />
      </td>
    </tr>
  )
}

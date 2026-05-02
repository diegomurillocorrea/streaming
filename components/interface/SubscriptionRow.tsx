"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { SubscriptionTableRow } from "@/components/admin/account-subscriptions-table"
import {
  buildReceiptStoragePath,
  isReceiptMimeAllowed,
  PAYMENT_RECEIPTS_BUCKET,
  PAYMENT_RECEIPT_MAX_BYTES,
} from "@/lib/payment-evidence"
import {
  fullMonthsCoveredByAmount,
  paymentSliceAmount,
  roundMoney2,
  spreadMonthsCount,
  splitTotalAcrossSlices,
} from "@/lib/multi-month-payment"
import { addCalendarMonthsFirstDay } from "@/lib/subscription-dates"
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
  accountId: number
  /** Primer día del mes del período activo (`YYYY-MM-01`) para `paid_month`. */
  paidMonthFirstDay: string
  row: SubscriptionTableRow
  bankAccounts: BankAccountOption[]
  accountPrice: number | null
  showPinColumn?: boolean
}

export function SubscriptionRow({
  index,
  accountId,
  paidMonthFirstDay,
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
  const [paymentReference, setPaymentReference] = useState(
    row.lastPaymentReference?.trim() ?? ""
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

  useEffect(() => {
    setPaymentReference(row.lastPaymentReference?.trim() ?? "")
  }, [row.lastPaymentReference])

  const nextPaymentDate = useMemo(
    () => calcNextPaymentDate(serviceStart, period),
    [serviceStart, period]
  )

  const nextPaymentDisplay = useMemo(
    () => (nextPaymentDate ? formatDisplayDate(nextPaymentDate) : "-"),
    [nextPaymentDate]
  )

  /** Misma lógica que la tabla (incluye mes cubierto por pago ancla en otro mes). */
  const displayPaymentStatus = useMemo(() => {
    switch (row.status) {
      case "CONFIRMADO":
        return { kind: "CONFIRMADO" as const, label: "CONFIRMADO" }
      case "REGISTRADO":
        return { kind: "REGISTRADO" as const, label: "Sin comprobante" }
      default:
        return { kind: "PENDIENTE" as const, label: "PENDIENTE" }
    }
  }, [row.status])

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
    override: {
      paymentAmount?: string
      bankAccountId?: string
      paymentReference?: string
    } = {}
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

    const effectiveRef =
      override.paymentReference !== undefined
        ? override.paymentReference
        : paymentReference
    const refTrimmed = effectiveRef.trim()
    const paymentRefDb = refTrimmed === "" ? null : refTrimmed

    if (!row.lastPaymentId && !hasAmount && !hasBank) {
      return true
    }

    setSavingPayment(true)
    setFeedback(null)
    try {
      const paidMonth = paidMonthFirstDay
      const now = new Date()

      const priceNum =
        accountPrice !== null &&
        accountPrice !== undefined &&
        !Number.isNaN(Number(accountPrice))
          ? Number(accountPrice)
          : null

      const periodP =
        row.periodInMonths != null &&
        row.periodInMonths > 0 &&
        !Number.isNaN(Number(row.periodInMonths))
          ? Math.floor(Number(row.periodInMonths))
          : 1

      const coveredMonths =
        priceNum !== null && priceNum > 0 && hasAmount && amountNum > 0
          ? spreadMonthsCount(amountNum, priceNum, periodP)
          : 0

      const spreadAcrossMonths = coveredMonths >= 2

      const dollarMonths =
        priceNum !== null && priceNum > 0
          ? fullMonthsCoveredByAmount(amountNum, priceNum)
          : 0
      const priceWeightedSlices = dollarMonths >= 2

      const upsertSinglePaidMonth = async (
        paidMonthIso: string,
        sliceAmount: number
      ): Promise<boolean> => {
        const amtRounded = roundMoney2(sliceAmount)
        const updatePayload: {
          amount: number
          id_bank_account: number | null
          payment_reference: string | null
        } = {
          amount: amtRounded,
          id_bank_account: bankIdNum,
          payment_reference: paymentRefDb,
        }

        const { data: existingRow, error: lookupError } = await supabase
          .from("payments")
          .select("id_payment")
          .eq("id_subscription", row.id_subscription)
          .eq("paid_month", paidMonthIso)
          .maybeSingle()

        if (lookupError) {
          console.error("payments lookup error", lookupError)
          setFeedback(
            lookupError.message || "No se pudo comprobar el pago del mes"
          )
          return false
        }

        if (existingRow?.id_payment) {
          const { error } = await supabase
            .from("payments")
            .update(updatePayload)
            .eq("id_payment", existingRow.id_payment)

          if (error) {
            console.error("update payment error", error)
            setFeedback(error.message || "No se pudo guardar el pago")
            return false
          }
          return true
        }

        const insertData: {
          id_subscription: number
          amount: number
          payment_date: string
          paid_month: string
          id_bank_account?: number | null
          payment_reference?: string | null
        } = {
          id_subscription: row.id_subscription,
          amount: amtRounded,
          payment_date: now.toISOString(),
          paid_month: paidMonthIso,
          payment_reference: paymentRefDb,
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
            .eq("paid_month", paidMonthIso)
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

        return true
      }

      if (spreadAcrossMonths && priceNum !== null) {
        for (let i = 0; i < coveredMonths; i++) {
          const paidMonthIso = addCalendarMonthsFirstDay(paidMonth, i)
          const sliceAmt = priceWeightedSlices
            ? paymentSliceAmount(amountNum, priceNum, i, coveredMonths)
            : splitTotalAcrossSlices(amountNum, i, coveredMonths)
          const ok = await upsertSinglePaidMonth(paidMonthIso, sliceAmt)
          if (!ok) return false
        }
        router.refresh()
        return true
      }

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
        payment_reference: string | null
      } = {
        amount: roundMoney2(amountNum),
        id_bank_account: bankIdNum,
        payment_reference: paymentRefDb,
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
        payment_reference?: string | null
      } = {
        id_subscription: row.id_subscription,
        amount: roundMoney2(amountNum),
        payment_date: now.toISOString(),
        paid_month: paidMonth,
        payment_reference: paymentRefDb,
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

  const handleReferenceBlur = async () => {
    const hasAnyPaymentHint =
      Boolean(row.lastPaymentId) ||
      (paymentAmount.trim() !== "" && !Number.isNaN(Number(paymentAmount))) ||
      (bankAccountId !== "" && bankAccountId !== BANK_NONE)
    if (!hasAnyPaymentHint) return
    await persistPayment({ paymentReference })
  }

  const handleViewReceipt = async () => {
    const path = row.lastPaymentReceiptPath?.trim()
    if (!path) return
    setFeedback(null)
    const { data, error } = await supabase.storage
      .from(PAYMENT_RECEIPTS_BUCKET)
      .createSignedUrl(path, 3600)
    if (error || !data?.signedUrl) {
      setFeedback(
        error?.message ??
          "No se pudo abrir el comprobante. Revisa permisos del bucket en Supabase."
      )
      return
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  const handleRemoveReceipt = async () => {
    const path = row.lastPaymentReceiptPath?.trim()
    if (!path || !row.lastPaymentId) return
    setSavingPayment(true)
    setFeedback(null)
    try {
      const { error: rmErr } = await supabase.storage
        .from(PAYMENT_RECEIPTS_BUCKET)
        .remove([path])
      if (rmErr) {
        console.error("remove receipt", rmErr)
        setFeedback(rmErr.message || "No se pudo eliminar el archivo")
        return
      }
      const { error: dbErr } = await supabase
        .from("payments")
        .update({ receipt_storage_path: null })
        .eq("id_payment", row.lastPaymentId)
      if (dbErr) {
        console.error("clear receipt path", dbErr)
        setFeedback(dbErr.message || "No se pudo actualizar el pago")
        return
      }
      router.refresh()
    } finally {
      setSavingPayment(false)
    }
  }

  const handleReceiptFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!row.lastPaymentId) {
      setFeedback(
        "Primero guarda el monto del mes (tabla de arriba) para crear el registro de pago."
      )
      return
    }
    if (file.size > PAYMENT_RECEIPT_MAX_BYTES) {
      setFeedback("El archivo supera 5 MB.")
      return
    }
    if (!isReceiptMimeAllowed(file.type)) {
      setFeedback("Formato no permitido. Usa JPEG, PNG, WebP o PDF.")
      return
    }
    setSavingPayment(true)
    setFeedback(null)
    try {
      const path = buildReceiptStoragePath({
        accountId,
        paymentId: row.lastPaymentId,
        fileName: file.name,
      })
      const oldPath = row.lastPaymentReceiptPath?.trim()
      const { error: upErr } = await supabase.storage
        .from(PAYMENT_RECEIPTS_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        })
      if (upErr) {
        console.error("upload receipt", upErr)
        setFeedback(upErr.message || "No se pudo subir el comprobante")
        return
      }
      if (oldPath && oldPath !== path) {
        const { error: rmOld } = await supabase.storage
          .from(PAYMENT_RECEIPTS_BUCKET)
          .remove([oldPath])
        if (rmOld) {
          console.warn("remove old receipt", rmOld)
        }
      }
      const { error: dbErr } = await supabase
        .from("payments")
        .update({ receipt_storage_path: path })
        .eq("id_payment", row.lastPaymentId)
      if (dbErr) {
        console.error("save receipt path", dbErr)
        setFeedback(dbErr.message || "No se pudo guardar la ruta del archivo")
        await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).remove([path])
        return
      }
      router.refresh()
    } finally {
      setSavingPayment(false)
    }
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
          {accountPrice !== null &&
          accountPrice !== undefined &&
          !Number.isNaN(Number(accountPrice)) &&
          Number(accountPrice) > 0 ? (
            <p className="max-w-[9rem] text-[10px] leading-snug text-zinc-500 dark:text-emerald-400">
              Con <span className="font-medium">período &gt; 1</span>, un pago al
              precio mensual reparte ese monto en tantos meses consecutivos como el
              período. Si pagas 2× el precio (o más), se reparten meses según el
              dinero.
            </p>
          ) : null}
          {feedback && (
            <span className="text-[11px] text-red-600 dark:text-red-400" role="alert">
              {feedback}
            </span>
          )}
        </div>
      </td>

      <td className="min-w-[10rem] max-w-[14rem] px-2 py-3.5 align-top">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <Label
              htmlFor={`pay-ref-${row.id_subscription}`}
              className="text-[10px] font-medium text-zinc-500 dark:text-emerald-400"
            >
              Ref. transferencia
            </Label>
            <Input
              id={`pay-ref-${row.id_subscription}`}
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              onBlur={handleReferenceBlur}
              disabled={isBusy}
              placeholder="Ej. folio, depósito"
              className="h-8 border-zinc-200 bg-white text-xs text-zinc-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-50"
              aria-label="Referencia o nota del comprobante de pago"
            />
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="block w-full max-w-full text-[10px] text-zinc-600 file:mr-1 file:rounded-md file:border-0 file:bg-emerald-600 file:px-2 file:py-1 file:text-[10px] file:font-medium file:text-white hover:file:bg-emerald-700 dark:text-emerald-200 dark:file:bg-emerald-700"
              disabled={isBusy}
              onChange={handleReceiptFileChange}
              aria-label="Subir imagen o PDF del comprobante"
            />
            <div className="flex flex-wrap gap-1">
              {row.lastPaymentReceiptPath?.trim() ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 border-emerald-300 px-2 text-[10px] text-emerald-800 dark:border-emerald-700 dark:text-emerald-200"
                    disabled={isBusy}
                    onClick={() => void handleViewReceipt()}
                  >
                    Ver archivo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-zinc-500 hover:text-red-600 dark:text-emerald-400"
                    disabled={isBusy}
                    onClick={() => void handleRemoveReceipt()}
                  >
                    Quitar
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-4 align-top text-center">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
            displayPaymentStatus.kind === "CONFIRMADO"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-50"
              : displayPaymentStatus.kind === "REGISTRADO"
                ? "bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100"
                : "bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-50"
          }`}
        >
          {displayPaymentStatus.label}
        </span>
      </td>

      <td className="py-3.5 px-4 align-top text-center">
        <DeleteSubscriptionButton subscriptionId={row.id_subscription} />
      </td>
    </tr>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import type { SubscriptionTableRow } from "@/components/admin/subscription-table-types"
import { roundMoney2 } from "@/lib/multi-month-payment"
import {
  remainingCoveredMonths,
  normalizeMonthsCovered,
} from "@/lib/payment-confirmation"
import {
  PAYMENT_RECEIPT_MAX_BYTES,
  PAYMENT_RECEIPTS_BUCKET,
  buildReceiptStoragePath,
  isReceiptMimeAllowed,
} from "@/lib/payment-evidence"
import {
  formatSpanishDayMonthYearFromIso,
  monthKeyFromDateOnly,
  ymdFromIsoDate,
} from "@/lib/subscription-dates"
import { DeleteSubscriptionButton } from "./DeleteSubscriptionButton"

const BANK_NONE = "__none__"

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
  /** Layout en tarjeta (lista) vs celda de tabla legacy. */
  layout?: "card" | "table"
}

export function SubscriptionRow({
  index,
  accountId,
  paidMonthFirstDay,
  row,
  bankAccounts,
  accountPrice,
  showPinColumn = true,
  layout = "card",
}: SubscriptionRowProps) {
  const supabase = createBrowserClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userValue, setUserValue] = useState(row.user || "")
  const [pin, setPin] = useState(row.pin || "")
  const [serviceStart, setServiceStart] = useState(
    ymdFromIsoDate(row.serviceStartRaw) || ""
  )
  const [period, setPeriod] = useState(
    row.periodInMonths != null ? String(row.periodInMonths) : "1"
  )
  const [bankAccountId, setBankAccountId] = useState(
    row.lastPaymentBankId ? String(row.lastPaymentBankId) : ""
  )
  const [paymentAmount, setPaymentAmount] = useState(
    row.lastPaymentAmount != null ? String(row.lastPaymentAmount) : ""
  )
  const [paymentDate, setPaymentDate] = useState(
    ymdFromIsoDate(row.lastPaymentDate) || ""
  )
  const [receiptPath, setReceiptPath] = useState(
    row.lastPaymentReceiptPath?.trim() || ""
  )
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    null
  )

  const [savingSubscription, setSavingSubscription] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setUserValue(row.user || "")
  }, [row.user])

  useEffect(() => {
    setPin(row.pin || "")
  }, [row.pin])

  useEffect(() => {
    setServiceStart(ymdFromIsoDate(row.serviceStartRaw) || "")
  }, [row.serviceStartRaw])

  useEffect(() => {
    setPeriod(row.periodInMonths != null ? String(row.periodInMonths) : "1")
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
    setPaymentDate(ymdFromIsoDate(row.lastPaymentDate) || "")
  }, [row.lastPaymentDate])

  useEffect(() => {
    setReceiptPath(row.lastPaymentReceiptPath?.trim() || "")
  }, [row.lastPaymentReceiptPath])

  useEffect(() => {
    let cancelled = false
    const loadPreview = async () => {
      if (!receiptPath) {
        setReceiptPreviewUrl(null)
        return
      }
      const { data, error } = await supabase.storage
        .from(PAYMENT_RECEIPTS_BUCKET)
        .createSignedUrl(receiptPath, 3600)
      if (cancelled) return
      if (error || !data?.signedUrl) {
        setReceiptPreviewUrl(null)
        return
      }
      setReceiptPreviewUrl(data.signedUrl)
    }
    void loadPreview()
    return () => {
      cancelled = true
    }
  }, [receiptPath, supabase])

  const clientFullName = useMemo(
    () => `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "—",
    [row.firstName, row.lastName]
  )

  const displayPaymentStatus = useMemo(() => {
    switch (row.status) {
      case "CONFIRMADO":
        return { kind: "CONFIRMADO" as const, label: "CONFIRMADO" }
      case "REGISTRADO":
        return { kind: "REGISTRADO" as const, label: "Sin comprobante" }
      case "NO_APLICA":
        return { kind: "NO_APLICA" as const, label: "Antes del inicio" }
      default:
        return { kind: "PENDIENTE" as const, label: "PENDIENTE" }
    }
  }, [row.status])

  const isPaymentMonthNotApplicable = row.status === "NO_APLICA"

  const serviceStartDisplay = useMemo(
    () => formatSpanishDayMonthYearFromIso(serviceStart || row.serviceStartRaw),
    [serviceStart, row.serviceStartRaw]
  )

  const persistSubscription = async (
    override: { serviceStart?: string; period?: string; userValue?: string; pin?: string } = {}
  ): Promise<boolean> => {
    setSavingSubscription(true)
    setFeedback(null)
    try {
      const nextService =
        override.serviceStart !== undefined ? override.serviceStart : serviceStart
      const nextPeriod = override.period !== undefined ? override.period : period
      const nextUser =
        override.userValue !== undefined ? override.userValue : userValue
      const nextPin = override.pin !== undefined ? override.pin : pin

      const updates: Record<string, string | number | null> = {
        user: nextUser || null,
        service_start_date: nextService || null,
      }

      if (showPinColumn) {
        updates.pin = nextPin || null
      }

      const periodNum = Number(nextPeriod)
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

  /**
   * Si hay cobertura previa y se edita el restante, ajusta months_covered
   * del pago ancla para que remaining = valor deseado.
   */
  const resolveMonthsCoveredForSave = (
    desiredRemaining: number
  ): number => {
    const desired = Math.max(1, Math.floor(desiredRemaining) || 1)
    if (!row.lastPaymentId || !row.lastPaidMonth) return desired

    const selectedKey = monthKeyFromDateOnly(paidMonthFirstDay)
    const anchorKey = monthKeyFromDateOnly(row.lastPaidMonth)
    if (!selectedKey || !anchorKey) return desired

    // elapsed = how many months from anchor to selected
    const currentRemaining = remainingCoveredMonths(
      {
        paid_month: row.lastPaidMonth,
        months_covered: row.monthsCovered ?? desired,
      },
      selectedKey
    )
    const currentSpan = normalizeMonthsCovered(row.monthsCovered ?? desired)
    const elapsed = Math.max(0, currentSpan - currentRemaining)
    return Math.min(24, Math.max(1, elapsed + desired))
  }

  const persistPayment = async (
    override: {
      paymentAmount?: string
      bankAccountId?: string
      paymentDate?: string
      period?: string
      receiptStoragePath?: string | null
    } = {}
  ): Promise<number | null> => {
    const effectiveAmount =
      override.paymentAmount !== undefined
        ? override.paymentAmount
        : paymentAmount

    const effectiveBankRaw =
      override.bankAccountId !== undefined
        ? override.bankAccountId
        : bankAccountId

    const effectiveDate =
      override.paymentDate !== undefined ? override.paymentDate : paymentDate

    const effectivePeriod =
      override.period !== undefined ? override.period : period

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

    if (row.status === "NO_APLICA") {
      return row.lastPaymentId
    }

    const hasReceiptOverride = override.receiptStoragePath !== undefined
    const nextReceipt =
      hasReceiptOverride
        ? override.receiptStoragePath
        : receiptPath || null

    if (
      !row.lastPaymentId &&
      !hasAmount &&
      !hasBank &&
      !effectiveDate &&
      !nextReceipt
    ) {
      return null
    }

    setSavingPayment(true)
    setFeedback(null)
    try {
      const paidMonth = paidMonthFirstDay
      const periodNum = Number(effectivePeriod)
      const desiredRemaining =
        Number.isNaN(periodNum) || periodNum <= 0 ? 1 : Math.floor(periodNum)

      const monthsCovered = resolveMonthsCoveredForSave(desiredRemaining)

      const paymentDateIso = effectiveDate
        ? `${effectiveDate}T12:00:00.000Z`
        : new Date().toISOString()

      const updatePayload: {
        amount: number
        id_bank_account: number | null
        months_covered: number
        payment_date: string
        receipt_storage_path?: string | null
        paid_month?: string
      } = {
        amount: roundMoney2(amountNum),
        id_bank_account: bankIdNum,
        months_covered: monthsCovered,
        payment_date: paymentDateIso,
      }

      if (hasReceiptOverride || nextReceipt) {
        updatePayload.receipt_storage_path = nextReceipt
      }

      let paymentIdToUpdate = row.lastPaymentId

      // Si el mes activo no es el ancla, seguimos actualizando el pago ancla.
      // Si no hay pago, insertamos en el mes activo.
      if (!paymentIdToUpdate) {
        const { data: existingRow, error: lookupError } = await supabase
          .from("payments")
          .select("id_payment")
          .eq("id_subscription", row.id_subscription)
          .eq("paid_month", paidMonth)
          .maybeSingle()

        if (lookupError) {
          console.error("payments lookup error", lookupError)
          setFeedback(
            lookupError.message || "No se pudo comprobar el pago del mes"
          )
          return null
        }

        if (existingRow?.id_payment) {
          paymentIdToUpdate = existingRow.id_payment
        }
      }

      if (paymentIdToUpdate) {
        const { error } = await supabase
          .from("payments")
          .update(updatePayload)
          .eq("id_payment", paymentIdToUpdate)

        if (error) {
          console.error("update payment error", error)
          setFeedback(error.message || "No se pudo guardar el pago")
          return null
        }

        await supabase
          .from("subscriptions")
          .update({ period_in_months: desiredRemaining })
          .eq("id_subscription", row.id_subscription)

        router.refresh()
        return paymentIdToUpdate
      }

      const insertData: {
        id_subscription: number
        amount: number
        payment_date: string
        paid_month: string
        months_covered: number
        id_bank_account?: number | null
        receipt_storage_path?: string | null
      } = {
        id_subscription: row.id_subscription,
        amount: roundMoney2(amountNum),
        payment_date: paymentDateIso,
        paid_month: paidMonth,
        months_covered: monthsCovered,
      }

      if (bankIdNum !== null) {
        insertData.id_bank_account = bankIdNum
      }
      if (nextReceipt) {
        insertData.receipt_storage_path = nextReceipt
      }

      const { data: inserted, error: insertError } = await supabase
        .from("payments")
        .insert(insertData)
        .select("id_payment")
        .maybeSingle()

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
            return null
          }

          await supabase
            .from("subscriptions")
            .update({ period_in_months: desiredRemaining })
            .eq("id_subscription", row.id_subscription)

          router.refresh()
          return conflictRow.id_payment
        }

        console.error("insert payment error", insertError)
        setFeedback(
          insertError.message || "No se pudo registrar el pago (duplicado)"
        )
        return null
      }

      if (insertError) {
        console.error("insert payment error", insertError)
        setFeedback(insertError.message || "No se pudo registrar el pago")
        return null
      }

      await supabase
        .from("subscriptions")
        .update({ period_in_months: desiredRemaining })
        .eq("id_subscription", row.id_subscription)

      router.refresh()
      return inserted?.id_payment ?? null
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
    if (!Number.isNaN(num) && num >= 1 && num <= 24) {
      setPeriod(value)
    }
  }

  const handleBankChange = async (value: string) => {
    const next = value === BANK_NONE ? "" : value
    setBankAccountId(next)
    await persistPayment({ bankAccountId: next })
  }

  const handlePaymentBlur = async () => {
    await persistPayment({ paymentAmount })
  }

  const handlePaymentDateBlur = async () => {
    if (!paymentDate && !row.lastPaymentId) return
    await persistPayment({ paymentDate })
  }

  const handlePeriodBlur = async () => {
    const periodNum = Number(period)
    if (Number.isNaN(periodNum) || periodNum < 1) return

    // Si hay pago (o monto), sincroniza months_covered; siempre guarda suscripción.
    const hasPaymentHint =
      Boolean(row.lastPaymentId) ||
      (paymentAmount.trim() !== "" && !Number.isNaN(Number(paymentAmount)))

    if (hasPaymentHint && !isPaymentMonthNotApplicable) {
      await persistPayment({ period })
    } else {
      await persistSubscription({ period })
    }
  }

  const handleServiceStartBlur = async () => {
    await persistSubscription({ serviceStart })
  }

  const handleSubscriptionBlur = async () => {
    await persistSubscription()
  }

  const handleReceiptPick = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!isReceiptMimeAllowed(file.type)) {
      setFeedback("Solo se permiten JPG, PNG, WebP o PDF")
      return
    }
    if (file.size > PAYMENT_RECEIPT_MAX_BYTES) {
      setFeedback("El archivo no puede superar 5 MB")
      return
    }

    setUploadingReceipt(true)
    setFeedback(null)
    try {
      let paymentId = row.lastPaymentId
      if (!paymentId) {
        paymentId = await persistPayment({})
      }
      if (!paymentId) {
        setFeedback("Guarda monto o mes primero para adjuntar el comprobante")
        return
      }

      const path = buildReceiptStoragePath({
        accountId,
        paymentId,
        fileName: file.name,
      })

      const { error: uploadError } = await supabase.storage
        .from(PAYMENT_RECEIPTS_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        console.error("receipt upload error", uploadError)
        setFeedback(uploadError.message || "No se pudo subir el comprobante")
        return
      }

      if (receiptPath) {
        await supabase.storage
          .from(PAYMENT_RECEIPTS_BUCKET)
          .remove([receiptPath])
      }

      const { error: updateError } = await supabase
        .from("payments")
        .update({ receipt_storage_path: path })
        .eq("id_payment", paymentId)

      if (updateError) {
        setFeedback(updateError.message || "No se pudo guardar el comprobante")
        return
      }

      setReceiptPath(path)
      router.refresh()
    } finally {
      setUploadingReceipt(false)
    }
  }

  const handleRemoveReceipt = async () => {
    if (!row.lastPaymentId || !receiptPath) return
    setUploadingReceipt(true)
    setFeedback(null)
    try {
      await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).remove([receiptPath])
      const { error } = await supabase
        .from("payments")
        .update({ receipt_storage_path: null })
        .eq("id_payment", row.lastPaymentId)
      if (error) {
        setFeedback(error.message || "No se pudo quitar el comprobante")
        return
      }
      setReceiptPath("")
      setReceiptPreviewUrl(null)
      router.refresh()
    } finally {
      setUploadingReceipt(false)
    }
  }

  const bankSelectValue = bankAccountId || BANK_NONE
  const isBusy = savingSubscription || savingPayment || uploadingReceipt

  const clientEditHref =
    row.id_client != null
      ? `/administration/clients?edit=${row.id_client}`
      : null

  const clientEditLabel =
    `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Cliente"

  const statusClass =
    displayPaymentStatus.kind === "CONFIRMADO"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
      : displayPaymentStatus.kind === "REGISTRADO"
        ? "bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100"
        : displayPaymentStatus.kind === "NO_APLICA"
          ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"

  const fieldClass =
    "h-10 border-zinc-200 bg-white text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"

  const receiptFileName = receiptPath
    ? receiptPath.split("/").pop()?.replace(/^\d+-/, "") || "Comprobante"
    : null

  const isPdf =
    receiptPath.toLowerCase().endsWith(".pdf") ||
    receiptPreviewUrl?.includes(".pdf")

  const content = (
    <article
      className={
        layout === "card"
          ? "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-5"
          : ""
      }
      aria-label={`Suscripción ${index + 1}: ${clientFullName}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-zinc-100 px-1.5 text-xs font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {index + 1}
            </span>
            {clientEditHref ? (
              <Link
                href={clientEditHref}
                className="truncate text-base font-semibold text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-emerald-300"
                aria-label={`Abrir edición de cliente: ${clientEditLabel}`}
              >
                {clientFullName}
              </Link>
            ) : (
              <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {clientFullName}
              </span>
            )}
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}
            >
              {displayPaymentStatus.label}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tel. {row.phone || "—"}
            {row.coveredByPriorMonth ? (
              <span className="ml-2 text-emerald-700 dark:text-emerald-400">
                · Cubierto por pago anterior
              </span>
            ) : null}
          </p>
        </div>
        <DeleteSubscriptionButton subscriptionId={row.id_subscription} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label
            htmlFor={`user-${row.id_subscription}`}
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Usuario
          </Label>
          <Input
            id={`user-${row.id_subscription}`}
            type="text"
            value={userValue}
            onChange={(e) => setUserValue(e.target.value)}
            onBlur={handleSubscriptionBlur}
            disabled={isBusy}
            className={fieldClass}
            placeholder="Usuario en la plataforma"
            aria-label="Usuario de la plataforma"
          />
        </div>

        {showPinColumn && (
          <div className="space-y-1.5">
            <Label
              htmlFor={`pin-${row.id_subscription}`}
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              PIN
            </Label>
            <Input
              id={`pin-${row.id_subscription}`}
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={handlePinChange}
              onBlur={handleSubscriptionBlur}
              disabled={isBusy}
              maxLength={4}
              className={`${fieldClass} max-w-[8rem] text-center`}
              placeholder="PIN"
              aria-label="PIN (hasta 4 dígitos)"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor={`start-${row.id_subscription}`}
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Inicio de servicio
          </Label>
          <Input
            id={`start-${row.id_subscription}`}
            type="date"
            value={serviceStart}
            onChange={(e) => setServiceStart(e.target.value)}
            onBlur={handleServiceStartBlur}
            disabled={isBusy}
            className={fieldClass}
            aria-label="Fecha de inicio de servicio"
          />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {serviceStartDisplay}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={`period-${row.id_subscription}`}
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Período restante (meses)
          </Label>
          <Input
            id={`period-${row.id_subscription}`}
            type="number"
            min={1}
            max={24}
            value={period}
            onChange={handlePeriodChange}
            onBlur={handlePeriodBlur}
            disabled={isBusy || isPaymentMonthNotApplicable}
            className={`${fieldClass} max-w-[8rem]`}
            aria-label="Meses de cobertura restantes"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={`pay-date-${row.id_subscription}`}
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Fecha de pago
          </Label>
          <Input
            id={`pay-date-${row.id_subscription}`}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            onBlur={handlePaymentDateBlur}
            disabled={isBusy || isPaymentMonthNotApplicable}
            className={fieldClass}
            aria-label="Fecha del pago"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={`bank-${row.id_subscription}`}
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Método de pago
          </Label>
          <Select
            value={bankSelectValue}
            onValueChange={handleBankChange}
            disabled={isBusy || isPaymentMonthNotApplicable}
          >
            <SelectTrigger
              id={`bank-${row.id_subscription}`}
              className={fieldClass}
              aria-label="Cuenta bancaria del pago"
            >
              <SelectValue placeholder="Seleccionar banco" />
            </SelectTrigger>
            <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <SelectItem value={BANK_NONE}>Sin banco</SelectItem>
              {bankAccounts.map((bank) => (
                <SelectItem
                  key={bank.id_bank_account}
                  value={String(bank.id_bank_account)}
                >
                  {bank.bank_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={`amount-${row.id_subscription}`}
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Monto del pago
          </Label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">$</span>
            <Input
              id={`amount-${row.id_subscription}`}
              type="number"
              min={0}
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              onBlur={handlePaymentBlur}
              disabled={isBusy || isPaymentMonthNotApplicable}
              className={`${fieldClass} max-w-[10rem]`}
              aria-label="Monto total del pago"
            />
          </div>
          {accountPrice != null && !Number.isNaN(accountPrice) ? (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Precio / mes: ${accountPrice.toFixed(2)}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Comprobante
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={handleReceiptPick}
              disabled={isBusy || isPaymentMonthNotApplicable}
              aria-label="Subir comprobante de pago"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy || isPaymentMonthNotApplicable}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              {uploadingReceipt
                ? "Subiendo…"
                : receiptPath
                  ? "Cambiar archivo"
                  : "Subir comprobante"}
            </button>
            {receiptPath ? (
              <button
                type="button"
                onClick={handleRemoveReceipt}
                disabled={isBusy}
                className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:text-red-300 dark:hover:bg-red-950/40"
                aria-label="Quitar comprobante"
              >
                Quitar
              </button>
            ) : null}
          </div>
          {receiptFileName ? (
            <div className="mt-1 flex items-center gap-2">
              {receiptPreviewUrl && !isPdf ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receiptPreviewUrl}
                  alt="Vista previa del comprobante"
                  className="h-12 w-12 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                />
              ) : null}
              {receiptPreviewUrl ? (
                <a
                  href={receiptPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                >
                  {receiptFileName}
                </a>
              ) : (
                <span className="truncate text-xs text-zinc-500">
                  {receiptFileName}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              JPG, PNG, WebP o PDF · máx. 5 MB
            </p>
          )}
        </div>
      </div>

      {feedback ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {feedback}
        </p>
      ) : null}
    </article>
  )

  if (layout === "card") {
    return content
  }

  return (
    <tr className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
      <td colSpan={12} className="p-3">
        {content}
      </td>
    </tr>
  )
}

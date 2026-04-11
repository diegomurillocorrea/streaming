"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Mail,
  Radio,
  RefreshCw,
  Users,
  Wallet,
  Link2,
  PiggyBank,
} from "lucide-react"

import { TableScrollArea } from "@/components/admin/table-scroll-area"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import {
  getCurrentMonthKey,
  monthKeyFromDateOnly,
} from "@/lib/subscription-dates"

interface DashboardStats {
  accounts: number
  clients: number
  companies: number
  cards: number
  emails: number
  bankAccounts: number
  subscriptions: number
  payments: number
}

const EMPTY_STATS: DashboardStats = {
  accounts: 0,
  clients: 0,
  companies: 0,
  cards: 0,
  emails: 0,
  bankAccounts: 0,
  subscriptions: 0,
  payments: 0,
}

type UpcomingPaymentRow = {
  id_subscription: number
  id_account: number
  clientLabel: string
  accountName: string
  /** Precio al cliente de la cuenta (`account_price_by_client`), pago mensual esperado. */
  monthlyPriceDue: number | null
  nextPaymentDate: string
  nextPaymentLabel: string
  phone: string
  /** WhatsApp o mailto con mensaje de recordatorio; null si no hay contacto usable. */
  notifyUrl: string | null
}

type SubscriptionPaymentRow = {
  paid_month?: string | null
  amount?: number | null
}

type SubscriptionQueryRow = {
  id_subscription: number
  id_account?: number | null
  service_start_date?: string | null
  period_in_months?: number | null
  payments?: SubscriptionPaymentRow[] | null
  accounts?:
    | {
        id_account?: number | null
        account_name?: string | null
        account_price_by_client?: number | null
      }
    | {
        id_account?: number | null
        account_name?: string | null
        account_price_by_client?: number | null
      }[]
    | null
  clients?:
    | {
        name?: string | null
        lastName?: string | null
        phoneNumber?: string | null
        email?: string | null
      }
    | {
        name?: string | null
        lastName?: string | null
        phoneNumber?: string | null
        email?: string | null
      }[]
    | null
}

const pickNested = <T,>(value: T | T[] | null | undefined): T | null => {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function calcNextPaymentDateIso(
  serviceStart: string | null | undefined,
  periodMonths: number | null | undefined
): string {
  if (!serviceStart) return ""
  const months =
    periodMonths != null && periodMonths > 0 && !Number.isNaN(periodMonths)
      ? periodMonths
      : 1
  const d = new Date(serviceStart)
  if (Number.isNaN(d.getTime())) return ""
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function formatShortDate(dateIso: string): string {
  if (!dateIso) return "—"
  const d = new Date(`${dateIso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d)
}

const formatMoney = (n: number): string =>
  new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0)

function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, "")
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function buildPaymentReminderNotifyUrl(input: {
  phoneRaw: string
  emailRaw: string | null | undefined
  clientLabel: string
  accountName: string
  monthlyPriceDue: number | null
  nextPaymentLabel: string
}): string | null {
  const greeting =
    input.clientLabel.trim() !== ""
      ? input.clientLabel.trim()
      : "cliente"
  const priceSentence =
    input.monthlyPriceDue !== null && !Number.isNaN(input.monthlyPriceDue)
      ? `Monto mensual: ${formatMoney(input.monthlyPriceDue)}. `
      : ""
  const message = `Hola ${greeting}, te recordamos un pago pendiente. Cuenta: ${input.accountName}. ${priceSentence}Próximo pago: ${input.nextPaymentLabel}. Gracias.`

  const waDigits = digitsOnlyPhone(input.phoneRaw)
  if (waDigits.length >= 8) {
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`
  }

  const mail = input.emailRaw?.trim() ?? ""
  if (mail && looksLikeEmail(mail)) {
    const subject = encodeURIComponent("Recordatorio de pago")
    const body = encodeURIComponent(
      `${message}\n\n(Enviado desde tu panel de administración.)`
    )
    return `mailto:${mail}?subject=${subject}&body=${body}`
  }

  return null
}

function isPaymentConfirmedForMonth(
  payment: SubscriptionPaymentRow,
  currentMonthKey: string,
  accountPrice: number | null
): boolean {
  if (!payment?.paid_month) return false
  if (monthKeyFromDateOnly(payment.paid_month) !== currentMonthKey) {
    return false
  }

  const amountNum =
    payment.amount !== null && payment.amount !== undefined
      ? Number(payment.amount)
      : 0
  if (Number.isNaN(amountNum)) return false

  if (accountPrice === null || accountPrice === undefined) {
    return amountNum > 0
  }

  const priceNum = Number(accountPrice)
  if (Number.isNaN(priceNum) || priceNum <= 0) {
    return amountNum > 0
  }

  return amountNum >= priceNum
}

const QUICK_LINKS: {
  href: string
  label: string
  description: string
  icon: typeof Radio
}[] = [
  {
    href: "/administration/monthly-finance",
    label: "Finanzas del mes",
    description: "Cobros, pendientes y resultado por mes",
    icon: PiggyBank,
  },
  {
    href: "/administration/accounts",
    label: "Cuentas",
    description: "Cuentas de streaming y precios",
    icon: Radio,
  },
  {
    href: "/administration/clients",
    label: "Clientes",
    description: "Personas y suscripciones",
    icon: Users,
  },
  {
    href: "/administration/companies",
    label: "Empresas",
    description: "Empresas asociadas",
    icon: Building2,
  },
  {
    href: "/administration/cards",
    label: "Tarjetas",
    description: "Tarjetas y redes de pago",
    icon: CreditCard,
  },
  {
    href: "/administration/emails",
    label: "Correos",
    description: "Correos vinculados a cuentas",
    icon: Mail,
  },
  {
    href: "/administration/bank-accounts",
    label: "Cuentas bancarias",
    description: "Cuentas donde recibes pagos",
    icon: Landmark,
  },
]

const STAT_CONFIG: {
  key: keyof DashboardStats
  label: string
  icon: typeof Radio
}[] = [
  { key: "accounts", label: "Cuentas de streaming", icon: Radio },
  { key: "clients", label: "Clientes", icon: Users },
  { key: "subscriptions", label: "Suscripciones activas", icon: Link2 },
  { key: "payments", label: "Registros de pago", icon: Wallet },
  { key: "companies", label: "Empresas", icon: Building2 },
  { key: "cards", label: "Tarjetas", icon: CreditCard },
  { key: "emails", label: "Correos", icon: Mail },
  { key: "bankAccounts", label: "Cuentas bancarias", icon: Landmark },
]

export default function AdministrationDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [hasMounted, setHasMounted] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [upcomingRows, setUpcomingRows] = useState<UpcomingPaymentRow[]>([])
  const [upcomingError, setUpcomingError] = useState<string | null>(null)

  const isLoadingUi = !hasMounted || loading

  const loadStats = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setUpcomingError(null)
    const supabase = createClient()

    const countTable = async (table: string) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })

      if (error) {
        console.error(`[dashboard] count ${table}`, error)
        return 0
      }

      return count ?? 0
    }

    try {
      const currentMonthKey = getCurrentMonthKey()

      const [
        accounts,
        clients,
        companies,
        cards,
        emails,
        bankAccounts,
        subscriptions,
        payments,
        { data: subscriptionRows, error: upcomingQueryError },
      ] = await Promise.all([
        countTable("accounts"),
        countTable("clients"),
        countTable("companies"),
        countTable("cards"),
        countTable("emails"),
        countTable("bank_accounts"),
        countTable("subscriptions"),
        countTable("payments"),
        supabase
          .from("subscriptions")
          .select(
            `
            id_subscription,
            id_account,
            service_start_date,
            period_in_months,
            accounts (
              id_account,
              account_name,
              account_price_by_client
            ),
            clients (
              name,
              lastName,
              phoneNumber,
              email
            ),
            payments (
              amount,
              paid_month
            )
          `
          )
          .order("id_subscription", { ascending: true })
          .limit(5000),
      ])

      setStats({
        accounts,
        clients,
        companies,
        cards,
        emails,
        bankAccounts,
        subscriptions,
        payments,
      })

      if (upcomingQueryError) {
        console.error("[dashboard] upcoming subscriptions", upcomingQueryError)
        setUpcomingError(
          "No se pudo cargar la lista de próximos cobros. Intenta de nuevo."
        )
        setUpcomingRows([])
      } else {
        const list = (subscriptionRows ?? []) as SubscriptionQueryRow[]
        const mapped: UpcomingPaymentRow[] = []

        for (const sub of list) {
          const account = pickNested(sub.accounts)
          const client = pickNested(sub.clients)
          const idAccount =
            typeof account?.id_account === "number"
              ? account.id_account
              : typeof sub.id_account === "number"
                ? sub.id_account
                : null
          if (idAccount === null) continue

          const accountPriceRaw = account?.account_price_by_client
          const accountPrice =
            accountPriceRaw !== null && accountPriceRaw !== undefined
              ? Number(accountPriceRaw)
              : null

          const payments = sub.payments ?? []
          const paymentThisMonth = payments.find((p) => {
            if (!p.paid_month) return false
            return monthKeyFromDateOnly(p.paid_month) === currentMonthKey
          })

          const isConfirmed = paymentThisMonth
            ? isPaymentConfirmedForMonth(
                paymentThisMonth,
                currentMonthKey,
                accountPrice
              )
            : false

          if (isConfirmed) continue

          const nextIso = calcNextPaymentDateIso(
            sub.service_start_date,
            sub.period_in_months
          )
          if (!nextIso) continue

          const firstName = client?.name?.trim() ?? ""
          const lastName = client?.lastName?.trim() ?? ""
          const clientLabel = [firstName, lastName].filter(Boolean).join(" ")
          const accountName =
            account?.account_name?.trim() || `Cuenta ${idAccount}`

          const monthlyPriceDue =
            accountPrice !== null &&
            accountPrice !== undefined &&
            !Number.isNaN(accountPrice)
              ? accountPrice
              : null

          const nextPaymentLabel = formatShortDate(nextIso)
          const phoneDisplay = client?.phoneNumber?.trim() || "—"
          const notifyUrl = buildPaymentReminderNotifyUrl({
            phoneRaw: client?.phoneNumber?.trim() ?? "",
            emailRaw: client?.email,
            clientLabel: clientLabel || "Cliente sin nombre",
            accountName,
            monthlyPriceDue,
            nextPaymentLabel,
          })

          mapped.push({
            id_subscription: sub.id_subscription,
            id_account: idAccount,
            clientLabel: clientLabel || "Cliente sin nombre",
            accountName,
            monthlyPriceDue,
            nextPaymentDate: nextIso,
            nextPaymentLabel,
            phone: phoneDisplay,
            notifyUrl,
          })
        }

        mapped.sort((a, b) => {
          if (a.nextPaymentDate !== b.nextPaymentDate) {
            return a.nextPaymentDate.localeCompare(b.nextPaymentDate)
          }
          return a.clientLabel.localeCompare(b.clientLabel, "es")
        })

        setUpcomingRows(mapped)
      }
    } catch (e) {
      console.error("[dashboard] loadStats", e)
      setLoadError("No se pudieron cargar las métricas. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setHasMounted(true)
    void loadStats()
  }, [loadStats])

  return (
    <div className="mx-auto flex flex-col gap-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <LayoutDashboard className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Resumen de tu operación y accesos rápidos a la administración.
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="metrics-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="metrics-heading"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Métricas
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Totales en base de datos (se actualizan al cargar la página).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadStats()}
            disabled={hasMounted && loading}
            className="gap-2"
            aria-label="Actualizar métricas"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingUi ? "animate-spin" : ""}`}
              aria-hidden
            />
            Actualizar
          </Button>
        </div>

        {loadError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {loadError}
          </p>
        )}

        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-busy={isLoadingUi}
          aria-live="polite"
        >
          {STAT_CONFIG.map(({ key, label, icon: Icon }) => (
            <Card
              key={key}
              className="border-zinc-200/80 shadow-sm dark:border-zinc-800"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardDescription className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {label}
                  </CardDescription>
                  <Icon
                    className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                </div>
                <CardTitle className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {isLoadingUi ? (
                    <span className="inline-block h-9 w-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                  ) : (
                    stats[key].toLocaleString("es")
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="upcoming-payments-heading"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <CalendarClock className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2
                id="upcoming-payments-heading"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Cobros pendientes (próximas fechas)
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Clientes con pago del mes actual incompleto, ordenados por la
                fecha de próximo cobro (inicio de servicio + período en meses).
                &quot;Pago mensual&quot; es el precio al cliente configurado en
                la cuenta (lo que deben cancelar cada mes). &quot;Enviar
                notificación&quot; abre WhatsApp (si hay teléfono con dígitos
                suficientes) o el cliente de correo si solo hay email.
              </p>
            </div>
          </div>
        </div>

        {upcomingError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {upcomingError}
          </p>
        )}

        <TableScrollArea>
          <table className="w-full border-collapse text-left text-sm min-w-[max(100%,36rem)]">
            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
              <tr className="text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-200">
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Cuenta</th>
                <th className="px-4 py-3.5">Teléfono</th>
                <th className="whitespace-nowrap px-4 py-3.5 text-right">
                  Pago mensual
                </th>
                <th className="whitespace-nowrap px-4 py-3.5">Próximo pago</th>
                <th className="px-4 py-3.5 text-center">
                  Enviar notificación
                </th>
                <th className="px-4 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingUi ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm">
                    <span className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                      <RefreshCw
                        className="h-4 w-4 animate-spin"
                        aria-hidden
                      />
                      Cargando…
                    </span>
                  </td>
                </tr>
              ) : upcomingRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    No hay cobros pendientes con fecha de próximo pago
                    calculada, o todos los clientes ya completaron el pago del
                    mes actual.
                  </td>
                </tr>
              ) : (
                upcomingRows.map((row) => (
                  <tr
                    key={row.id_subscription}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {row.clientLabel}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {row.accountName}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {row.phone}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-zinc-900 dark:text-zinc-50">
                      {row.monthlyPriceDue === null
                        ? "—"
                        : formatMoney(row.monthlyPriceDue)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-800 dark:text-zinc-200">
                      {row.nextPaymentLabel}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.notifyUrl ? (
                        <a
                          href={row.notifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-300 dark:focus-visible:outline-emerald-400"
                          aria-label={`Enviar notificación de pago a ${row.clientLabel}`}
                        >
                          Enviar notificación
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          Sin teléfono ni correo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/administration/subscriptions/${row.id_account}`}
                        className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-300 dark:focus-visible:outline-emerald-400"
                      >
                        Ver suscripción
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableScrollArea>
      </section>

      <section aria-labelledby="quick-links-heading" className="space-y-4">
        <div>
          <h2
            id="quick-links-heading"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Accesos rápidos
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ir directamente a cada módulo de administración.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(
            ({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all hover:border-emerald-300/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-emerald-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-emerald-950/50 dark:group-hover:text-emerald-300">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                    aria-hidden
                  />
                </div>
              </Link>
            )
          )}
        </div>
      </section>
    </div>
  )
}

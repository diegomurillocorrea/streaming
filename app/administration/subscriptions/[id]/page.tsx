import type { Metadata } from "next"
import Link from "next/link"
import { createClient as createServerClient } from "@/utils/supabase/server"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { FinishMonthButton } from "@/components/interface/FinishMonthButton"
import { CopyAccountCredentialsButton } from "@/components/interface/copy-account-credentials-button"
import { AccountSubscriptionsTable } from "@/components/admin/account-subscriptions-table"
import { accountLacksPaymentDayAndPrice } from "@/lib/account-subscriptions-access"
import {
  getCurrentMonthKey,
  monthKeyFromDateOnly,
} from "@/lib/subscription-dates"

interface AccountSubscriptionsPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: AccountSubscriptionsPageProps): Promise<Metadata> {
  const routeParams = await params
  const rawAccountId = routeParams?.id

  if (!rawAccountId) {
    return { title: "Suscripciones" }
  }

  const accountId = Number(rawAccountId)
  if (Number.isNaN(accountId)) {
    return { title: "Cuenta inválida" }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("accounts")
    .select("account_name, payment_date, price")
    .eq("id_account", accountId)
    .maybeSingle()

  if (error || !data) {
    return { title: "Cuenta no encontrada" }
  }

  if (accountLacksPaymentDayAndPrice(data)) {
    return { title: "Día de pago y precio requeridos" }
  }

  const accountLabel =
    data.account_name?.trim() || `Cuenta ${accountId}`

  return { title: accountLabel }
}

function formatHeaderDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d)
}

function isPaymentConfirmedForMonth(
  payment: { paid_month?: string | null; amount?: number | null },
  currentMonthKey: string,
  accountPrice: number | null
) {
  if (!payment?.paid_month) return false
  if (monthKeyFromDateOnly(payment.paid_month) !== currentMonthKey) return false

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

export default async function AccountSubscriptionsPage({
  params,
}: AccountSubscriptionsPageProps) {
  const routeParams = await params
  const rawAccountId = routeParams?.id

  if (!rawAccountId) {
    return (
      <main className="mx-auto space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-emerald-300">
          Suscripciones
        </p>
        <h1 className="text-2xl font-bold">Cuenta no encontrada</h1>
        <p className="text-sm text-zinc-600 dark:text-emerald-300">
          No se proporcionó un id de cuenta en la URL. Usa una ruta como{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-emerald-900/80">
            /administration/subscriptions/9
          </code>
          .
        </p>
      </main>
    )
  }

  const accountId = Number(rawAccountId)

  if (Number.isNaN(accountId)) {
    return (
      <main className="mx-auto space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-emerald-300">
          Suscripciones
        </p>
        <h1 className="text-2xl font-bold">Id de cuenta inválido</h1>
        <p className="text-sm text-zinc-600 dark:text-emerald-300">
          El id de cuenta <code>{String(rawAccountId)}</code> no es válido.
        </p>
      </main>
    )
  }

  const supabase = await createServerClient()

  const [
    { data: subscriptions, error: subscriptionsError },
    { data: accountData, error: accountError },
    { data: clientsList },
    { data: bankAccounts },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        `
        id_subscription,
        id_client,
        user,
        pin,
        service_start_date,
        service_end_date,
        period_in_months,
        created_at,
        id_account,
        accounts (
          id_account,
          account_name,
          payment_date,
          price,
          companies (
            company_name
          ),
          emails (
            email_address
          )
        ),
        clients (
          id_client,
          name,
          lastName,
          email,
          phoneNumber
        ),
        payments (
          id_payment,
          id_bank_account,
          amount,
          payment_date,
          paid_month,
          bank_accounts (
            bank_name
          )
        )
      `
      )
      .eq("id_account", accountId)
      .order("id_subscription", { ascending: true }),

    supabase
      .from("accounts")
      .select(
        `
        id_account,
        account_name,
        password,
        payment_date,
        price,
        pin_included,
        companies ( company_name ),
        emails ( email_address )
      `
      )
      .eq("id_account", accountId)
      .maybeSingle(),

    supabase
      .from("clients")
      .select("id_client, name, lastName, email, phoneNumber")
      .order("id_client", { ascending: true }),

    supabase
      .from("bank_accounts")
      .select("id_bank_account, bank_name")
      .order("id_bank_account", { ascending: true }),
  ])

  if (accountError || !accountData) {
    return (
      <main className="mx-auto space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-emerald-300">
          Suscripciones
        </p>
        <h1 className="text-2xl font-bold">Cuenta no encontrada</h1>
        <p className="text-sm text-zinc-600 dark:text-emerald-300">
          No existe una cuenta con el id {accountId} o no tienes permiso para verla.
        </p>
        <Link
          href="/administration/accounts"
          className="inline-flex text-sm font-medium text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-300 dark:focus-visible:outline-emerald-400"
        >
          Volver a Cuentas
        </Link>
      </main>
    )
  }

  if (accountLacksPaymentDayAndPrice(accountData)) {
    const label =
      accountData.account_name?.trim() || `Cuenta ${accountId}`
    return (
      <main className="mx-auto max-w-lg space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-emerald-300">
          Suscripciones
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-emerald-50">
          Completa la cuenta para continuar
        </h1>
        <p className="text-sm text-zinc-600 dark:text-emerald-300">
          La cuenta{" "}
          <span className="font-medium text-zinc-900 dark:text-emerald-100">
            {label}
          </span>{" "}
          no tiene día de pago ni precio. Configura ambos en{" "}
          <strong className="font-semibold">Cuentas</strong> para gestionar
          suscripciones y pagos.
        </p>
        <Link
          href="/administration/accounts"
          className="inline-flex text-sm font-medium text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-300 dark:focus-visible:outline-emerald-400"
        >
          Ir a Cuentas
        </Link>
      </main>
    )
  }

  if (subscriptionsError) {
    console.error("subscriptions query error =>", subscriptionsError)
    return (
      <main className="mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Error al cargar suscripciones</h1>
        <p className="text-sm text-zinc-600 dark:text-emerald-300">
          No se pudieron cargar los datos. Intenta nuevamente más tarde.
        </p>
      </main>
    )
  }

  const list = subscriptions ?? []

  const accountInfo = accountData ?? null
  const accountCompany = Array.isArray(accountInfo?.companies)
    ? accountInfo.companies[0]
    : accountInfo?.companies
  const accountEmailInfo = Array.isArray(accountInfo?.emails)
    ? accountInfo.emails[0]
    : accountInfo?.emails
  const accountName = accountInfo?.account_name ?? `Cuenta ${accountId}`
  const serviceName = accountCompany?.company_name ?? "-"
  const accountEmail = accountEmailInfo?.email_address ?? "-"
  const accountPassword = accountInfo?.password ?? ""
  const accountPaymentDay = accountInfo?.payment_date ?? null
  const accountPrice =
    accountInfo?.price !== null && accountInfo?.price !== undefined
      ? Number(accountInfo.price)
      : null

  const pinIncluded =
    accountInfo?.pin_included === null ||
    accountInfo?.pin_included === undefined
      ? true
      : Boolean(accountInfo.pin_included)

  const currentMonthKey = getCurrentMonthKey()

  const linkedClientIds = list
    .map((sub) => sub.id_client)
    .filter((id): id is number => typeof id === "number" && !Number.isNaN(id))

  const rows = list.map((sub) => {
    const payments = sub.payments || []
    const client = Array.isArray(sub.clients) ? sub.clients[0] : sub.clients

    const monthsPaid = payments.length

    const sortedPayments = [...payments].sort(
      (a, b) =>
        new Date(b.paid_month).getTime() - new Date(a.paid_month).getTime()
    )
    const lastPayment = sortedPayments[0]

    const paymentThisMonth = payments.find((p) => {
      if (!p.paid_month) return false
      return monthKeyFromDateOnly(p.paid_month) === currentMonthKey
    })

    const paymentForEdit = paymentThisMonth ?? null
    const lastPaymentBankData: unknown = paymentForEdit?.bank_accounts

    const isConfirmed = paymentThisMonth
      ? isPaymentConfirmedForMonth(
          paymentThisMonth,
          currentMonthKey,
          accountPrice
        )
      : false

    const status = isConfirmed ? "CONFIRMADO" : "PENDIENTE"

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
      serviceStartRaw: sub.service_start_date,
      periodInMonths: sub.period_in_months,
      monthsPaid,
      lastPaidMonth: lastPayment?.paid_month ?? null,
      lastPaymentDate: lastPayment?.payment_date ?? null,
      lastPaymentAmount: paymentForEdit?.amount ?? null,
      lastPaymentBank: Array.isArray(lastPaymentBankData)
        ? lastPaymentBankData[0]?.bank_name ?? null
        : (lastPaymentBankData as { bank_name?: string } | null)?.bank_name ??
          null,
      lastPaymentBankId: paymentForEdit?.id_bank_account ?? null,
      lastPaymentId: paymentForEdit?.id_payment ?? null,
      status,
    }
  })

  const confirmedCount = rows.filter((r) => r.status === "CONFIRMADO").length
  const pendingCount = rows.filter((r) => r.status === "PENDIENTE").length

  const MAX_SLOTS = 5
  const emptySlots = Math.max(MAX_SLOTS - rows.length, 0)

  return (
    <main className="mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-emerald-300">
            Subscripcion
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-emerald-50 md:text-3xl">
            {accountName}
          </h1>
          <div className="space-y-1 text-sm text-zinc-600 dark:text-emerald-200">
            <p>
              <span className="text-zinc-500 dark:text-emerald-400">Servicio:</span>{" "}
              <span className="font-medium text-zinc-900 dark:text-emerald-50">
                {serviceName}
              </span>
            </p>
            <p>
              <span className="text-zinc-500 dark:text-emerald-400">Correo de la cuenta:</span>{" "}
              <span className="font-medium break-all text-zinc-900 dark:text-emerald-50">
                {accountEmail}
              </span>
            </p>
            <p>
              <span className="text-zinc-500 dark:text-emerald-400">Contraseña:</span>{" "}
              <span className="font-mono text-sm font-medium break-all text-zinc-900 dark:text-emerald-50">
                {accountPassword.trim() !== "" ? accountPassword : "—"}
              </span>
            </p>
            <CopyAccountCredentialsButton
              email={accountEmail}
              password={accountPassword}
            />
            {accountPaymentDay && (
              <p className="text-xs">
                <span className="text-zinc-500 dark:text-emerald-400">Día de pago:</span>{" "}
                {formatHeaderDate(accountPaymentDay)}
              </p>
            )}
            {accountPrice !== null && !Number.isNaN(accountPrice) && (
              <p className="text-xs">
                <span className="text-zinc-500 dark:text-emerald-400">Precio de referencia:</span>{" "}
                <span className="font-medium text-zinc-900 dark:text-emerald-50">
                  ${accountPrice.toFixed(2)}
                </span>{" "}
                <span className="text-zinc-400 dark:text-emerald-500">
                  (se usa para marcar si el pago del mes está completo)
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <FinishMonthButton accountId={accountId} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-zinc-500 dark:text-emerald-400">
            Cupos usados
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-emerald-50">
            {rows.length}/{MAX_SLOTS}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-zinc-500 dark:text-emerald-400">
            Confirmados (mes)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {confirmedCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-zinc-500 dark:text-emerald-400">
            Pendientes (mes)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-zinc-500 dark:text-emerald-400">
            Cupos libres
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-emerald-50">
            {emptySlots}
          </p>
        </div>
      </div>

      <Card className="border border-zinc-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-emerald-900/60">
        <CardHeader>
          <CardTitle className="text-base">Clientes y control de pagos</CardTitle>
          <CardDescription>
            Edita usuario
            {pinIncluded ? ", PIN" : ""}, fechas y pagos por fila. Los cambios se guardan al salir
            de cada campo o al elegir banco. Eliminar una suscripción también elimina sus pagos
            asociados en base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountSubscriptionsTable
            accountId={accountId}
            rows={rows}
            emptySlots={emptySlots}
            clientsList={clientsList ?? []}
            linkedClientIds={linkedClientIds}
            bankAccounts={bankAccounts ?? []}
            accountPrice={accountPrice}
            pinIncluded={pinIncluded}
          />
        </CardContent>
      </Card>
    </main>
  )
}

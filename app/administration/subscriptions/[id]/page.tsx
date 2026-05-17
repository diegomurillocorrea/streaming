import type { Metadata } from "next"
import Link from "next/link"
import { createClient as createServerClient } from "@/utils/supabase/server"
import { AccountSubscriptionsPanel } from "@/components/admin/account-subscriptions-panel"
import { FinishMonthButton } from "@/components/interface/FinishMonthButton"
import { CopyAccountCredentialsButton } from "@/components/interface/copy-account-credentials-button"
import { accountLacksPaymentDayAndPrice } from "@/lib/account-subscriptions-access"
import type { SubscriptionPayloadRow } from "@/lib/build-subscription-table-rows"

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
    .select("account_name, payment_date, account_price_by_client")
    .eq("id_account", accountId)
    .maybeSingle()

  if (error || !data) {
    return { title: "Cuenta no encontrada" }
  }

  if (accountLacksPaymentDayAndPrice(data)) {
    return { title: "Día de pago y precio al cliente requeridos" }
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
          account_price_by_client,
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
          payment_reference,
          receipt_storage_path,
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
        account_price_by_client,
        pin_included,
        companies ( company_name, membership_monthly_cost ),
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
          no tiene día de pago ni precio al cliente. Configura ambos en{" "}
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
    accountInfo?.account_price_by_client !== null &&
    accountInfo?.account_price_by_client !== undefined
      ? Number(accountInfo.account_price_by_client)
      : null

  const membershipMonthlyCostRaw = accountCompany?.membership_monthly_cost
  const accountCost =
    membershipMonthlyCostRaw !== null &&
    membershipMonthlyCostRaw !== undefined
      ? Number(membershipMonthlyCostRaw)
      : null

  const pinIncluded =
    accountInfo?.pin_included === null ||
    accountInfo?.pin_included === undefined
      ? true
      : Boolean(accountInfo.pin_included)

  const subscriptionsPayload = list as SubscriptionPayloadRow[]

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
            {accountCost !== null && !Number.isNaN(accountCost) && (
              <p className="text-xs">
                <span className="text-zinc-500 dark:text-emerald-400">
                  Costo membresía (compra mensual):
                </span>{" "}
                <span className="font-medium text-zinc-900 dark:text-emerald-50">
                  ${accountCost.toFixed(2)}
                </span>
              </p>
            )}
            {accountPrice !== null && !Number.isNaN(accountPrice) && (
              <p className="text-xs">
                <span className="text-zinc-500 dark:text-emerald-400">Precio al cliente:</span>{" "}
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
        <div className="flex max-w-sm shrink-0 flex-col items-end gap-2 text-right">
          <FinishMonthButton accountId={accountId} />
          <p className="text-xs text-zinc-500 dark:text-emerald-400">
            Tras cerrar mes las fechas de servicio avanzan; para ver pendientes de
            un mes pasado (p. ej. abril), elige ese mes en el modal de la pestaña{" "}
            <strong className="font-medium text-zinc-700 dark:text-emerald-200">
              Periodo
            </strong>{" "}
            del menú lateral.
          </p>
        </div>
      </header>

      <AccountSubscriptionsPanel
        accountId={accountId}
        subscriptionsPayload={subscriptionsPayload}
        clientsList={
          (clientsList ?? []).map((c) => ({
            id_client: c.id_client,
            name: c.name ?? "",
            lastName: c.lastName ?? "",
            email: c.email ?? null,
            phoneNumber: c.phoneNumber ?? null,
          }))
        }
        bankAccounts={(bankAccounts ?? []).map((b) => ({
          id_bank_account: b.id_bank_account,
          bank_name: b.bank_name,
        }))}
        accountPrice={accountPrice}
        pinIncluded={pinIncluded}
      />
    </main>
  )
}

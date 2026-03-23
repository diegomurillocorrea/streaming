import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface PaymentRow {
  id_payment: number
  amount: number | nullnpm 
  payment_date: string | null
  paid_month: string | null
}

interface SubscriptionRow {
  id_subscription: number
  accounts:
    | {
        id_account: number
        account_name: string
        price: number | null
      }
    | Array<{
        id_account: number
        account_name: string
        price: number | null
      }>
    | null
  clients:
    | {
        name: string | null
        lastName: string | null
      }
    | Array<{
        name: string | null
        lastName: string | null
      }>
    | null
  payments: PaymentRow[] | null
}

interface AccountCardRow {
  id_account: number
  account_name: string
  price: number | null
  companies:
    | {
        company_name: string | null
      }
    | Array<{
        company_name: string | null
      }>
    | null
}

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`
}

function monthKeyFromString(dateStr: string | null) {
  if (!dateStr) return ""
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return ""
  return monthKeyFromDate(parsed)
}

function asSingleObject<T>(value: T | T[] | null | undefined) {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-"
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

export default async function Page() {
  const supabase = await createClient()
  const currentMonthKey = monthKeyFromDate(new Date())

  const [
    { count: accountsCountRaw },
    { count: clientsCountRaw },
    { data: accountCardsRaw },
    { data: subscriptionsRaw },
  ] = await Promise.all([
    supabase.from("accounts").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("accounts")
      .select(
        `
        id_account,
        account_name,
        price,
        companies (
          company_name
        )
      `
      )
      .order("account_name", { ascending: true }),
    supabase
      .from("subscriptions")
      .select(
        `
        id_subscription,
        accounts (
          id_account,
          account_name,
          price
        ),
        clients (
          name,
          lastName
        ),
        payments (
          id_payment,
          amount,
          payment_date,
          paid_month
        )
      `
      )
      .order("id_subscription", { ascending: true }),
  ])

  const subscriptions = (subscriptionsRaw ?? []) as SubscriptionRow[]
  const accountCards = (accountCardsRaw ?? []) as AccountCardRow[]

  let totalExpected = 0
  let totalCollected = 0
  let paidSubscriptions = 0
  let pendingSubscriptions = 0

  const accountStats = new Map<
    number,
    {
      accountName: string
      expected: number
      collected: number
      clients: number
      paid: number
      pending: number
    }
  >()

  const recentPayments: Array<{
    idPayment: number
    accountName: string
    clientName: string
    amount: number
    paymentDate: string | null
  }> = []

  for (const subscription of subscriptions) {
    const account = asSingleObject(subscription.accounts)
    const client = asSingleObject(subscription.clients)
    const payments = subscription.payments ?? []

    const accountId = account?.id_account ?? 0
    const accountName = account?.account_name ?? "Cuenta desconocida"
    const accountPrice =
      typeof account?.price === "number" ? account.price : 0

    const monthPayments = payments.filter(
      (payment) => monthKeyFromString(payment.paid_month) === currentMonthKey
    )
    const subscriptionCollected = monthPayments.reduce((sum, payment) => {
      const amount = typeof payment.amount === "number" ? payment.amount : 0
      return sum + amount
    }, 0)

    totalExpected += accountPrice
    totalCollected += subscriptionCollected

    if (subscriptionCollected >= accountPrice && accountPrice > 0) {
      paidSubscriptions += 1
    } else {
      pendingSubscriptions += 1
    }

    if (accountId) {
      const existing = accountStats.get(accountId) ?? {
        accountName,
        expected: 0,
        collected: 0,
        clients: 0,
        paid: 0,
        pending: 0,
      }

      existing.expected += accountPrice
      existing.collected += subscriptionCollected
      existing.clients += 1
      if (subscriptionCollected >= accountPrice && accountPrice > 0) {
        existing.paid += 1
      } else {
        existing.pending += 1
      }
      accountStats.set(accountId, existing)
    }

    for (const payment of monthPayments) {
      recentPayments.push({
        idPayment: payment.id_payment,
        accountName,
        clientName: `${client?.name ?? ""} ${client?.lastName ?? ""}`.trim() || "-",
        amount: typeof payment.amount === "number" ? payment.amount : 0,
        paymentDate: payment.payment_date,
      })
    }
  }

  recentPayments.sort((a, b) => {
    const aTime = a.paymentDate ? new Date(a.paymentDate).getTime() : 0
    const bTime = b.paymentDate ? new Date(b.paymentDate).getTime() : 0
    return bTime - aTime
  })

  const accountsPerformance = Array.from(accountStats.entries())
    .map(([id, stat]) => ({
      id,
      ...stat,
      progress:
        stat.expected > 0 ? Math.min((stat.collected / stat.expected) * 100, 100) : 0,
    }))
    .sort((a, b) => b.collected - a.collected)
    .slice(0, 6)

  const accountsCount = accountsCountRaw ?? 0
  const clientsCount = clientsCountRaw ?? 0
  const subscriptionsCount = subscriptions.length
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0

  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-50">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
            DAIEGO Streaming
          </p>
          <h1 className="text-3xl font-bold">Panel principal</h1>
          <p className="text-sm text-emerald-300">
            Vista mensual del rendimiento de tu negocio y estado de pagos.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-300">Cuentas totales</CardDescription>
              <CardTitle className="text-2xl">{accountsCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-300">Clientes totales</CardDescription>
              <CardTitle className="text-2xl">{clientsCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-300">Esperado este mes</CardDescription>
              <CardTitle className="text-2xl">{money(totalExpected)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-300">Cobrado este mes</CardDescription>
              <CardTitle className="text-2xl">{money(totalCollected)}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-emerald-800 bg-emerald-900 lg:col-span-2">
            <CardHeader>
              <CardTitle>Rendimiento por cuenta</CardTitle>
              <CardDescription className="text-emerald-300">
                Cuentas con mayor cobro este mes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountsPerformance.length === 0 ? (
                <p className="text-sm text-emerald-300">
                  Aún no hay suscripciones. Crea clientes y cuentas para iniciar el seguimiento.
                </p>
              ) : (
                accountsPerformance.map((account) => (
                  <div key={account.id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{account.accountName}</p>
                      <p className="text-xs text-emerald-300">
                        {money(account.collected)} / {money(account.expected)} • {account.paid} pagadas
                        {" / "}
                        {account.pending} pendientes
                      </p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-emerald-950/70">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${account.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader>
              <CardTitle>Estado de suscripciones</CardTitle>
              <CardDescription className="text-emerald-300">
                Cumplimiento de pagos del mes actual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300">Suscripciones</span>
                <span className="font-semibold">{subscriptionsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-300">Pagadas</span>
                <span className="font-semibold text-emerald-200">{paidSubscriptions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-300">Pendientes</span>
                <span className="font-semibold text-amber-300">{pendingSubscriptions}</span>
              </div>
              <div className="border-t border-emerald-800 pt-3">
                <p className="text-xs text-emerald-300">Tasa de cobro</p>
                <p className="text-xl font-bold">{collectionRate.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-emerald-800 bg-emerald-900 lg:col-span-2">
            <CardHeader>
              <CardTitle>Pagos recientes</CardTitle>
              <CardDescription className="text-emerald-300">
                Últimos pagos registrados del mes actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="text-sm text-emerald-300">Aún no se han registrado pagos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-emerald-800 text-xs uppercase text-emerald-300">
                      <tr>
                        <th className="py-2 pr-4">Cuenta</th>
                        <th className="py-2 pr-4">Cliente</th>
                        <th className="py-2 pr-4 text-right">Monto</th>
                        <th className="py-2 pr-0">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.slice(0, 8).map((payment) => (
                        <tr key={payment.idPayment} className="border-b border-emerald-900/60">
                          <td className="py-3 pr-4">{payment.accountName}</td>
                          <td className="py-3 pr-4">{payment.clientName}</td>
                          <td className="py-3 pr-4 text-right">{money(payment.amount)}</td>
                          <td className="py-3 pr-0 text-xs text-emerald-300">
                            {formatDateTime(payment.paymentDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader>
              <CardTitle>Accesos rápidos</CardTitle>
              <CardDescription className="text-emerald-300">
                Ir a las pantallas más usadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href="/administration"
                className="block rounded-md border border-emerald-700 px-3 py-2 text-emerald-100 hover:bg-emerald-800"
              >
                Resumen de administración
              </Link>
              <Link
                href="/administration/accounts"
                className="block rounded-md border border-emerald-700 px-3 py-2 text-emerald-100 hover:bg-emerald-800"
              >
                Gestionar cuentas
              </Link>
              <Link
                href="/administration/clients"
                className="block rounded-md border border-emerald-700 px-3 py-2 text-emerald-100 hover:bg-emerald-800"
              >
                Gestionar clientes
              </Link>
              <Link
                href="/administration/bank-accounts"
                className="block rounded-md border border-emerald-700 px-3 py-2 text-emerald-100 hover:bg-emerald-800"
              >
                Gestionar cuentas bancarias
              </Link>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader>
              <CardTitle>Catálogo de cuentas</CardTitle>
              <CardDescription className="text-emerald-300">
                Lista rápida de todas las cuentas configuradas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accountCards.length === 0 ? (
                <p className="text-sm text-emerald-300">
                  Aún no hay cuentas. Agrega la primera en Administración &gt; Cuentas.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {accountCards.map((account) => {
                    const company = asSingleObject(account.companies)
                    return (
                      <Link
                        key={account.id_account}
                        href={`/subscriptions/${account.id_account}`}
                        className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 hover:bg-emerald-800/40"
                      >
                        <p className="text-sm font-semibold">{account.account_name}</p>
                        <p className="text-xs text-emerald-300">
                          {company?.company_name ?? "Sin empresa asignada"}
                        </p>
                        <p className="mt-2 text-xs text-emerald-200">
                          Precio:{" "}
                          {typeof account.price === "number" ? money(account.price) : "Sin definir"}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
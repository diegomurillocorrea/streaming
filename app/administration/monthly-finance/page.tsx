"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, TrendingDown, TrendingUp, Wallet } from "lucide-react"

import { useAdminPeriod } from "@/components/providers/admin-period-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import {
  firstDayFromHtmlMonth,
  isCompanyInFinancialScope,
  isPaymentRowConfirmed,
  monthBoundsFromHtmlMonth,
  parseCompanyMembershipCost,
} from "@/lib/monthly-finance"

interface CompanyRow {
  membership_monthly_cost?: number | null
  company_name?: string | null
}

interface AccountNested {
  id_account: number
  account_name?: string | null
  account_price_by_client?: number | null
  companies?: CompanyRow | CompanyRow[] | null
}

interface SubscriptionNested {
  id_account?: number | null
  period_in_months?: number | null
  accounts?: AccountNested | AccountNested[] | null
}

interface PaymentRow {
  amount?: number | null
  months_covered?: number | null
  id_subscription?: number | null
  subscriptions?: SubscriptionNested | SubscriptionNested[] | null
}

interface AccountListRow {
  id_account: number
  account_name?: string | null
  created_at?: string | null
  companies?: CompanyRow | CompanyRow[] | null
}

interface AccountMonthStats {
  idAccount: number
  accountName: string
  companyLabel: string
  membershipMonthlyCost: number
  collected: number
  expectedFromSlots: number
  paidCount: number
  pendingCount: number
  slotCount: number
}

const pickNested = <T,>(value: T | T[] | null | undefined): T | null => {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

const formatMoney = (n: number): string =>
  new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0)

export default function MonthlyFinancePage() {
  const { htmlMonth, monthLabel } = useAdminPeriod()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [totalCollected, setTotalCollected] = useState(0)
  const [totalMembershipCost, setTotalMembershipCost] = useState(0)
  const [accountsCreatedCount, setAccountsCreatedCount] = useState(0)
  const [paidClientsCount, setPaidClientsCount] = useState(0)
  const [pendingClientsCount, setPendingClientsCount] = useState(0)
  const [expectedIfAllPaid, setExpectedIfAllPaid] = useState(0)
  const [perAccountRows, setPerAccountRows] = useState<AccountMonthStats[]>([])

  const isLoadingUi = loading

  const netResult = totalCollected - totalMembershipCost

  const loadFinance = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    const bounds = monthBoundsFromHtmlMonth(htmlMonth)
    const paidMonthDay = firstDayFromHtmlMonth(htmlMonth)

    if (!bounds || !paidMonthDay) {
      setLoadError("Mes no válido")
      setLoading(false)
      return
    }

    const supabase = createClient()

    const [{ data: paymentRows, error: payError }, { data: accountRows, error: accError }] =
      await Promise.all([
        supabase
          .from("payments")
          .select(
            `
            amount,
            months_covered,
            id_subscription,
            subscriptions!inner (
              id_account,
              period_in_months,
              accounts (
                id_account,
                account_name,
                account_price_by_client,
                companies ( membership_monthly_cost, company_name )
              )
            )
          `
          )
          .eq("paid_month", paidMonthDay)
          .limit(10000),
        supabase
          .from("accounts")
          .select(
            `
            id_account,
            account_name,
            created_at,
            companies ( membership_monthly_cost, company_name )
          `
          )
          .order("id_account", { ascending: true })
          .limit(5000),
      ])

    if (payError) {
      console.error("[monthly-finance] payments", payError)
      setLoadError(payError.message ?? "No se pudieron cargar los pagos del mes")
      setLoading(false)
      return
    }

    if (accError) {
      console.error("[monthly-finance] accounts", accError)
      setLoadError(accError.message ?? "No se pudieron cargar las cuentas")
      setLoading(false)
      return
    }

    const payments = (paymentRows ?? []) as PaymentRow[]
    const allAccounts = (accountRows ?? []) as AccountListRow[]

    const existingAccounts = allAccounts.filter((row) => {
      if (!row.created_at) return true
      const created = new Date(row.created_at)
      return created <= bounds.end
    })

    const createdThisMonth = allAccounts.filter((row) => {
      if (!row.created_at) return false
      const created = new Date(row.created_at)
      const inMonth = created >= bounds.start && created <= bounds.end
      return inMonth && isCompanyInFinancialScope(row.companies)
    })

    const existingFinancialAccounts = existingAccounts.filter((row) =>
      isCompanyInFinancialScope(row.companies)
    )

    const statsByAccount = new Map<
      number,
      {
        collected: number
        expectedFromSlots: number
        paidCount: number
        pendingCount: number
        slotCount: number
      }
    >()

    const ensureAccountEntry = (idAccount: number) => {
      if (!statsByAccount.has(idAccount)) {
        statsByAccount.set(idAccount, {
          collected: 0,
          expectedFromSlots: 0,
          paidCount: 0,
          pendingCount: 0,
          slotCount: 0,
        })
      }
      return statsByAccount.get(idAccount)!
    }

    for (const acc of existingFinancialAccounts) {
      const id = acc.id_account
      if (!Number.isFinite(id)) continue
      ensureAccountEntry(id)
    }

    let sumCollected = 0
    let sumExpectedSlots = 0
    let sumPaid = 0
    let sumPending = 0

    for (const p of payments) {
      const sub = pickNested(p.subscriptions)
      if (!sub?.id_account) continue

      const idAccount = Number(sub.id_account)
      if (!Number.isFinite(idAccount)) continue

      const account = pickNested(sub.accounts)
      if (!account?.id_account) continue
      if (!isCompanyInFinancialScope(account.companies)) continue

      const priceRaw = account.account_price_by_client
      const priceNum =
        priceRaw !== null && priceRaw !== undefined ? Number(priceRaw) : null

      const amountNum =
        p.amount !== null && p.amount !== undefined ? Number(p.amount) : 0
      const safeAmount = Number.isNaN(amountNum) ? 0 : amountNum

      const entry = ensureAccountEntry(idAccount)
      entry.collected += safeAmount
      entry.slotCount += 1

      sumCollected += safeAmount

      if (priceNum !== null && !Number.isNaN(priceNum) && priceNum > 0) {
        entry.expectedFromSlots += priceNum
        sumExpectedSlots += priceNum
      }

      const confirmed = isPaymentRowConfirmed(
        p.amount,
        account.account_price_by_client,
        p.months_covered
      )
      if (confirmed) {
        entry.paidCount += 1
        sumPaid += 1
      } else {
        entry.pendingCount += 1
        sumPending += 1
      }
    }

    let membershipSum = 0
    const tableRows: AccountMonthStats[] = []

    for (const acc of existingFinancialAccounts) {
      const id = acc.id_account
      const membership = parseCompanyMembershipCost(acc.companies)
      membershipSum += membership

      const company = pickNested(acc.companies)
      const companyLabel =
        company?.company_name?.trim() ||
        "Sin empresa"

      const st = statsByAccount.get(id) ?? {
        collected: 0,
        expectedFromSlots: 0,
        paidCount: 0,
        pendingCount: 0,
        slotCount: 0,
      }

      tableRows.push({
        idAccount: id,
        accountName: acc.account_name?.trim() || `Cuenta ${id}`,
        companyLabel,
        membershipMonthlyCost: membership,
        collected: st.collected,
        expectedFromSlots: st.expectedFromSlots,
        paidCount: st.paidCount,
        pendingCount: st.pendingCount,
        slotCount: st.slotCount,
      })
    }

    const companyCollectedSum = new Map<string, number>()
    for (const row of tableRows) {
      companyCollectedSum.set(
        row.companyLabel,
        (companyCollectedSum.get(row.companyLabel) ?? 0) + row.collected
      )
    }

    tableRows.sort((a, b) => {
      const sumA = companyCollectedSum.get(a.companyLabel) ?? 0
      const sumB = companyCollectedSum.get(b.companyLabel) ?? 0
      if (sumB !== sumA) return sumB - sumA
      const byLabel = a.companyLabel.localeCompare(b.companyLabel, "es", {
        sensitivity: "base",
      })
      if (byLabel !== 0) return byLabel
      return b.collected - a.collected
    })

    setTotalCollected(sumCollected)
    setTotalMembershipCost(membershipSum)
    setAccountsCreatedCount(createdThisMonth.length)
    setPaidClientsCount(sumPaid)
    setPendingClientsCount(sumPending)
    setExpectedIfAllPaid(sumExpectedSlots)
    setPerAccountRows(tableRows)
    setLoading(false)
  }, [htmlMonth])

  useEffect(() => {
    // Datos remotos: el linter advierte por setState dentro de funciones async; aquí es el patrón habitual de carga.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga al montar y cuando cambia htmlMonth (período global)
    void loadFinance()
  }, [loadFinance])

  const handleRefresh = () => {
    void loadFinance()
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Wallet className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Finanzas del mes
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Ingresos por cobros registrados, costo de membresías y clientes
                pagados vs pendientes solo para empresas con costo de membresía
                configurado (servicios sin ese costo, p. ej. correo interno, no
                entran aquí).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="gap-2"
              aria-label="Actualizar datos del mes"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingUi ? "animate-spin" : ""}`}
                aria-hidden
              />
              Actualizar
            </Button>
          </div>
        </div>

        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {monthLabel}
        </p>
      </header>

      {loadError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      )}

      <section
        aria-labelledby="finance-kpis-heading"
        className="space-y-4"
        aria-busy={isLoadingUi}
        aria-live="polite"
      >
        <h2
          id="finance-kpis-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Resumen
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Cobrado (registrado)
              </CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums">
                {isLoadingUi ? (
                  <span className="inline-block h-9 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                ) : (
                  formatMoney(totalCollected)
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Costo membresías
              </CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                {isLoadingUi ? (
                  <span className="inline-block h-9 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                ) : (
                  formatMoney(totalMembershipCost)
                )}
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Suma del costo mensual solo en cuentas cuya empresa tiene costo
                de membresía al cierre del mes.
              </p>
            </CardHeader>
          </Card>

          <Card
            className={`border-zinc-200/80 shadow-sm dark:border-zinc-800 sm:col-span-2 lg:col-span-1 ${
              !isLoadingUi && netResult >= 0
                ? "ring-1 ring-emerald-200/80 dark:ring-emerald-900/50"
                : !isLoadingUi
                  ? "ring-1 ring-amber-200/80 dark:ring-amber-900/40"
                  : ""
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wide">
                  Resultado del mes
                </CardDescription>
                {!isLoadingUi &&
                  (netResult >= 0 ? (
                    <TrendingUp
                      className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                      aria-hidden
                    />
                  ) : (
                    <TrendingDown
                      className="h-4 w-4 text-amber-600 dark:text-amber-400"
                      aria-hidden
                    />
                  ))}
              </div>
              <CardTitle
                className={`text-2xl font-bold tabular-nums ${
                  !isLoadingUi && netResult >= 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : !isLoadingUi
                      ? "text-amber-800 dark:text-amber-200"
                      : ""
                }`}
              >
                {isLoadingUi ? (
                  <span className="inline-block h-9 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                ) : (
                  formatMoney(netResult)
                )}
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cobrado menos costo fijo de membresías (aprox. flujo del mes).
              </p>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Clientes pagados
              </CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {isLoadingUi ? (
                  <span className="inline-block h-9 w-12 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                ) : (
                  paidClientsCount.toLocaleString("es")
                )}
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cupos con pago completo (cuentas con empresa en alcance
                financiero).
              </p>
            </CardHeader>
          </Card>

          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Clientes pendientes
              </CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-amber-800 dark:text-amber-200">
                {isLoadingUi ? (
                  <span className="inline-block h-9 w-12 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                ) : (
                  pendingClientsCount.toLocaleString("es")
                )}
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Registros de mes con monto bajo el precio esperado (mismo
                alcance).
              </p>
            </CardHeader>
          </Card>

          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Si todos pagaran
              </CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums">
                {isLoadingUi ? (
                  <span className="inline-block h-9 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                ) : (
                  formatMoney(expectedIfAllPaid)
                )}
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Suma de precios al cliente en cupos con mes registrado (solo
                empresas con costo de membresía).
              </p>
            </CardHeader>
          </Card>

          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Cuentas nuevas
              </CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {isLoadingUi ? (
                  <span className="inline-block h-9 w-12 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                ) : (
                  accountsCreatedCount.toLocaleString("es")
                )}
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cuentas dadas de alta en este mes (solo empresas en alcance
                financiero).
              </p>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section aria-labelledby="per-account-heading" className="space-y-4">
        <div>
          <h2
            id="per-account-heading"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Por cuenta de streaming
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Solo cuentas de empresas con costo de membresía; agrupadas por
            empresa (bloques ordenados por cobrado total del mes de la empresa;
            dentro de cada bloque, por cobrado de la cuenta, incluye 0 cobrado).
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Cuenta
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Empresa
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Cobrado
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Costo memb.
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Resultado
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Pagados
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Pendientes
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Cupos (mes)
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingUi ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Cargando…
                  </td>
                </tr>
              ) : perAccountRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No hay cuentas en alcance financiero (empresa sin costo de
                    membresía no aparece aquí).
                  </td>
                </tr>
              ) : (
                perAccountRows.map((row) => {
                  const rowNet = row.collected - row.membershipMonthlyCost
                  return (
                    <tr
                      key={row.idAccount}
                      className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                        {row.accountName}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {row.companyLabel}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(row.collected)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                        {formatMoney(row.membershipMonthlyCost)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-medium ${
                          rowNet >= 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        {formatMoney(rowNet)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.paidCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.pendingCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                        {row.slotCount}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

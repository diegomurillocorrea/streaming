"use client"

import { useMemo } from "react"

import { AccountSubscriptionsTable } from "@/components/admin/account-subscriptions-table"
import { useAdminPeriod } from "@/components/providers/admin-period-provider"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  buildSubscriptionTableRows,
  type SubscriptionPayloadRow,
} from "@/lib/build-subscription-table-rows"
import { monthKeyFromHtmlMonth } from "@/lib/subscription-dates"

type BankAccountOption = {
  id_bank_account: number
  bank_name: string
}

type ClientOption = {
  id_client: number
  name: string
  lastName: string
  email: string | null
  phoneNumber: string | null
}

type AccountSubscriptionsPanelProps = {
  accountId: number
  maxClients: number
  subscriptionsPayload: SubscriptionPayloadRow[]
  clientsList: ClientOption[]
  bankAccounts: BankAccountOption[]
  accountPrice: number | null
  pinIncluded: boolean
}

export const AccountSubscriptionsPanel = ({
  accountId,
  maxClients,
  subscriptionsPayload,
  clientsList,
  bankAccounts,
  accountPrice,
  pinIncluded,
}: AccountSubscriptionsPanelProps) => {
  const { htmlMonth, monthLabel } = useAdminPeriod()

  const selectedMonthKey = useMemo(
    () => monthKeyFromHtmlMonth(htmlMonth),
    [htmlMonth]
  )

  const { rows, confirmedCount, registeredCount, pendingCount } = useMemo(
    () =>
      buildSubscriptionTableRows(
        subscriptionsPayload,
        selectedMonthKey,
        accountPrice
      ),
    [subscriptionsPayload, selectedMonthKey, accountPrice]
  )

  const subscriptionCount = subscriptionsPayload.length
  const emptySlots = Math.max(maxClients - subscriptionCount, 0)

  return (
    <>
      <div
        role="status"
        className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="font-semibold">Viendo {monthLabel}</p>
        <p className="mt-1 text-emerald-900/90 dark:text-emerald-200">
          El período restante y el estado se calculan por cobertura prepaga. Cambia
          el Periodo en el menú lateral para revisar otro mes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Cupos usados
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {subscriptionCount}/{maxClients}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Confirmados
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Monto + comprobante
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {confirmedCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Sin comprobante
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Monto registrado
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-700 dark:text-sky-300">
            {registeredCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Pendientes
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Cupos libres
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {emptySlots}
          </p>
        </div>
      </div>

      <Card className="border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base">Clientes y control de pagos</CardTitle>
          <CardDescription>
            Registra un pago único con monto, banco, fecha y comprobante. Si
            cubres varios meses, el período restante baja al cambiar el Periodo
            (ej. 2 en junio → 1 en julio). Sin cobertura, el cliente queda
            pendiente para desvincular. Eliminar una suscripción también elimina
            sus pagos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountSubscriptionsTable
            accountId={accountId}
            paidMonthHtml={htmlMonth}
            rows={rows}
            emptySlots={emptySlots}
            maxClients={maxClients}
            subscriptionCount={subscriptionCount}
            clientsList={clientsList}
            bankAccounts={bankAccounts}
            accountPrice={accountPrice}
            pinIncluded={pinIncluded}
          />
        </CardContent>
      </Card>
    </>
  )
}

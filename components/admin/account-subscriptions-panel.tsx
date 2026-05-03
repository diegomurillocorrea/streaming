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
  subscriptionsPayload: SubscriptionPayloadRow[]
  clientsList: ClientOption[]
  linkedClientIds: number[]
  bankAccounts: BankAccountOption[]
  accountPrice: number | null
  pinIncluded: boolean
}

const MAX_SLOTS = 5

export const AccountSubscriptionsPanel = ({
  accountId,
  subscriptionsPayload,
  clientsList,
  linkedClientIds,
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

  const emptySlots = Math.max(MAX_SLOTS - subscriptionsPayload.length, 0)

  return (
    <>
      <div
        role="status"
        className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="font-semibold">Pagos por período activo</p>
        <p className="mt-1 text-emerald-900/90 dark:text-emerald-200">
          Estás viendo y editando{" "}
          <span className="font-medium">{monthLabel}</span> (pestaña &quot;Periodo&quot;
          en el menú lateral, encima de tu usuario). Si cerraste mes y las fechas de servicio
          avanzaron, aquí sigues pudiendo registrar o revisar abril u otro mes
          histórico eligiendo mes y año en el modal de Periodo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-zinc-500 dark:text-emerald-400">
            Cupos usados
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-emerald-50">
            {subscriptionsPayload.length}/{MAX_SLOTS}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-zinc-500 dark:text-emerald-400">
            Confirmados ({monthLabel})
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-emerald-500">
            Monto + referencia
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {confirmedCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-zinc-500 dark:text-emerald-400">
            Solo monto ({monthLabel})
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-emerald-500">
            Falta ref. o archivo
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-700 dark:text-sky-300">
            {registeredCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-zinc-500 dark:text-emerald-400">
            Pendientes ({monthLabel})
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
            {pinIncluded ? ", PIN" : ""}, período y pagos por fila. El monto y la
            referencia se guardan para{" "}
            <span className="font-medium">{monthLabel}</span>. Para considerar un
            pago{" "}
            <strong className="font-semibold text-zinc-800 dark:text-emerald-100">
              confirmado
            </strong>{" "}
            hace falta el monto del mes y una{" "}
            <strong className="font-semibold text-zinc-800 dark:text-emerald-100">
              referencia de transferencia
            </strong>
            . Eliminar una suscripción también elimina sus pagos asociados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountSubscriptionsTable
            accountId={accountId}
            paidMonthHtml={htmlMonth}
            rows={rows}
            emptySlots={emptySlots}
            clientsList={clientsList}
            linkedClientIds={linkedClientIds}
            bankAccounts={bankAccounts}
            accountPrice={accountPrice}
            pinIncluded={pinIncluded}
          />
        </CardContent>
      </Card>
    </>
  )
}

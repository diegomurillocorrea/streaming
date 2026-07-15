"use client"

import { useMemo, useState } from "react"

import { AddClientButton } from "@/components/interface/AddClientButton"
import { SubscriptionRow } from "@/components/interface/SubscriptionRow"
import type { SubscriptionTableRow } from "@/components/admin/subscription-table-types"
import { TableSearchInput } from "@/components/admin/table-search-input"
import { firstDayFromHtmlMonth } from "@/lib/monthly-finance"
import { firstDayOfCurrentMonthLocal } from "@/lib/subscription-dates"
import { rowMatchesSearch } from "@/lib/table-search"

export type {
  SubscriptionPaymentBadgeStatus,
  SubscriptionTableRow,
} from "@/components/admin/subscription-table-types"

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

type AccountSubscriptionsTableProps = {
  accountId: number
  /** Período global `YYYY-MM`: define qué `paid_month` se edita al guardar. */
  paidMonthHtml: string
  rows: SubscriptionTableRow[]
  emptySlots: number
  maxClients: number
  subscriptionCount: number
  clientsList: ClientOption[]
  bankAccounts: BankAccountOption[]
  accountPrice: number | null
  /** Viene de `accounts.pin_included`: mostrar columna PIN */
  pinIncluded: boolean
}

export function AccountSubscriptionsTable({
  accountId,
  paidMonthHtml,
  rows,
  emptySlots,
  maxClients,
  subscriptionCount,
  clientsList,
  bankAccounts,
  accountPrice,
  pinIncluded,
}: AccountSubscriptionsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const paidMonthFirstDay =
    firstDayFromHtmlMonth(paidMonthHtml) || firstDayOfCurrentMonthLocal()

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    return rows.filter((row) =>
      rowMatchesSearch(
        [
          `${row.firstName} ${row.lastName}`.trim(),
          row.user,
          row.pin,
          row.phone,
          row.email,
          row.status,
          row.lastPaymentBank,
          row.lastPaymentAmount != null ? String(row.lastPaymentAmount) : "",
        ],
        searchQuery
      )
    )
  }, [rows, searchQuery])

  const showEmptySlots = !searchQuery.trim() && emptySlots > 0

  return (
    <div className="w-full min-w-0 space-y-4">
      <TableSearchInput
        id="subscriptions-table-search"
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por nombre, usuario, teléfono, estado, banco…"
        aria-label="Buscar en las suscripciones"
      />

      <ul className="flex flex-col gap-4" role="list">
        {filteredRows.map((row, index) => (
          <li key={row.id_subscription}>
            <SubscriptionRow
              index={index}
              accountId={accountId}
              paidMonthFirstDay={paidMonthFirstDay}
              row={row}
              bankAccounts={bankAccounts ?? []}
              accountPrice={accountPrice}
              showPinColumn={pinIncluded}
              layout="card"
            />
          </li>
        ))}
      </ul>

      {showEmptySlots ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            {emptySlots === 1
              ? "Hay 1 cupo libre en esta cuenta."
              : `Hay ${emptySlots} cupos libres en esta cuenta.`}
          </p>
          <AddClientButton
            accountId={accountId}
            clients={clientsList ?? []}
            maxClients={maxClients}
            currentCount={subscriptionCount}
          />
        </div>
      ) : null}

      {!showEmptySlots && searchQuery.trim() && filteredRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No hay resultados para &quot;{searchQuery.trim()}&quot;.
        </p>
      ) : null}
    </div>
  )
}

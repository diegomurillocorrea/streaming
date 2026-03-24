"use client"

import { useMemo, useState } from "react"

import { AddClientButton } from "@/components/interface/AddClientButton"
import { SubscriptionRow } from "@/components/interface/SubscriptionRow"
import { TableScrollArea } from "@/components/admin/table-scroll-area"
import { TableSearchInput } from "@/components/admin/table-search-input"
import { rowMatchesSearch } from "@/lib/table-search"

export type SubscriptionTableRow = {
  id_subscription: number
  user: string
  pin: string
  firstName: string
  lastName: string
  email: string
  phone: string
  serviceStartRaw: string | null
  periodInMonths: number | null
  monthsPaid: number
  lastPaidMonth: string | null
  lastPaymentDate: string | null
  lastPaymentAmount: number | null
  lastPaymentBank: string | null
  lastPaymentBankId: number | null
  lastPaymentId: number | null
  status: string
}

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
  rows: SubscriptionTableRow[]
  emptySlots: number
  clientsList: ClientOption[]
  bankAccounts: BankAccountOption[]
  accountPrice: number | null
}

export function AccountSubscriptionsTable({
  accountId,
  rows,
  emptySlots,
  clientsList,
  bankAccounts,
  accountPrice,
}: AccountSubscriptionsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    return rows.filter((row) =>
      rowMatchesSearch(
        [
          row.firstName,
          row.lastName,
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
    <div className="w-full min-w-0 space-y-3">
      <TableSearchInput
        id="subscriptions-table-search"
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por nombre, usuario, teléfono, estado, banco…"
        aria-label="Buscar en la tabla de suscripciones"
      />
      <TableScrollArea>
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
            <tr className="text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-200">
              <th className="py-3.5 px-4">No. cliente</th>
              <th className="py-3.5 px-4">Nombre</th>
              <th className="py-3.5 px-4">Apellido</th>
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">PIN</th>
              <th className="py-3.5 px-4">Teléfono</th>
              <th className="py-3.5 px-4">Inicio de servicio</th>
              <th className="py-3.5 px-4 text-center">Período en meses</th>
              <th className="py-3.5 px-4">Próximo pago</th>
              <th className="py-3.5 px-4">Método de pago</th>
              <th className="py-3.5 px-4">Pago</th>
              <th className="py-3.5 px-4 text-center">Estado de pago</th>
              <th className="py-3.5 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <SubscriptionRow
                key={row.id_subscription}
                index={index}
                row={row}
                bankAccounts={bankAccounts ?? []}
                accountPrice={accountPrice}
              />
            ))}
            {showEmptySlots &&
              Array.from({ length: emptySlots }).map((_, index) => (
                <tr
                  key={`empty-${index}`}
                  className="border-b border-zinc-100 text-zinc-900 last:border-b-0 dark:border-emerald-900/60 dark:text-emerald-50"
                >
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">
                    <AddClientButton
                      accountId={accountId}
                      clients={clientsList ?? []}
                    />
                  </td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-center text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-center text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-center text-xs">-</td>
                </tr>
              ))}
            {!showEmptySlots && searchQuery.trim() && filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={13}
                  className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                >
                  No hay resultados para &quot;{searchQuery.trim()}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScrollArea>
    </div>
  )
}

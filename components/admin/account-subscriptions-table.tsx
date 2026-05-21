"use client"

import { useMemo, useState } from "react"

import { AddClientButton } from "@/components/interface/AddClientButton"
import { SubscriptionRow } from "@/components/interface/SubscriptionRow"
import { TableScrollArea } from "@/components/admin/table-scroll-area"
import { TableSearchInput } from "@/components/admin/table-search-input"
import { firstDayFromHtmlMonth } from "@/lib/monthly-finance"
import { firstDayOfCurrentMonthLocal } from "@/lib/subscription-dates"
import { rowMatchesSearch } from "@/lib/table-search"

export type SubscriptionPaymentBadgeStatus =
  | "CONFIRMADO"
  | "REGISTRADO"
  | "PENDIENTE"
  /** El período activo es anterior al mes calendario de `service_start_date`. */
  | "NO_APLICA"

export type SubscriptionTableRow = {
  id_subscription: number
  /** Para enlazar a Clientes y abrir el modal de edición */
  id_client: number | null
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
  lastPaymentReference: string | null
  lastPaymentReceiptPath: string | null
  /** `subscriptions.created_at` — mes en que el cliente se vinculó a la cuenta */
  subscriptionCreatedAt: string | null
  status: SubscriptionPaymentBadgeStatus
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

  const columnCount = pinIncluded ? 12 : 11

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
          row.lastPaymentReference ?? "",
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
        <table className="w-full border-collapse text-left text-sm min-w-[max(100%,max-content)]">
          <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
            <tr className="text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-200">
              <th className="w-8 min-w-8 max-w-8 px-2 py-3.5 text-center">#</th>
              <th className="min-w-[10rem] max-w-[16rem] px-2 py-3.5">
                Nombre
              </th>
              <th className="w-[6.5rem] min-w-[6.5rem] max-w-[6.5rem] px-2 py-3.5">User</th>
              {pinIncluded && (
                <th className="py-3.5 px-4">PIN</th>
              )}
              <th className="py-3.5 px-4">Teléfono</th>
              <th
                className="py-3.5 px-4"
                title="Mes calendario en que se agregó el cliente a esta cuenta (alta de la suscripción)."
              >
                Inicio de servicio
              </th>
              <th className="py-3.5 px-4 text-center">Período en meses</th>
              <th
                className="py-3.5 px-4"
                title="Inicio de servicio + período en meses (mismo día del mes cuando el calendario lo permite). Igual que la columna Fecha de pago en Cobros pendientes del panel."
              >
                Fecha de pago
              </th>
              <th className="py-3.5 px-4">Método de pago</th>
              <th className="min-w-[11rem] max-w-[18rem] px-2 py-3.5">Pago</th>
              <th className="py-3.5 px-4 text-center">Estado de pago</th>
              <th className="py-3.5 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <SubscriptionRow
                key={row.id_subscription}
                index={index}
                accountId={accountId}
                paidMonthFirstDay={paidMonthFirstDay}
                row={row}
                bankAccounts={bankAccounts ?? []}
                accountPrice={accountPrice}
                showPinColumn={pinIncluded}
              />
            ))}
            {showEmptySlots &&
              Array.from({ length: emptySlots }).map((_, index) => (
                <tr
                  key={`empty-${index}`}
                  className="border-b border-zinc-100 text-zinc-900 last:border-b-0 dark:border-emerald-900/60 dark:text-emerald-50"
                >
                  <td className="w-8 min-w-8 max-w-8 px-2 py-3.5 align-top text-center text-xs">
                    -
                  </td>
                  <td className="min-w-[10rem] max-w-[16rem] px-2 py-3.5 align-top text-xs">
                    <AddClientButton
                      accountId={accountId}
                      clients={clientsList ?? []}
                      maxClients={maxClients}
                      currentCount={subscriptionCount}
                    />
                  </td>
                  <td className="w-[6.5rem] min-w-[6.5rem] max-w-[6.5rem] px-2 py-3.5 align-top text-xs">
                    -
                  </td>
                  {pinIncluded && (
                    <td className="py-3.5 px-4 align-top text-xs">-</td>
                  )}
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-center text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-xs">-</td>
                  <td className="min-w-[11rem] max-w-[18rem] px-2 py-3.5 align-top text-xs">
                    -
                  </td>
                  <td className="py-3.5 px-4 align-top text-center text-xs">-</td>
                  <td className="py-3.5 px-4 align-top text-center text-xs">-</td>
                </tr>
              ))}
            {!showEmptySlots && searchQuery.trim() && filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={columnCount}
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

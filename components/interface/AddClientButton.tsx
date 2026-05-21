"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { accountAtMaxClientsMessage } from "@/lib/account-max-clients"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ClientSearchCombobox } from "@/components/interface/client-search-combobox"

type ClientOption = {
  id_client: number
  name: string
  lastName: string
  email: string | null
  phoneNumber: string | null
}

type AddClientButtonProps = {
  accountId: number
  clients: ClientOption[]
  maxClients: number
  currentCount: number
}

export function AddClientButton({
  accountId,
  clients,
  maxClients,
  currentCount,
}: AddClientButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState("")
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const supabase = createBrowserClient()
  const router = useRouter()

  const clientOptions = clients ?? []
  const hasClients = clientOptions.length > 0
  const atCapacity = currentCount >= maxClients

  const handleOpenChange = (next: boolean) => {
    if (atCapacity && next) return
    setOpen(next)
    if (!next) {
      setSelectedClientId("")
      setSaveError(null)
    }
  }

  const handleCreate = async () => {
    const idNum = selectedClientId ? Number(selectedClientId) : NaN
    if (!selectedClientId || Number.isNaN(idNum) || !accountId) return

    setLoading(true)
    setSaveError(null)

    const { count, error: countError } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("id_account", accountId)

    if (countError) {
      setLoading(false)
      console.error(countError)
      setSaveError(countError.message || "No se pudo verificar los cupos de la cuenta")
      return
    }

    const liveCount = count ?? currentCount
    if (liveCount >= maxClients) {
      setLoading(false)
      setSaveError(accountAtMaxClientsMessage(maxClients, liveCount))
      return
    }

    const today = new Date().toISOString().slice(0, 10)

    const { error } = await supabase.from("subscriptions").insert({
      id_account: accountId,
      id_client: idNum,
      service_start_date: today,
      subscription_started_at: today,
      period_in_months: 1,
      service_end_date: null,
    })

    setLoading(false)

    if (error) {
      console.error(error)
      setSaveError(error.message || "Error al crear la suscripción")
      return
    }

    setOpen(false)
    setSelectedClientId("")
    router.refresh()
  }

  const capacityTitle = atCapacity
    ? `Esta cuenta ya tiene ${currentCount} de ${maxClients} cupos ocupados`
    : undefined

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="cursor-pointer border-zinc-300 text-xs hover:bg-zinc-50 dark:border-emerald-400/60"
        onClick={() => handleOpenChange(true)}
        disabled={!hasClients || atCapacity}
        title={
          capacityTitle ??
          (!hasClients ? "No hay clientes registrados en el catálogo" : undefined)
        }
      >
        Agregar cliente
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-50">
          <DialogHeader>
            <DialogTitle className="text-base">
              Agregar cliente a esta cuenta
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-600 dark:text-emerald-300">
              Busca por nombre, apellido, teléfono o correo, o elige un cliente de la lista.
              Puedes vincular el mismo cliente más de una vez. Máximo {maxClients}{" "}
              suscripción{maxClients === 1 ? "" : "es"} por cuenta ({currentCount}/
              {maxClients} en uso).
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Label htmlFor="add-client-combobox" className="text-xs">
              Elegir cliente
            </Label>
            {!hasClients ? (
              <p
                className="rounded-md border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-emerald-800 dark:text-emerald-300"
                role="status"
              >
                No hay clientes registrados. Crea clientes en Administración → Clientes.
              </p>
            ) : (
              <ClientSearchCombobox
                id="add-client-combobox"
                dialogOpen={open}
                clients={clientOptions}
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                disabled={loading}
                placeholder="Busca o selecciona un cliente…"
              />
            )}
            {saveError && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {saveError}
              </p>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={loading || !selectedClientId || !hasClients || atCapacity}
            >
              {loading ? "Guardando…" : "Agregar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

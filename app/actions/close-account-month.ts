"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

const rpcErrorLabels: Record<string, string> = {
  not_authenticated: "Inicia sesión para continuar",
  invalid_account_id: "La cuenta no es válida",
}

export type CloseAccountMonthResult =
  | { ok: true; subscriptionsProcessed: number }
  | { ok: false; error: string }

type CloseMonthRpcPayload = {
  ok?: boolean
  error?: string
  subscriptions_processed?: number
}

export async function closeAccountMonthAction(
  accountId: number
): Promise<CloseAccountMonthResult> {
  if (!Number.isFinite(accountId) || accountId <= 0) {
    return { ok: false, error: rpcErrorLabels.invalid_account_id }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: rpcErrorLabels.not_authenticated }
  }

  const { data, error } = await supabase.rpc("close_account_month", {
    p_account_id: accountId,
  })

  if (error) {
    return {
      ok: false,
      error: error.message ?? "No se pudo cerrar el mes",
    }
  }

  const payload = data as CloseMonthRpcPayload | null

  if (!payload || payload.ok === false) {
    const raw = payload?.error ?? ""
    const mapped = raw ? rpcErrorLabels[raw] : undefined
    if (mapped) {
      return { ok: false, error: mapped }
    }
    if (raw) {
      return { ok: false, error: raw }
    }
    return { ok: false, error: "No se pudo cerrar el mes" }
  }

  revalidatePath(`/administration/subscriptions/${accountId}`)
  revalidatePath("/administration/accounts")

  return {
    ok: true,
    subscriptionsProcessed: payload.subscriptions_processed ?? 0,
  }
}

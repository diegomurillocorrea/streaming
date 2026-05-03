import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import {
  filterShareableBankRows,
  type BankAccountShareRow,
} from "@/lib/bank-accounts-share"

export const dynamic = "force-dynamic"

/**
 * Datos para `/administration/bank-accounts/share` sin sesión.
 *
 * - Si existe `SUPABASE_SERVICE_ROLE_KEY`, la lectura ignora RLS (misma intención que compartir la URL).
 * - Si no, se usa la clave anónima publicada: hace falta política RLS `anon` SELECT (ver `sql/bank_accounts_anon_select_for_share_page.sql`).
 */
export const GET = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json(
      { error: "Falta configuración de Supabase en el servidor." },
      { status: 500 }
    )
  }

  const key = serviceRoleKey?.trim() ? serviceRoleKey : publishableKey
  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id_bank_account, account_name, account_number, bank_name")
    .not("account_number", "is", null)
    .neq("account_number", "")
    .order("bank_name", { ascending: true })

  if (error) {
    console.error("[bank-accounts-share]", error)
    return NextResponse.json(
      {
        error:
          error.message ||
          "No se pudieron cargar las cuentas. Revisa RLS para `anon` o define SUPABASE_SERVICE_ROLE_KEY en el servidor.",
      },
      { status: 502 }
    )
  }

  const accounts = filterShareableBankRows((data as BankAccountShareRow[]) ?? [])

  return NextResponse.json({ accounts })
}

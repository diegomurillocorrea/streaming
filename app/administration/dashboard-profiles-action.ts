"use server"

import { createClient } from "@/utils/supabase/server"

const DASHBOARD_PROFILES_SELECT = `
  id_subscription,
  id_account,
  user,
  pin,
  accounts (
    id_account,
    account_name,
    pin_included
  ),
  clients (
    name,
    lastName,
    phoneNumber
  )
`

export async function fetchDashboardAllProfiles(): Promise<{
  data: unknown[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("subscriptions")
    .select(DASHBOARD_PROFILES_SELECT)
    .order("id_subscription", { ascending: true })
    .limit(5000)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data ?? [], error: null }
}

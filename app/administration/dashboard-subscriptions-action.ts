"use server"

import { createClient } from "@/utils/supabase/server"

const DASHBOARD_SUBSCRIPTIONS_SELECT = `
  id_subscription,
  id_account,
  service_start_date,
  period_in_months,
  accounts (
    id_account,
    account_name,
    account_price_by_client,
    payment_date,
    companies ( membership_monthly_cost )
  ),
  clients (
    name,
    lastName,
    phoneNumber,
    email
  ),
  payments (
    amount,
    paid_month,
    payment_reference,
    receipt_storage_path
  )
`

export async function fetchDashboardPendingSubscriptions(): Promise<{
  data: unknown[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("subscriptions")
    .select(DASHBOARD_SUBSCRIPTIONS_SELECT)
    .order("id_subscription", { ascending: true })
    .limit(5000)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data ?? [], error: null }
}

import { redirect } from "next/navigation"

interface LegacySubscriptionsRedirectProps {
  params: Promise<{ id: string }>
}

export default async function LegacySubscriptionsRedirect({
  params,
}: LegacySubscriptionsRedirectProps) {
  const { id } = await params
  redirect(`/administration/subscriptions/${id}`)
}

import { createClient as createServerClient } from "@/utils/supabase/server";
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LuMail,
  LuUsers,
  LuWallet,
  LuSettings,
  LuBuilding2,
  LuCreditCard,
  LuMonitorPlay,
  LuLayoutDashboard,
} from "react-icons/lu";
import Link from "next/link";
import LogoutButton from "@/components/interface/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { count: customersCount },
    { data: accountsData },
    { data: pendingPaymentsRows },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("accounts")
      .select(
        `
        id_account,
        account_name,
        payment_date,
        created_at,
        companies ( company_name ),
        emails ( email_address )
      `
      )
      .order("created_at", { ascending: false }),
    supabase.from("payments").select("amount,status").eq("status", "pending"),
  ]);

  // Todas las cuentas que NO son Gmail
  const filteredAccounts =
    accountsData?.filter((acc) => {
      const companyName = acc.companies?.company_name;
      if (!companyName) return false;
      return companyName.toLowerCase() !== "gmail";
    }) ?? [];

  // Active subscriptions = solo cuentas no Gmail
  const subscriptionsCount = filteredAccounts.length;

  const pendingAmountTotal =
    pendingPaymentsRows?.reduce(
      (acc, p) => acc + (p.amount ?? 0),
      0
    ) ?? 0;

  const formattedPendingTotal = `$${pendingAmountTotal.toFixed(2)}`;

  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Streaming Murillo
            </p>
            <h1 className="mt-1 text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-emerald-400">
              Welcome back{user ? `, ${user.email}` : ""}.
              Manage your streaming accounts and subscriptions here.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-emerald-400/60 cursor-pointer"
            >
              <LuSettings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <LogoutButton />
          </div>
        </header>

        {/* Stats cards */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Active customers */}
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active customers
              </CardTitle>
              <LuUsers className="h-4 w-4 text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customersCount ?? 0}
              </div>
              <p className="mt-1 text-xs text-emerald-400">
                Total registered customers in your system.
              </p>
            </CardContent>
          </Card>

          {/* Active subscriptions (sin Gmail) */}
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active subscriptions
              </CardTitle>
              <LuMonitorPlay className="h-4 w-4 text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptionsCount}
              </div>
              <p className="mt-1 text-xs text-emerald-400">
                Streaming accounts you are currently managing (excluding Gmail logins).
              </p>
            </CardContent>
          </Card>

          {/* Pending payments */}
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending payments
              </CardTitle>
              <LuCreditCard className="h-4 w-4 text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formattedPendingTotal}
              </div>
              <p className="mt-1 text-xs text-emerald-400">
                Total amount due from all customers.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Main content */}
        <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
          {/* Accounts list (solo no Gmail) */}
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader>
              <CardTitle className="text-base">Accounts</CardTitle>
              <CardDescription>
                All streaming accounts. Click one to manage its
                clients and payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAccounts.length > 0 ? (
                <ul className="space-y-4">
                  {filteredAccounts.map((account) => (
                    <li
                      key={account.id_account}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <div>
                        <p className="font-medium text-emerald-50">
                          {account.account_name}
                        </p>
                        <p className="text-xs text-emerald-400">
                          {account.companies?.company_name ??
                            "Unknown company"}
                          {" • "}
                          {account.emails?.email_address ?? "No email"}
                        </p>
                        {account.payment_date && (
                          <p className="mt-1 text-[11px] text-emerald-400">
                            Payment day:{" "}
                            {new Intl.DateTimeFormat("en-US", {
                              month: "short",
                              day: "2-digit",
                            }).format(new Date(account.payment_date))}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/subscriptions/${account.id_account}`}
                        className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline"
                      >
                        View clients & payments
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-400">
                  No non-Gmail accounts yet. Once you add accounts, they will
                  appear here.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>
                Common actions to manage your streaming business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Button
                  asChild
                  variant="outline"
                  className="justify-start border-emerald-400/60 cursor-pointer"
                >
                  <Link
                    href="/administration"
                    className="flex w-full items-center"
                  >
                    <LuLayoutDashboard className="mr-2 h-4 w-4" />
                    Overview
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start border-emerald-400/60 cursor-pointer"
                >
                  <Link
                    href="/administration/emails"
                    className="flex w-full items-center"
                  >
                    <LuMail className="mr-2 h-4 w-4" />
                    Emails
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start border-emerald-400/60 cursor-pointer"
                >
                  <Link
                    href="/administration/companies"
                    className="flex w-full items-center"
                  >
                    <LuBuilding2 className="mr-2 h-4 w-4" />
                    Companies
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start border-emerald-400/60 cursor-pointer"
                >
                  <Link
                    href="/administration/cards"
                    className="flex w-full items-center"
                  >
                    <LuCreditCard className="mr-2 h-4 w-4" />
                    Cards
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start border-emerald-400/60 cursor-pointer"
                >
                  <Link
                    href="/administration/clients"
                    className="flex w-full items-center"
                  >
                    <LuUsers className="mr-2 h-4 w-4" />
                    Clients
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start border-emerald-400/60 cursor-pointer"
                >
                  <Link
                    href="/administration/bank-accounts"
                    className="flex w-full items-center"
                  >
                    <LuWallet className="mr-2 h-4 w-4" />
                    Bank accounts
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start border-emerald-400/60 cursor-pointer"
                >
                  <Link
                    href="/administration/accounts"
                    className="flex w-full items-center"
                  >
                    <LuMonitorPlay className="mr-2 h-4 w-4" />
                    Accounts
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
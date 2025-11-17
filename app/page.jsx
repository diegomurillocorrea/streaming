import { createClient as createServerClient } from "@/utils/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LuMail,
  LuBuilding2,
  LuWallet,
  LuUsers,
  LuMonitorPlay,
  LuCreditCard,
  LuSettings,
} from "react-icons/lu";
import Link from "next/link";
import LogoutButton from "@/components/interface/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
            <Button variant="outline" className="border-emerald-400/60 cursor-pointer">
              <LuSettings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <LogoutButton />
          </div>
        </header>

        {/* Stats cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active customers
              </CardTitle>
              <LuUsers className="h-4 w-4 text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="mt-1 text-xs text-emerald-400">
                Start by adding your first customer.
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active subscriptions
              </CardTitle>
              <LuMonitorPlay className="h-4 w-4 text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="mt-1 text-xs text-emerald-400">
                Link Netflix, Disney+, and more.
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending payments
              </CardTitle>
              <LuCreditCard className="h-4 w-4 text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="mt-1 text-xs text-emerald-400">
                All payments are up to date.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Main content */}
        <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
          {/* Recent activity */}
          <Card className="border-emerald-800 bg-emerald-900">
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>
                The latest changes across your customers and subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-400">
                No activity yet. Once you start adding customers and
                subscriptions, you will see a timeline here.
              </p>
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
                  <Link href="/administration/emails" className="flex w-full items-center">
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
                  <Link href="/administration/cards" className="flex w-full items-center">
                    <LuCreditCard className="mr-2 h-4 w-4" />
                    Cards
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start border-emerald-400/60 cursor-pointer"
                >
                  <Link href="/administration/clients" className="flex w-full items-center">
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
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
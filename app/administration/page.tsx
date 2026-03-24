"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  Building2,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Mail,
  Radio,
  RefreshCw,
  Users,
  Wallet,
  Link2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface DashboardStats {
  accounts: number
  clients: number
  companies: number
  cards: number
  emails: number
  bankAccounts: number
  subscriptions: number
  payments: number
}

const EMPTY_STATS: DashboardStats = {
  accounts: 0,
  clients: 0,
  companies: 0,
  cards: 0,
  emails: 0,
  bankAccounts: 0,
  subscriptions: 0,
  payments: 0,
}

const QUICK_LINKS: {
  href: string
  label: string
  description: string
  icon: typeof Radio
}[] = [
  {
    href: "/administration/accounts",
    label: "Cuentas",
    description: "Cuentas de streaming y precios",
    icon: Radio,
  },
  {
    href: "/administration/clients",
    label: "Clientes",
    description: "Personas y suscripciones",
    icon: Users,
  },
  {
    href: "/administration/companies",
    label: "Empresas",
    description: "Empresas asociadas",
    icon: Building2,
  },
  {
    href: "/administration/cards",
    label: "Tarjetas",
    description: "Tarjetas y redes de pago",
    icon: CreditCard,
  },
  {
    href: "/administration/emails",
    label: "Correos",
    description: "Correos vinculados a cuentas",
    icon: Mail,
  },
  {
    href: "/administration/bank-accounts",
    label: "Cuentas bancarias",
    description: "Cuentas donde recibes pagos",
    icon: Landmark,
  },
]

const STAT_CONFIG: {
  key: keyof DashboardStats
  label: string
  icon: typeof Radio
}[] = [
  { key: "accounts", label: "Cuentas de streaming", icon: Radio },
  { key: "clients", label: "Clientes", icon: Users },
  { key: "subscriptions", label: "Suscripciones activas", icon: Link2 },
  { key: "payments", label: "Registros de pago", icon: Wallet },
  { key: "companies", label: "Empresas", icon: Building2 },
  { key: "cards", label: "Tarjetas", icon: CreditCard },
  { key: "emails", label: "Correos", icon: Mail },
  { key: "bankAccounts", label: "Cuentas bancarias", icon: Landmark },
]

export default function AdministrationDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const supabase = createClient()

    const countTable = async (table: string) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })

      if (error) {
        console.error(`[dashboard] count ${table}`, error)
        return 0
      }

      return count ?? 0
    }

    try {
      const [
        accounts,
        clients,
        companies,
        cards,
        emails,
        bankAccounts,
        subscriptions,
        payments,
      ] = await Promise.all([
        countTable("accounts"),
        countTable("clients"),
        countTable("companies"),
        countTable("cards"),
        countTable("emails"),
        countTable("bank_accounts"),
        countTable("subscriptions"),
        countTable("payments"),
      ])

      setStats({
        accounts,
        clients,
        companies,
        cards,
        emails,
        bankAccounts,
        subscriptions,
        payments,
      })
    } catch (e) {
      console.error("[dashboard] loadStats", e)
      setLoadError("No se pudieron cargar las métricas. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  return (
    <div className="mx-auto flex flex-col gap-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <LayoutDashboard className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Resumen de tu operación y accesos rápidos a la administración.
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="metrics-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="metrics-heading"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Métricas
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Totales en base de datos (se actualizan al cargar la página).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadStats()}
            disabled={loading}
            className="gap-2"
            aria-label="Actualizar métricas"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            Actualizar
          </Button>
        </div>

        {loadError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {loadError}
          </p>
        )}

        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-busy={loading}
          aria-live="polite"
        >
          {STAT_CONFIG.map(({ key, label, icon: Icon }) => (
            <Card
              key={key}
              className="border-zinc-200/80 shadow-sm dark:border-zinc-800"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardDescription className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {label}
                  </CardDescription>
                  <Icon
                    className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                </div>
                <CardTitle className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {loading ? (
                    <span className="inline-block h-9 w-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                  ) : (
                    stats[key].toLocaleString("es")
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-links-heading" className="space-y-4">
        <div>
          <h2
            id="quick-links-heading"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Accesos rápidos
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ir directamente a cada módulo de administración.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(
            ({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all hover:border-emerald-300/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-emerald-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-emerald-950/50 dark:group-hover:text-emerald-300">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                    aria-hidden
                  />
                </div>
              </Link>
            )
          )}
        </div>
      </section>
    </div>
  )
}

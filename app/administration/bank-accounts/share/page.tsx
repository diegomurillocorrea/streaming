"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LuCheck, LuCopy, LuRefreshCw } from "react-icons/lu"

import type { BankAccountShareRow } from "@/lib/bank-accounts-share"

export default function BankAccountsSharePage() {
  const [accounts, setAccounts] = useState<BankAccountShareRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  /** Evita mismatch de hidratación en el botón Actualizar (disabled / spinner). */
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch("/api/public/bank-accounts-share", {
        cache: "no-store",
      })
      const payload = (await res.json()) as {
        accounts?: BankAccountShareRow[]
        error?: string
      }

      if (!res.ok) {
        console.error(payload)
        setErrorMessage(
          payload.error ||
            "No se pudieron cargar las cuentas. Si eres el administrador, revisa permisos de lectura (RLS para `anon`) o la variable SUPABASE_SERVICE_ROLE_KEY en el servidor."
        )
        setAccounts([])
      } else {
        setAccounts(payload.accounts ?? [])
      }
    } catch (e) {
      console.error(e)
      setErrorMessage("No se pudieron cargar las cuentas. Comprueba tu conexión e inténtalo de nuevo.")
      setAccounts([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const handleCopy = useCallback(async (text: string, key: string) => {
    const trimmed = text?.trim() ?? ""
    if (!trimmed) {
      window.alert("No hay texto para copiar.")
      return
    }

    try {
      await navigator.clipboard.writeText(trimmed)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      window.alert(
        "No se pudo copiar al portapapeles. Copia manualmente o revisa permisos del navegador."
      )
    }
  }, [])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-emerald-400">
          Pagos
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-emerald-50">
              Datos bancarios
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-emerald-200/90">
              Usa los botones para copiar el titular y el número de cuenta y pegarlos en tu app
              bancaria.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-600 dark:hover:bg-emerald-900/40"
            onClick={() => void loadAccounts()}
            disabled={hasMounted && loading}
            title="Actualizar lista"
            aria-label="Actualizar lista de cuentas bancarias"
          >
            <LuRefreshCw
              className={`h-4 w-4 ${hasMounted && loading ? "animate-spin" : ""}`}
              aria-hidden
            />
          </Button>
        </div>
      </header>

      {errorMessage && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-100"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="text-center text-sm text-zinc-500 dark:text-emerald-300">
          Cargando cuentas…
        </p>
      ) : accounts.length === 0 && !errorMessage ? (
        <p className="text-center text-sm text-zinc-500 dark:text-emerald-300">
          No hay cuentas con número de cuenta guardado para mostrar.
        </p>
      ) : (
        <ul
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Lista de cuentas para transferencia"
        >
          {accounts.map((row) => {
            const baseKey = `ba-${row.id_bank_account}`
            const fullBlock = `Titular: ${row.account_name}\nBanco: ${row.bank_name}\nNúmero de cuenta: ${row.account_number}`

            return (
              <li key={row.id_bank_account} className="min-w-0">
                <Card className="flex h-full flex-col border border-zinc-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-zinc-900 dark:text-emerald-50">
                      {row.bank_name}
                    </CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-emerald-300/90">
                      Cuenta para transferencias
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase text-zinc-500 dark:text-emerald-400">
                        Nombre / titular
                      </p>
                      <p className="break-words font-medium text-zinc-900 dark:text-emerald-50">
                        {row.account_name || "—"}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 cursor-pointer"
                        onClick={() =>
                          void handleCopy(row.account_name, `${baseKey}-name`)
                        }
                        disabled={!row.account_name?.trim()}
                        aria-label={`Copiar nombre del titular: ${row.account_name}`}
                      >
                        {copiedKey === `${baseKey}-name` ? (
                          <>
                            <LuCheck className="mr-2 h-4 w-4 text-emerald-600" aria-hidden />
                            Copiado
                          </>
                        ) : (
                          <>
                            <LuCopy className="mr-2 h-4 w-4" aria-hidden />
                            Copiar nombre
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-1 border-t border-zinc-100 pt-4 dark:border-emerald-900/60">
                      <p className="text-xs font-medium uppercase text-zinc-500 dark:text-emerald-400">
                        Número de cuenta
                      </p>
                      <p className="break-all font-mono text-sm text-zinc-900 dark:text-emerald-50">
                        {row.account_number || "—"}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 cursor-pointer"
                        onClick={() =>
                          void handleCopy(row.account_number, `${baseKey}-num`)
                        }
                        disabled={!row.account_number?.trim()}
                        aria-label={`Copiar número de cuenta del banco ${row.bank_name}`}
                      >
                        {copiedKey === `${baseKey}-num` ? (
                          <>
                            <LuCheck className="mr-2 h-4 w-4 text-emerald-600" aria-hidden />
                            Copiado
                          </>
                        ) : (
                          <>
                            <LuCopy className="mr-2 h-4 w-4" aria-hidden />
                            Copiar número
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="mt-auto border-t border-zinc-100 pt-4 dark:border-emerald-900/60">
                      <Button
                        type="button"
                        className="w-full cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => void handleCopy(fullBlock, `${baseKey}-all`)}
                        disabled={
                          !row.account_name?.trim() && !row.account_number?.trim()
                        }
                        aria-label={`Copiar todos los datos de la cuenta en ${row.bank_name}`}
                      >
                        {copiedKey === `${baseKey}-all` ? (
                          <>
                            <LuCheck className="mr-2 h-4 w-4" aria-hidden />
                            Copiado (todo)
                          </>
                        ) : (
                          <>
                            <LuCopy className="mr-2 h-4 w-4" aria-hidden />
                            Copiar todo (titular, banco y número)
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

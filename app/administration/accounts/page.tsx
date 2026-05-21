"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";

import { TableScrollArea } from "@/components/admin/table-scroll-area";
import { TableSearchInput } from "@/components/admin/table-search-input";
import {
  DEFAULT_MAX_CLIENTS,
  MAX_MAX_CLIENTS,
  MIN_MAX_CLIENTS,
  maxClientsBelowSubscriptionCountMessage,
  parseMaxClientsFormValue,
} from "@/lib/account-max-clients";
import { canAccessAccountSubscriptionsPage } from "@/lib/account-subscriptions-access";
import { formatSupabaseError } from "@/lib/format-supabase-error";
import { rowMatchesSearch } from "@/lib/table-search";

/**
 * Orden de filas en Cuentas por servicio (coincidencia en `company_name`).
 * 1 Disney → 2 Prime Video → 3 Netflix → 4 Crunchyroll → 5 Spotify → 6 Gmail; resto al final.
 */
const ACCOUNT_TABLE_SERVICE_ORDER = [
  "disney",
  "prime video",
  "netflix",
  "crunchyroll",
  "spotify",
  "gmail",
] as const;

function getCompanyNameFromAccount(acc) {
  return (
    (Array.isArray(acc.companies)
      ? acc.companies[0]?.company_name
      : acc.companies?.company_name) ?? ""
  );
}

function getCompanyMembershipMonthlyCostFromAccount(acc) {
  const co = Array.isArray(acc.companies)
    ? acc.companies[0]
    : acc.companies;
  const v = co?.membership_monthly_cost;
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function getAccountCompanySortRank(companyName: string) {
  const n = companyName.trim().toLowerCase();
  for (let i = 0; i < ACCOUNT_TABLE_SERVICE_ORDER.length; i++) {
    if (n.includes(ACCOUNT_TABLE_SERVICE_ORDER[i])) return i;
  }
  return ACCOUNT_TABLE_SERVICE_ORDER.length;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [tableSearch, setTableSearch] = useState("");

  /** Evita mismatch de hidratación SSR/cliente en el botón Actualizar (disabled vs loading). */
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const rankA = getAccountCompanySortRank(getCompanyNameFromAccount(a));
      const rankB = getAccountCompanySortRank(getCompanyNameFromAccount(b));
      if (rankA !== rankB) return rankA - rankB;
      const idA = a.id_account ?? 0;
      const idB = b.id_account ?? 0;
      return idA - idB;
    });
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (!tableSearch.trim()) return sortedAccounts;
    return sortedAccounts.filter((acc) => {
      const companyName = getCompanyNameFromAccount(acc);
      const membershipCost = getCompanyMembershipMonthlyCostFromAccount(acc);
      const emailAddr =
        (Array.isArray(acc.emails)
          ? acc.emails[0]?.email_address
          : acc.emails?.email_address) ?? "";
      return rowMatchesSearch(
        [
          acc.id_account != null ? String(acc.id_account) : "",
          acc.account_name,
          companyName,
          emailAddr,
          acc.payment_date,
          membershipCost != null ? String(membershipCost) : "",
          acc.account_price_by_client != null
            ? String(acc.account_price_by_client)
            : "",
          acc.max_clients != null ? String(acc.max_clients) : "",
        ],
        tableSearch
      );
    });
  }, [sortedAccounts, tableSearch]);

  // formulario compartido para crear / editar
  const [form, setForm] = useState({
    account_name: "",
    id_company: "",
    id_email: "",
    password: "",
    payment_date: "",
    account_price_by_client: "",
    pin_included: true,
    max_clients: String(DEFAULT_MAX_CLIENTS),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createBrowserClient();

    const [
      { data: accountsData, error: accountsError },
      { data: companiesData, error: companiesError },
      { data: emailsData, error: emailsError },
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select(
          `
          id_account,
          id_company,
          id_email,
          password,
          account_name,
          payment_date,
          created_at,
          account_price_by_client,
          pin_included,
          max_clients,
          companies (
            company_name,
            membership_monthly_cost
          ),
          emails (
            email_address
          )
        `
        )
        .order("id_account", { ascending: true }),
      supabase
        .from("companies")
        .select("id_company, company_name, membership_monthly_cost")
        .order("company_name", { ascending: true }),
      supabase
        .from("emails")
        .select("id_email, email_address")
        .order("email_address", { ascending: true }),
    ]);

    if (accountsError) {
      const msg = formatSupabaseError(accountsError, "No se pudieron cargar las cuentas.");
      console.error("accounts error =>", msg, accountsError);
      setLoadError(msg);
    }
    if (companiesError) {
      console.error("companies error =>", formatSupabaseError(companiesError), companiesError);
    }
    if (emailsError) {
      console.error("emails error =>", formatSupabaseError(emailsError), emailsError);
    }

    setAccounts(accountsData ?? []);
    setCompanies(companiesData ?? []);
    setEmails(emailsData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadData]);

  function openCreateDialog() {
    setEditingAccount(null);
    setSaveError(null);
    setForm({
      account_name: "",
      id_company: "",
      id_email: "",
      password: "",
      payment_date: "",
      account_price_by_client: "",
      pin_included: true,
      max_clients: String(DEFAULT_MAX_CLIENTS),
    });
    setIsDialogOpen(true);
  }

  function openEditDialog(account) {
    setEditingAccount(account);
    setSaveError(null);
    setForm({
      account_name: account.account_name ?? "",
      id_company: account.id_company ? String(account.id_company) : "",
      id_email: account.id_email ? String(account.id_email) : "",
      password: account.password ?? "",
      payment_date: account.payment_date ?? "",
      account_price_by_client:
        account.account_price_by_client !== null &&
        account.account_price_by_client !== undefined
          ? String(account.account_price_by_client)
          : "",
      pin_included:
        account.pin_included === null || account.pin_included === undefined
          ? true
          : Boolean(account.pin_included),
      max_clients:
        account.max_clients !== null && account.max_clients !== undefined
          ? String(account.max_clients)
          : String(DEFAULT_MAX_CLIENTS),
    });
    setIsDialogOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const supabase = createBrowserClient();

    const maxClientsParsed = parseMaxClientsFormValue(form.max_clients);
    if (maxClientsParsed.ok === false) {
      setSaveError(maxClientsParsed.message);
      setSaving(false);
      return;
    }

    if (editingAccount) {
      const { count, error: countError } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("id_account", editingAccount.id_account);

      if (countError) {
        console.error("subscription count error =>", countError);
        setSaveError(
          countError.message || "No se pudo verificar las suscripciones de la cuenta"
        );
        setSaving(false);
        return;
      }

      const subscriptionCount = count ?? 0;
      if (maxClientsParsed.value < subscriptionCount) {
        setSaveError(
          maxClientsBelowSubscriptionCountMessage(
            maxClientsParsed.value,
            subscriptionCount
          )
        );
        setSaving(false);
        return;
      }
    }

    const payload = {
      account_name: form.account_name.trim(),
      id_company: form.id_company ? Number(form.id_company) : null,
      id_email: form.id_email ? Number(form.id_email) : null,
      password: form.password || "",
      payment_date: form.payment_date || null,
      account_price_by_client:
        form.account_price_by_client === "" ||
        form.account_price_by_client === null
          ? null
          : Number.parseFloat(form.account_price_by_client),
      pin_included: Boolean(form.pin_included),
      max_clients: maxClientsParsed.value,
    };

    let error;

    if (editingAccount) {
      const { error: updateError } = await supabase
        .from("accounts")
        .update(payload)
        .eq("id_account", editingAccount.id_account);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("accounts")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      console.error("save account error =>", error);
      setSaveError(error.message || "Error al guardar la cuenta");
    } else {
      setIsDialogOpen(false);
      await loadData();
    }

    setSaving(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id_account", deleteTarget.id_account);

    if (error) {
      console.error("delete account error =>", error);
    } else {
      setDeleteTarget(null);
      await loadData();
    }

    setDeleting(false);
  }

  return (
    <main className="mx-auto space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cuentas</h1>
          <p className="text-sm text-zinc-600 dark:text-emerald-300">
            Administra todas las cuentas de streaming y su información asociada.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
            onClick={loadData}
            disabled={hasMounted && loading}
            title="Actualizar"
          >
            <LuRefreshCw
              className={`h-4 w-4 ${hasMounted && loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={openCreateDialog}
          >
            <LuPlus className="mr-2 h-4 w-4" />
            Nueva cuenta
          </Button>
        </div>
      </header>

      {loadError && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {loadError}
        </p>
      )}

      <Card className="border border-zinc-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-emerald-900/60">
        <CardHeader>
          <CardTitle className="text-base">Lista de cuentas</CardTitle>
          <CardDescription>
            Todas las cuentas guardadas en la tabla <code>accounts</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <TableSearchInput
            id="accounts-table-search"
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Buscar por ID, cuenta, servicio, email, cupos, costo o precio al cliente…"
            aria-label="Buscar en la lista de cuentas"
          />
          <TableScrollArea>
            <table className="w-full min-w-max border-collapse text-sm">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
                <tr className="text-left text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-300">
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Nombre de cuenta</th>
                  <th className="py-3.5 px-4">Servicio</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Día de pago</th>
                  <th className="py-3.5 px-4 text-center">Cupos</th>
                  <th
                    className="py-3.5 px-4 text-right"
                    title="Definido en Empresas por servicio"
                  >
                    Costo membresía
                  </th>
                  <th className="py-3.5 px-4 text-right">Precio al cliente</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300">
                      Cargando cuentas...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300">
                      Aún no hay cuentas. Haz clic en &quot;Nueva cuenta&quot; para agregar la primera.
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300">
                      No hay resultados para &quot;{tableSearch.trim()}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => {
                    const rowMembershipCost =
                      getCompanyMembershipMonthlyCostFromAccount(acc);
                    return (
                    <tr
                      key={acc.id_account}
                      className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                    >
                      <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                        {acc.id_account ?? "-"}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                        {acc.id_account != null && acc.account_name ? (
                          canAccessAccountSubscriptionsPage(acc) ? (
                            <Link
                              href={`/administration/subscriptions/${acc.id_account}`}
                              className="font-medium text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-300 dark:focus-visible:outline-emerald-400"
                              aria-label={`Ver clientes y pagos de la cuenta ${acc.account_name}`}
                            >
                              {acc.account_name}
                            </Link>
                          ) : (
                            <span
                              className="font-medium text-zinc-600 dark:text-emerald-200/90"
                              title="Configura día de pago y precio al cliente en esta cuenta para abrir suscripciones"
                              aria-label={`${acc.account_name}: completa día de pago y precio al cliente para ver suscripciones`}
                            >
                              {acc.account_name}
                            </span>
                          )
                        ) : (
                          acc.account_name || "-"
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                        {(Array.isArray(acc.companies)
                          ? acc.companies[0]?.company_name
                          : acc.companies?.company_name) ?? "-"}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                        {(Array.isArray(acc.emails)
                          ? acc.emails[0]?.email_address
                          : acc.emails?.email_address) ?? "-"}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                        {acc.payment_date ? formatDate(acc.payment_date) : "-"}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-center tabular-nums text-zinc-700 dark:text-emerald-100">
                        {acc.max_clients ?? DEFAULT_MAX_CLIENTS}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-right text-zinc-600 dark:text-emerald-200">
                        {rowMembershipCost != null
                          ? `$${rowMembershipCost.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-right text-zinc-600 dark:text-emerald-200">
                        {acc.account_price_by_client !== null &&
                        acc.account_price_by_client !== undefined
                          ? `$${Number(acc.account_price_by_client).toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                            onClick={() => openEditDialog(acc)}
                          >
                            <LuPencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
                            onClick={() => setDeleteTarget(acc)}
                          >
                            <LuTrash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </TableScrollArea>
        </CardContent>
      </Card>

        {/* DIALOGO CREAR / EDITAR */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSaveError(null);
        }}
      >
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {editingAccount ? "Editar cuenta" : "Nueva cuenta"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Actualiza la información de esta cuenta de streaming."
                  : "Crea una nueva cuenta. El costo de membresía del servicio se define en Empresas."}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="space-y-2">
                <Label htmlFor="account_name">Nombre de cuenta</Label>
                <Input
                  id="account_name"
                  value={form.account_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      account_name: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Servicio (empresa)</Label>
                  <Select
                    value={form.id_company}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, id_company: value }))
                    }
                  >
                    <SelectTrigger className="w-full border-zinc-200 bg-white text-sm text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-white">
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-white">
                      {companies.map((c) => (
                        <SelectItem
                          key={c.id_company}
                          value={String(c.id_company)}
                        >
                          {c.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500 dark:text-emerald-400">
                    El costo de membresía mensual del servicio se edita en{" "}
                    <Link
                      href="/administration/companies"
                      className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                    >
                      Empresas
                    </Link>
                    .
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Select
                    value={form.id_email}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, id_email: value }))
                    }
                  >
                    <SelectTrigger className="w-full border-zinc-200 bg-white text-sm text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-white">
                      <SelectValue placeholder="Seleccionar correo" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-white">
                      {emails.map((e) => (
                        <SelectItem
                          key={e.id_email}
                          value={String(e.id_email)}
                        >
                          {e.email_address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="text"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 px-3 py-3 dark:border-emerald-800">
                <input
                  id="pin_included"
                  type="checkbox"
                  checked={form.pin_included}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      pin_included: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-600 dark:bg-emerald-950"
                  aria-describedby="pin_included_desc"
                />
                <div className="space-y-0.5">
                  <Label
                    htmlFor="pin_included"
                    className="cursor-pointer text-sm font-medium leading-snug"
                  >
                    Mostrar columna PIN (suscripciones)
                  </Label>
                  <p
                    id="pin_included_desc"
                    className="text-xs text-zinc-500 dark:text-emerald-400"
                  >
                    Si está activo, en la vista de clientes por cuenta se muestra la columna
                    para el PIN de cada suscripción.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Día de pago</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={form.payment_date || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        payment_date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_clients">Cupos máximos</Label>
                  <p
                    id="max_clients_desc"
                    className="text-xs text-zinc-500 dark:text-emerald-400"
                  >
                    Suscripciones permitidas en esta cuenta ({MIN_MAX_CLIENTS}–
                    {MAX_MAX_CLIENTS}).
                  </p>
                  <Input
                    id="max_clients"
                    type="number"
                    min={MIN_MAX_CLIENTS}
                    max={MAX_MAX_CLIENTS}
                    step={1}
                    value={form.max_clients}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        max_clients: e.target.value,
                      }))
                    }
                    className="border-zinc-200 bg-white text-sm text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-50"
                    aria-describedby="max_clients_desc"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="account_price_by_client">Precio al cliente</Label>
                  <p
                    id="account_price_by_client_desc"
                    className="text-xs text-zinc-500 dark:text-emerald-400"
                  >
                    Monto que cada cliente debe pagar por su cupo.
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-zinc-600 dark:text-emerald-200">$</span>
                    <Input
                      id="account_price_by_client"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.account_price_by_client}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          account_price_by_client: e.target.value,
                        }))
                      }
                      className="border-zinc-200 bg-white text-sm text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-50"
                      placeholder="0.00"
                      aria-describedby="account_price_by_client_desc"
                    />
                  </div>
                </div>
              </div>

              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {saveError}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={saving}
                >
                  {saving
                    ? editingAccount
                      ? "Guardando..."
                      : "Creando..."
                    : editingAccount
                    ? "Guardar cambios"
                    : "Crear cuenta"}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

        {/* MODAL ELIMINAR */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar la cuenta{" "}
              <span className="font-mono text-zinc-700 dark:text-emerald-200">
                {deleteTarget?.account_name}
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

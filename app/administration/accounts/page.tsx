"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { rowMatchesSearch } from "@/lib/table-search";

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [tableSearch, setTableSearch] = useState("");

  const filteredAccounts = useMemo(() => {
    if (!tableSearch.trim()) return accounts;
    return accounts.filter((acc) => {
      const companyName =
        (Array.isArray(acc.companies)
          ? acc.companies[0]?.company_name
          : acc.companies?.company_name) ?? "";
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
          acc.price != null ? String(acc.price) : "",
        ],
        tableSearch
      );
    });
  }, [accounts, tableSearch]);

  // formulario compartido para crear / editar
  const [form, setForm] = useState({
    account_name: "",
    id_company: "",
    id_email: "",
    password: "",
    payment_date: "",
    price: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
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
          price,
          companies (
            company_name
          ),
          emails (
            email_address
          )
        `
        )
        .order("id_account", { ascending: true }),
      supabase
        .from("companies")
        .select("id_company, company_name")
        .order("company_name", { ascending: true }),
      supabase
        .from("emails")
        .select("id_email, email_address")
        .order("email_address", { ascending: true }),
    ]);

    if (accountsError) console.error("accounts error =>", accountsError);
    if (companiesError) console.error("companies error =>", companiesError);
    if (emailsError) console.error("emails error =>", emailsError);

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
    setForm({
      account_name: "",
      id_company: "",
      id_email: "",
      password: "",
      payment_date: "",
      price: "",
    });
    setIsDialogOpen(true);
  }

  function openEditDialog(account) {
    setEditingAccount(account);
    setForm({
      account_name: account.account_name ?? "",
      id_company: account.id_company ? String(account.id_company) : "",
      id_email: account.id_email ? String(account.id_email) : "",
      password: account.password ?? "",
      payment_date: account.payment_date ?? "",
      price:
        account.price !== null && account.price !== undefined
          ? String(account.price)
          : "",
    });
    setIsDialogOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const supabase = createBrowserClient();

    const payload = {
      account_name: form.account_name.trim(),
      id_company: form.id_company ? Number(form.id_company) : null,
      id_email: form.id_email ? Number(form.id_email) : null,
      password: form.password || "",
      payment_date: form.payment_date || null,
      price:
        form.price === "" || form.price === null
          ? null
          : Number.parseFloat(form.price),
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
            disabled={loading}
            title="Actualizar"
          >
            <LuRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
            placeholder="Buscar por ID, cuenta, servicio, email o precio…"
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
                  <th className="py-3.5 px-4 text-right">Precio</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300">
                      Cargando cuentas...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300">
                      Aún no hay cuentas. Haz clic en &quot;Nueva cuenta&quot; para agregar la primera.
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300">
                      No hay resultados para &quot;{tableSearch.trim()}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => (
                    <tr
                      key={acc.id_account}
                      className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                    >
                      <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                        {acc.id_account ?? "-"}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                        {acc.account_name || "-"}
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
                      <td className="py-3.5 px-4 align-middle text-right text-zinc-600 dark:text-emerald-200">
                        {acc.price !== null && acc.price !== undefined ? `$${acc.price.toFixed(2)}` : "-"}
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
                  ))
                )}
              </tbody>
            </table>
          </TableScrollArea>
        </CardContent>
      </Card>

        {/* DIALOGO CREAR / EDITAR */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {editingAccount ? "Editar cuenta" : "Nueva cuenta"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Actualiza la información de esta cuenta de streaming."
                  : "Crea una nueva cuenta de streaming y define su precio."}
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

                {/* 🆕 Campo PRICE */}
                <div className="space-y-2">
                  <Label htmlFor="price">Precio</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-zinc-600 dark:text-emerald-200">$</span>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, price: e.target.value }))
                      }
                      className="border-zinc-200 bg-white text-sm text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

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

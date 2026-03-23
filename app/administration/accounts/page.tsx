"use client";

import { useCallback, useEffect, useState } from "react";
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
        .order("created_at", { ascending: true }),
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
    <main className="min-h-screen bg-emerald-950 text-emerald-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <div>
            <Link href="/" className="inline-block cursor-pointer">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                STREAMING MURILLO
              </p>
            </Link>
            <h1 className="mt-1 text-3xl font-bold">Administración de cuentas</h1>
            <p className="text-sm text-emerald-400">
              Administra todas las cuentas de streaming (empresa, correo, día de
              pago y precio).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="border-emerald-700 text-emerald-200 hover:bg-emerald-800"
              onClick={loadData}
              disabled={loading}
              title="Actualizar"
            >
              <LuRefreshCw className="w-4 h-4" />
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-emerald-50"
              onClick={openCreateDialog}
            >
              <LuPlus className="w-4 h-4 mr-2" />
              Nueva cuenta
            </Button>
          </div>
        </header>

        {/* TABLE */}
        <Card className="border-emerald-800 bg-emerald-900">
          <CardHeader>
            <CardTitle className="text-base">Cuentas</CardTitle>
            <CardDescription>
              Todas las cuentas de streaming registradas en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-emerald-800 text-emerald-50">
                  <tr className="text-xs uppercase">
                    <th className="py-2 pr-4">Nombre de cuenta</th>
                    <th className="py-2 pr-4">Servicio</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Día de pago</th>
                    {/* 🆕 Columna Price */}
                    <th className="py-2 pr-4 text-right">Precio</th>
                    <th className="py-2 pr-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-sm text-emerald-300"
                      >
                        Cargando cuentas...
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-sm text-emerald-300"
                      >
                        Aún no hay cuentas. Haz clic en &quot;Nueva cuenta&quot; para
                        agregar la primera.
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr
                        key={acc.id_account}
                        className="border-b border-emerald-900/60 last:border-b-0 text-emerald-50"
                      >
                        <td className="py-3 pr-4 align-top text-sm font-medium">
                          {acc.account_name}
                        </td>
                        <td className="py-3 pr-4 align-top text-xs text-emerald-50">
                          {(Array.isArray(acc.companies)
                            ? acc.companies[0]?.company_name
                            : acc.companies?.company_name) ?? "-"}
                        </td>
                        <td className="py-3 pr-4 align-top text-xs text-emerald-50">
                          {(Array.isArray(acc.emails)
                            ? acc.emails[0]?.email_address
                            : acc.emails?.email_address) ?? "-"}
                        </td>
                        <td className="py-3 pr-4 align-top text-xs text-emerald-50">
                          {acc.payment_date
                            ? formatDate(acc.payment_date)
                            : "-"}
                        </td>
                        {/* 🆕 celda Price */}
                        <td className="py-3 pr-4 align-top text-xs text-right text-emerald-50">
                          {acc.price !== null && acc.price !== undefined
                            ? `$${acc.price.toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="py-3 pr-4 align-top text-xs text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-emerald-700 text-emerald-100 hover:bg-emerald-800"
                              onClick={() => openEditDialog(acc)}
                            >
                              <LuPencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-red-800 text-red-200 hover:bg-red-900"
                              onClick={() => setDeleteTarget(acc)}
                            >
                              <LuTrash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* DIALOGO CREAR / EDITAR */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-full max-w-2xl sm:max-w-[720px] bg-emerald-950 border-emerald-700 text-emerald-50 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {editingAccount ? "Editar cuenta" : "Nueva cuenta"}
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-300">
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
                  className="bg-emerald-900 border-emerald-700 text-sm text-emerald-50"
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
                    <SelectTrigger className="w-full bg-emerald-900 border-emerald-700 text-sm text-emerald-50">
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-emerald-950 border-emerald-700 text-emerald-50">
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
                    <SelectTrigger className="w-full bg-emerald-900 border-emerald-700 text-sm text-emerald-50">
                      <SelectValue placeholder="Seleccionar correo" />
                    </SelectTrigger>
                    <SelectContent className="bg-emerald-950 border-emerald-700 text-emerald-50">
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
                  className="bg-emerald-900 border-emerald-700 text-sm text-emerald-50"
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
                    className="bg-emerald-900 border-emerald-700 text-sm text-emerald-50"
                  />
                </div>

                {/* 🆕 Campo PRICE */}
                <div className="space-y-2">
                  <Label htmlFor="price">Precio</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-emerald-200">$</span>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, price: e.target.value }))
                      }
                      className="bg-emerald-900 border-emerald-700 text-sm text-emerald-50"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-emerald-700 text-emerald-100 hover:bg-emerald-800"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-emerald-50"
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
          <AlertDialogContent className="bg-emerald-950 border-emerald-700 text-emerald-50">
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-emerald-300">
                Esto eliminará permanentemente la cuenta{" "}
                <span className="font-semibold">
                  {deleteTarget?.account_name}
                </span>{" "}
                y su configuración. Las suscripciones vinculadas a esta cuenta
                no se eliminarán automáticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="border-emerald-700 text-emerald-100 hover:bg-emerald-800"
                disabled={deleting}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-700 hover:bg-red-600 text-red-50"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}

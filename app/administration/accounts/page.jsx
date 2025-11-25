"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient as createBrowserClient } from "@/utils/supabase/client";

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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
  }

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
            <h1 className="mt-1 text-3xl font-bold">Accounts administration</h1>
            <p className="text-sm text-emerald-400">
              Manage all streaming accounts (company, email, payment day and
              price).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="border-emerald-700 text-emerald-200 hover:bg-emerald-800"
              onClick={loadData}
              disabled={loading}
              title="Refresh"
            >
              <LuRefreshCw className="w-4 h-4" />
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-emerald-50"
              onClick={openCreateDialog}
            >
              <LuPlus className="w-4 h-4 mr-2" />
              New account
            </Button>
          </div>
        </header>

        {/* TABLE */}
        <Card className="border-emerald-800 bg-emerald-900">
          <CardHeader>
            <CardTitle className="text-base">Accounts</CardTitle>
            <CardDescription>
              All streaming accounts stored in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-emerald-800 text-emerald-50">
                  <tr className="text-xs uppercase">
                    <th className="py-2 pr-4">Account name</th>
                    <th className="py-2 pr-4">Service</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Payment day</th>
                    {/* 🆕 Columna Price */}
                    <th className="py-2 pr-4 text-right">Price</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-sm text-emerald-300"
                      >
                        Loading accounts...
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-sm text-emerald-300"
                      >
                        No accounts yet. Click &quot;New account&quot; to add the
                        first one.
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
                          {acc.companies?.company_name ?? "-"}
                        </td>
                        <td className="py-3 pr-4 align-top text-xs text-emerald-50">
                          {acc.emails?.email_address ?? "-"}
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
                {editingAccount ? "Edit account" : "New account"}
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-300">
                {editingAccount
                  ? "Update the information for this streaming account."
                  : "Create a new streaming account and set its default price."}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="space-y-2">
                <Label htmlFor="account_name">Account name</Label>
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
                  <Label>Service (company)</Label>
                  <Select
                    value={form.id_company}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, id_company: value }))
                    }
                  >
                    <SelectTrigger className="w-full bg-emerald-900 border-emerald-700 text-sm text-emerald-50">
                      <SelectValue placeholder="Select company" />
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
                      <SelectValue placeholder="Select email" />
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
                <Label htmlFor="password">Password</Label>
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
                  <Label htmlFor="payment_date">Payment day</Label>
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
                  <Label htmlFor="price">Price</Label>
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-emerald-50"
                  disabled={saving}
                >
                  {saving
                    ? editingAccount
                      ? "Saving..."
                      : "Creating..."
                    : editingAccount
                    ? "Save changes"
                    : "Create account"}
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
              <AlertDialogTitle>Delete account</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-emerald-300">
                This will permanently remove the account{" "}
                <span className="font-semibold">
                  {deleteTarget?.account_name}
                </span>{" "}
                and its configuration. Subscriptions linked to this account
                won&apos;t be deleted automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="border-emerald-700 text-emerald-100 hover:bg-emerald-800"
                disabled={deleting}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-700 hover:bg-red-600 text-red-50"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}

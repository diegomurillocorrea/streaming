"use client";

import { useEffect, useMemo, useState } from "react";
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

import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";

import { TableScrollArea } from "@/components/admin/table-scroll-area";
import { TableSearchInput } from "@/components/admin/table-search-input";
import { rowMatchesSearch } from "@/lib/table-search";

export default function BankAccountsAdminPage() {
    const supabase = useMemo(() => createBrowserClient(), []);

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [globalError, setGlobalError] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [currentAccount, setCurrentAccount] = useState(null);

    const [formAccountName, setFormAccountName] = useState("");
    const [formAccountNumber, setFormAccountNumber] = useState("");
    const [formBankName, setFormBankName] = useState("");

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [tableSearch, setTableSearch] = useState("");

    const filteredBankAccounts = useMemo(() => {
        if (!tableSearch.trim()) return accounts;
        return accounts.filter((row) =>
            rowMatchesSearch(
                [
                    row.id_bank_account,
                    row.account_name,
                    row.bank_name,
                    row.account_number,
                    row.created_at,
                ],
                tableSearch
            )
        );
    }, [accounts, tableSearch]);

    // ---------- Load data ----------
    const loadAccounts = async () => {
        setLoading(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("bank_accounts")
            .select("*")
            .order("id_bank_account", { ascending: true });

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudieron cargar las cuentas bancarias.");
        } else {
            setAccounts(data || []);
        }

        setLoading(false);
        setHasLoadedOnce(true);
    };

    useEffect(() => {
        loadAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- Helpers ----------
    const resetForm = () => {
        setFormAccountName("");
        setFormAccountNumber("");
        setFormBankName("");
        setGlobalError("");
    };

    const formatAccountNumber = (value) => {
        if (!value) return "-";
        const str = String(value).replace(/\s+/g, "");
        if (str.length <= 4) return str;
        return `••••••${str.slice(-4)}`;
    };

    // ---------- Create ----------
    const openCreateModal = () => {
        setCurrentAccount(null);
        resetForm();
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!formAccountName.trim() || !formAccountNumber.trim() || !formBankName.trim()) {
            setGlobalError("Nombre, número y banco son obligatorios.");
            return;
        }

        setGlobalError("");
        setSaving(true);

        const payload = {
            account_name: formAccountName.trim(),
            account_number: formAccountNumber.trim(),
            bank_name: formBankName.trim(),
        };

        const { data, error } = await supabase
            .from("bank_accounts")
            .insert(payload)
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudo crear la cuenta bancaria.");
            return;
        }

        setAccounts((prev) => [data, ...prev]);
        setCreateOpen(false);
    };

    // ---------- Edit ----------
    const openEditModal = (row) => {
        setCurrentAccount(row);
        setFormAccountName(row.account_name || "");
        setFormAccountNumber(row.account_number || "");
        setFormBankName(row.bank_name || "");
        setGlobalError("");
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!currentAccount) return;

        if (!formAccountName.trim() || !formAccountNumber.trim() || !formBankName.trim()) {
            setGlobalError("Nombre, número y banco son obligatorios.");
            return;
        }

        setGlobalError("");
        setSaving(true);

        const payload = {
            account_name: formAccountName.trim(),
            account_number: formAccountNumber.trim(),
            bank_name: formBankName.trim(),
        };

        const { data, error } = await supabase
            .from("bank_accounts")
            .update(payload)
            .eq("id_bank_account", currentAccount.id_bank_account)
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudo actualizar la cuenta bancaria.");
            return;
        }

        setAccounts((prev) =>
            prev.map((item) =>
                item.id_bank_account === data.id_bank_account ? data : item
            )
        );
        setEditOpen(false);
    };

    // ---------- Delete ----------
    const openDeleteModal = (row) => {
        setCurrentAccount(row);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!currentAccount) return;

        setDeleting(true);
        setGlobalError("");

        const { error } = await supabase
            .from("bank_accounts")
            .delete()
            .eq("id_bank_account", currentAccount.id_bank_account);

        setDeleting(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudo eliminar la cuenta bancaria.");
            return;
        }

        setAccounts((prev) =>
            prev.filter((item) => item.id_bank_account !== currentAccount.id_bank_account)
        );
        setDeleteOpen(false);
    };

    // ---------- Render ----------
    const isInitialLoading = !hasLoadedOnce;
    const isTableLoading = isInitialLoading || loading;

    return (
        <main className="mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Cuentas bancarias</h1>
                    <p className="text-sm text-zinc-600 dark:text-emerald-300">
                        Administra las cuentas bancarias usadas en tu negocio.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                        onClick={loadAccounts}
                        disabled={isTableLoading}
                    >
                        <LuRefreshCw
                            className={`h-4 w-4 ${isTableLoading ? "animate-spin" : ""}`}
                        />
                    </Button>

                    <Button
                        className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={openCreateModal}
                    >
                        <LuPlus className="mr-2 h-4 w-4" />
                        Nueva cuenta bancaria
                    </Button>
                </div>
            </header>

            {globalError && (
                <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
            )}

            <Card className="border border-zinc-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Lista de cuentas bancarias</CardTitle>
                    <CardDescription>
                        All bank accounts stored in the <code>bank_accounts</code> table.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <TableSearchInput
                        id="bank-accounts-table-search"
                        value={tableSearch}
                        onChange={setTableSearch}
                        placeholder="Buscar por nombre, banco o número de cuenta…"
                        aria-label="Buscar en la lista de cuentas bancarias"
                    />
                    <TableScrollArea>
                        <table className="w-full min-w-max border-collapse text-sm">
                            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
                                <tr className="text-left text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-300">
                                    <th className="py-3.5 px-4">ID</th>
                                    <th className="py-3.5 px-4">Nombre de cuenta</th>
                                    <th className="py-3.5 px-4">Banco</th>
                                    <th className="py-3.5 px-4">Número de cuenta</th>
                                    <th className="py-3.5 px-4">Creado el</th>
                                    <th className="py-3.5 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isTableLoading ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            Cargando cuentas bancarias...
                                        </td>
                                    </tr>
                                ) : accounts.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No se encontraron cuentas bancarias. Haz clic en
                                            &quot;Nueva cuenta bancaria&quot; para agregar una.
                                        </td>
                                    </tr>
                                ) : filteredBankAccounts.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No hay resultados para &quot;{tableSearch.trim()}&quot;.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBankAccounts.map((row) => (
                                        <tr
                                            key={row.id_bank_account}
                                            className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                                        >
                                            <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                                                {row.id_bank_account}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                {row.account_name}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                {row.bank_name}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                {formatAccountNumber(row.account_number)}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                {row.created_at
                                                    ? new Date(row.created_at).toLocaleString()
                                                    : "-"}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                                                        onClick={() => openEditModal(row)}
                                                    >
                                                        <LuPencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
                                                        onClick={() => openDeleteModal(row)}
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

            {/* ---------- Create modal ---------- */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Nueva cuenta bancaria</DialogTitle>
                        <DialogDescription>
                            Agrega una nueva cuenta bancaria al sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="new-account-name">Nombre de cuenta</Label>
                            <Input
                                id="new-account-name"
                                type="text"
                                placeholder="Nombre de cuenta"
                                value={formAccountName}
                                onChange={(e) => setFormAccountName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-bank-name">Banco</Label>
                            <Input
                                id="new-bank-name"
                                type="text"
                                placeholder="Nombre del banco"
                                value={formBankName}
                                onChange={(e) => setFormBankName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-account-number">Número de cuenta</Label>
                            <Input
                                id="new-account-number"
                                type="text"
                                placeholder="Número de cuenta"
                                value={formAccountNumber}
                                onChange={(e) => setFormAccountNumber(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        {globalError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateOpen(false)}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={saving}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {saving ? "Guardando..." : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Edit modal ---------- */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Editar cuenta bancaria</DialogTitle>
                        <DialogDescription>
                            Actualiza la cuenta bancaria seleccionada.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="edit-account-name">Nombre de cuenta</Label>
                            <Input
                                id="edit-account-name"
                                type="text"
                                value={formAccountName}
                                onChange={(e) => setFormAccountName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-bank-name">Banco</Label>
                            <Input
                                id="edit-bank-name"
                                type="text"
                                value={formBankName}
                                onChange={(e) => setFormBankName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-account-number">Número de cuenta</Label>
                            <Input
                                id="edit-account-number"
                                type="text"
                                value={formAccountNumber}
                                onChange={(e) => setFormAccountNumber(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        {globalError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditOpen(false)}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={saving}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Delete modal ---------- */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar cuenta bancaria</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Seguro que deseas eliminar{" "}
                            <span className="font-mono text-zinc-700 dark:text-emerald-200">
                                {currentAccount?.account_name}
                            </span>
                            ? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
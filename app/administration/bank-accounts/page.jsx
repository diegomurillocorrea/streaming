"use client";

import { useEffect, useMemo, useState } from "react";
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

import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";

export default function BankAccountsAdminPage() {
    const supabase = useMemo(() => createBrowserClient(), []);

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
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

    // ---------- Load data ----------
    const loadAccounts = async () => {
        setLoading(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("bank_accounts")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to load bank accounts.");
        } else {
            setAccounts(data || []);
        }

        setLoading(false);
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
            setGlobalError("Account name, number and bank name are required.");
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
            setGlobalError(error.message || "Unable to create bank account.");
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
            setGlobalError("Account name, number and bank name are required.");
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
            setGlobalError(error.message || "Unable to update bank account.");
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
            setGlobalError(error.message || "Unable to delete bank account.");
            return;
        }

        setAccounts((prev) =>
            prev.filter((item) => item.id_bank_account !== currentAccount.id_bank_account)
        );
        setDeleteOpen(false);
    };

    // ---------- Render ----------
    return (
        <main className="max-w-5xl mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Bank accounts</h1>
                    <p className="text-sm text-emerald-300">
                        Manage the bank accounts used for your streaming business.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-emerald-400/60 cursor-pointer"
                        onClick={loadAccounts}
                        disabled={loading}
                    >
                        <LuRefreshCw
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        />
                    </Button>

                    <Button
                        className="bg-emerald-500 hover:bg-emerald-600 cursor-pointer"
                        onClick={openCreateModal}
                    >
                        <LuPlus className="mr-2 h-4 w-4" />
                        New bank account
                    </Button>
                </div>
            </header>

            {globalError && (
                <p className="text-sm text-red-400">{globalError}</p>
            )}

            <Card className="border-emerald-800 bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Bank accounts list</CardTitle>
                    <CardDescription>
                        All bank accounts stored in the <code>bank_accounts</code> table.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-emerald-300">Loading bank accounts...</p>
                    ) : accounts.length === 0 ? (
                        <p className="text-sm text-emerald-300">
                            No bank accounts found. Click &quot;New bank account&quot; to add one.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-emerald-800 text-left text-xs uppercase text-emerald-300">
                                        <th className="py-2 pr-4">ID</th>
                                        <th className="py-2 pr-4">Account name</th>
                                        <th className="py-2 pr-4">Bank name</th>
                                        <th className="py-2 pr-4">Account number</th>
                                        <th className="py-2 pr-4">Created at</th>
                                        <th className="py-2 pr-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((row) => (
                                        <tr
                                            key={row.id_bank_account}
                                            className="border-b border-emerald-900/60 last:border-b-0"
                                        >
                                            <td className="py-2 pr-4 align-middle text-emerald-100">
                                                {row.id_bank_account}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-50">
                                                {row.account_name}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-50">
                                                {row.bank_name}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {formatAccountNumber(row.account_number)}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {row.created_at
                                                    ? new Date(row.created_at).toLocaleString()
                                                    : "-"}
                                            </td>
                                            <td className="py-2 pr-0 align-middle">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="border-emerald-400/60 cursor-pointer"
                                                        onClick={() => openEditModal(row)}
                                                    >
                                                        <LuPencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="border-red-500/60 text-red-400 hover:bg-red-500 hover:text-white cursor-pointer"
                                                        onClick={() => openDeleteModal(row)}
                                                    >
                                                        <LuTrash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ---------- Create modal ---------- */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <DialogHeader>
                        <DialogTitle>New bank account</DialogTitle>
                        <DialogDescription>
                            Add a new bank account to the system.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="new-account-name">Account name</Label>
                            <Input
                                id="new-account-name"
                                type="text"
                                placeholder="Account name"
                                value={formAccountName}
                                onChange={(e) => setFormAccountName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-bank-name">Bank name</Label>
                            <Input
                                id="new-bank-name"
                                type="text"
                                placeholder="Bank name"
                                value={formBankName}
                                onChange={(e) => setFormBankName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-account-number">Account number</Label>
                            <Input
                                id="new-account-number"
                                type="text"
                                placeholder="Account number"
                                value={formAccountNumber}
                                onChange={(e) => setFormAccountNumber(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        {globalError && (
                            <p className="text-sm text-red-400">{globalError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={saving}
                            className="bg-emerald-500 hover:bg-emerald-600"
                        >
                            {saving ? "Saving..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Edit modal ---------- */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit bank account</DialogTitle>
                        <DialogDescription>
                            Update the selected bank account.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="edit-account-name">Account name</Label>
                            <Input
                                id="edit-account-name"
                                type="text"
                                value={formAccountName}
                                onChange={(e) => setFormAccountName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-bank-name">Bank name</Label>
                            <Input
                                id="edit-bank-name"
                                type="text"
                                value={formBankName}
                                onChange={(e) => setFormBankName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-account-number">Account number</Label>
                            <Input
                                id="edit-account-number"
                                type="text"
                                value={formAccountNumber}
                                onChange={(e) => setFormAccountNumber(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        {globalError && (
                            <p className="text-sm text-red-400">{globalError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={saving}
                            className="bg-emerald-500 hover:bg-emerald-600"
                        >
                            {saving ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Delete modal ---------- */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete bank account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-mono text-emerald-200">
                                {currentAccount?.account_name}
                            </span>
                            ? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
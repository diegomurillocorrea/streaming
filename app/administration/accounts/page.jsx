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
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";

export default function AccountsAdminPage() {
    const supabase = useMemo(() => createBrowserClient(), []);

    // ---------- Data ----------
    const [accounts, setAccounts] = useState([]);

    const [companies, setCompanies] = useState([]);
    const [emails, setEmails] = useState([]);
    const [passwords, setPasswords] = useState([]);
    const [cards, setCards] = useState([]);

    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loadingRefs, setLoadingRefs] = useState(true);

    const [accountsError, setAccountsError] = useState("");
    const [refsError, setRefsError] = useState("");

    // ---------- Modals & form ----------
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [currentAccount, setCurrentAccount] = useState(null);

    const [formAccountName, setFormAccountName] = useState("");
    const [formCompanyId, setFormCompanyId] = useState("");
    const [formEmailId, setFormEmailId] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formCardId, setFormCardId] = useState("");
    const [formPaymentDate, setFormPaymentDate] = useState("");

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // ---------- Loaders ----------
    const loadReferenceData = async () => {
        setLoadingRefs(true);
        setRefsError("");

        const [
            { data: companiesData, error: companiesErr },
            { data: emailsData, error: emailsErr },
            { data: passwordsData, error: passwordsErr },
            { data: cardsData, error: cardsErr },
        ] = await Promise.all([
            supabase
                .from("companies")
                .select("*")
                .order("company_name", { ascending: true }),
            supabase
                .from("emails")
                .select("*")
                .order("email_address", { ascending: true }),
            supabase
                .from("passwords")
                .select("*")
                .order("created_at", { ascending: false }),
            supabase
                .from("cards")
                .select("*")
                .order("created_at", { ascending: false }),
        ]);

        if (companiesErr || emailsErr || passwordsErr || cardsErr) {
            const firstErr =
                companiesErr || emailsErr || passwordsErr || cardsErr;
            console.error(firstErr);
            setRefsError(firstErr.message || "Unable to load reference data.");
        }

        if (!companiesErr) setCompanies(companiesData || []);
        if (!emailsErr) setEmails(emailsData || []);
        if (!passwordsErr) setPasswords(passwordsData || []);
        if (!cardsErr) setCards(cardsData || []);

        setLoadingRefs(false);
    };

    const loadAccounts = async () => {
        setLoadingAccounts(true);
        setAccountsError("");

        const { data, error } = await supabase
            .from("accounts")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            setAccountsError(error.message || "Unable to load accounts.");
        } else {
            setAccounts(data || []);
        }

        setLoadingAccounts(false);
    };

    useEffect(() => {
        loadReferenceData();
        loadAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- Helpers ----------
    const dbDateToInput = (value) => {
        if (!value) return "";
        // works for "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss"
        return String(value).split("T")[0];
    };

    const getCompanyName = (id) =>
        companies.find((c) => c.id_company === id)?.company_name || "-";

    const getEmailAddress = (id) =>
        emails.find((e) => e.id_email === id)?.email_address || "-";

    const getPasswordDisplay = (id) => {
        const pwd = passwords.find((p) => p.id_password === id)?.password;
        if (!pwd) return "-";
        const length = Math.min(pwd.length, 8);
        return "•".repeat(length || 6);
    };

    const formatCardNumber = (value) => {
        if (!value) return "";
        const digits = String(value).replace(/\s+/g, "");
        const last4 = digits.slice(-4);
        return `•••• ${last4}`;
    };

    const getCardLabel = (id) => {
        const card = cards.find((c) => c.id_card === id);
        if (!card) return "-";
        return `${card.owner_name || "Card"} – ${formatCardNumber(
            card.card_number
        )}`;
    };

    const referencesReady =
        companies.length > 0 &&
        emails.length > 0 &&
        cards.length > 0 &&
        !loadingRefs;

    const resetForm = () => {
        setFormAccountName("");
        setFormCompanyId("");
        setFormEmailId("");
        setFormPassword("");
        setFormCardId("");
        setFormPaymentDate("");
        setAccountsError("");
    };

    // ---------- Create ----------
    const openCreateModal = () => {
        setCurrentAccount(null);
        resetForm();
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (
            !formAccountName.trim() ||
            !formCompanyId ||
            !formEmailId ||
            !formPassword.trim() ||
            !formCardId ||
            !formPaymentDate
        ) {
            setAccountsError("All fields are required for an account.");
            return;
        }

        setAccountsError("");
        setSaving(true);

        try {
            // 1) Crear la fila en passwords
            const { data: passwordRow, error: passwordError } = await supabase
                .from("passwords")
                .insert({ password: formPassword.trim() })
                .select()
                .single();

            if (passwordError) {
                console.error(passwordError);
                setAccountsError(
                    passwordError.message || "Unable to create password."
                );
                return;
            }

            // actualizar cache local de passwords
            setPasswords((prev) => [...prev, passwordRow]);

            // 2) Crear la account ligada a ese password
            const payload = {
                account_name: formAccountName.trim(),
                id_company: Number(formCompanyId),
                id_email: Number(formEmailId),
                id_password: passwordRow.id_password,
                id_card: Number(formCardId),
                payment_date: formPaymentDate,
            };

            const { data, error } = await supabase
                .from("accounts")
                .insert(payload)
                .select()
                .single();

            if (error) {
                console.error(error);
                setAccountsError(error.message || "Unable to create account.");
                return;
            }

            setAccounts((prev) => [data, ...prev]);
            setCreateOpen(false);
        } finally {
            setSaving(false);
        }
    };

    // ---------- Edit ----------
    const openEditModal = (row) => {
        setCurrentAccount(row);
        setFormAccountName(row.account_name || "");
        setFormCompanyId(
            row.id_company != null ? String(row.id_company) : ""
        );
        setFormEmailId(row.id_email != null ? String(row.id_email) : "");
        const passwordRow = passwords.find(
            (p) => p.id_password === row.id_password
        );
        setFormPassword(passwordRow?.password || "");
        setFormCardId(row.id_card != null ? String(row.id_card) : "");
        setFormPaymentDate(dbDateToInput(row.payment_date));
        setAccountsError("");
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!currentAccount) return;

        if (
            !formAccountName.trim() ||
            !formCompanyId ||
            !formEmailId ||
            !formPassword.trim() ||
            !formCardId ||
            !formPaymentDate
        ) {
            setAccountsError("All fields are required for an account.");
            return;
        }

        setAccountsError("");
        setSaving(true);

        try {
            // 1) Upsert del password
            let passwordId = currentAccount.id_password;

            if (passwordId) {
                const { data: passwordRow, error: passwordError } = await supabase
                    .from("passwords")
                    .update({ password: formPassword.trim() })
                    .eq("id_password", passwordId)
                    .select()
                    .single();

                if (passwordError) {
                    console.error(passwordError);
                    setAccountsError(
                        passwordError.message || "Unable to update password."
                    );
                    return;
                }

                passwordId = passwordRow.id_password;
                setPasswords((prev) =>
                    prev.map((p) =>
                        p.id_password === passwordRow.id_password ? passwordRow : p
                    )
                );
            } else {
                const { data: passwordRow, error: passwordError } = await supabase
                    .from("passwords")
                    .insert({ password: formPassword.trim() })
                    .select()
                    .single();

                if (passwordError) {
                    console.error(passwordError);
                    setAccountsError(
                        passwordError.message || "Unable to create password."
                    );
                    return;
                }

                passwordId = passwordRow.id_password;
                setPasswords((prev) => [...prev, passwordRow]);
            }

            // 2) Update de la account
            const payload = {
                account_name: formAccountName.trim(),
                id_company: Number(formCompanyId),
                id_email: Number(formEmailId),
                id_password: passwordId,
                id_card: Number(formCardId),
                payment_date: formPaymentDate,
            };

            const { data, error } = await supabase
                .from("accounts")
                .update(payload)
                .eq("id_account", currentAccount.id_account)
                .select()
                .single();

            if (error) {
                console.error(error);
                setAccountsError(error.message || "Unable to update account.");
                return;
            }

            setAccounts((prev) =>
                prev.map((item) =>
                    item.id_account === data.id_account ? data : item
                )
            );
            setEditOpen(false);
        } finally {
            setSaving(false);
        }
    };

    // ---------- Delete ----------
    const openDeleteModal = (row) => {
        setCurrentAccount(row);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!currentAccount) return;

        setDeleting(true);
        setAccountsError("");

        try {
            const { error } = await supabase
                .from("accounts")
                .delete()
                .eq("id_account", currentAccount.id_account);

            if (error) {
                console.error(error);
                setAccountsError(error.message || "Unable to delete account.");
                return;
            }

            setAccounts((prev) =>
                prev.filter((item) => item.id_account !== currentAccount.id_account)
            );
            setDeleteOpen(false);
        } finally {
            setDeleting(false);
        }
    };

    // ---------- Render ----------
    return (
        <main className="max-w-6xl mx-auto space-y-4">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Accounts</h1>
                    <p className="text-sm text-emerald-300">
                        Manage streaming accounts and link them to companies, emails,
                        passwords and cards.
                    </p>
                    {refsError && (
                        <p className="mt-1 text-xs text-red-400">{refsError}</p>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-emerald-400/60 cursor-pointer"
                        onClick={loadAccounts}
                        disabled={loadingAccounts}
                    >
                        <LuRefreshCw
                            className={`h-4 w-4 ${loadingAccounts ? "animate-spin" : ""
                                }`}
                        />
                    </Button>

                    <Button
                        className="bg-emerald-500 hover:bg-emerald-600 cursor-pointer"
                        onClick={openCreateModal}
                        disabled={!referencesReady}
                    >
                        <LuPlus className="mr-2 h-4 w-4" />
                        New account
                    </Button>
                </div>
            </header>

            {accountsError && (
                <p className="text-sm text-red-400">{accountsError}</p>
            )}

            <Card className="border-emerald-800 bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Accounts list</CardTitle>
                    <CardDescription>
                        All accounts stored in the <code>accounts</code> table.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingAccounts ? (
                        <p className="text-sm text-emerald-300">Loading accounts...</p>
                    ) : accounts.length === 0 ? (
                        <p className="text-sm text-emerald-300">
                            No accounts found. Click &quot;New account&quot; to add one.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-emerald-800 text-left text-xs uppercase text-emerald-300">
                                        <th className="py-2 pr-4">ID</th>
                                        <th className="py-2 pr-4">Account name</th>
                                        <th className="py-2 pr-4">Company</th>
                                        <th className="py-2 pr-4">Email</th>
                                        <th className="py-2 pr-4">Password</th>
                                        <th className="py-2 pr-4">Card</th>
                                        <th className="py-2 pr-4">Payment date</th>
                                        <th className="py-2 pr-4">Created at</th>
                                        <th className="py-2 pr-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((row) => (
                                        <tr
                                            key={row.id_account}
                                            className="border-b border-emerald-900/60 last:border-b-0"
                                        >
                                            <td className="py-2 pr-4 align-middle text-emerald-100">
                                                {row.id_account}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-50">
                                                {row.account_name}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {getCompanyName(row.id_company)}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {getEmailAddress(row.id_email)}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {getPasswordDisplay(row.id_password)}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {getCardLabel(row.id_card)}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {row.payment_date
                                                    ? dbDateToInput(row.payment_date)
                                                    : "-"}
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
            <Dialog
                open={createOpen}
                onOpenChange={(open) => {
                    setCreateOpen(open);
                    if (!open) {
                        resetForm();
                        setCurrentAccount(null);
                    }
                }}
            >
                <DialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <DialogHeader>
                        <DialogTitle>New account</DialogTitle>
                        <DialogDescription>
                            Link an account to a company, email, password and card.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="new-account-name">Account name</Label>
                            <Input
                                id="new-account-name"
                                type="text"
                                placeholder="e.g. Netflix main"
                                value={formAccountName}
                                onChange={(e) => setFormAccountName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Company</Label>
                            <Select
                                value={formCompanyId}
                                onValueChange={setFormCompanyId}
                                disabled={saving || loadingRefs}
                            >
                                <SelectTrigger className="w-full bg-emerald-900 border-emerald-700">
                                    <SelectValue placeholder="Select a company" />
                                </SelectTrigger>
                                <SelectContent className="bg-emerald-950 border-emerald-700 text-white">
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

                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Select
                                value={formEmailId}
                                onValueChange={setFormEmailId}
                                disabled={saving || loadingRefs}
                            >
                                <SelectTrigger className="w-full bg-emerald-900 border-emerald-700">
                                    <SelectValue placeholder="Select an email" />
                                </SelectTrigger>
                                <SelectContent className="bg-emerald-950 border-emerald-700 text-white">
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

                        <div className="space-y-1">
                            <Label htmlFor="new-account-password">Password</Label>
                            <Input
                                id="new-account-password"
                                type="text" // cámbialo a "password" si quieres ocultarlo
                                placeholder="Type the password for this account"
                                value={formPassword}
                                onChange={(e) => setFormPassword(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Card</Label>
                            <Select
                                value={formCardId}
                                onValueChange={setFormCardId}
                                disabled={saving || loadingRefs}
                            >
                                <SelectTrigger className="w-full bg-emerald-900 border-emerald-700">
                                    <SelectValue placeholder="Select a card" />
                                </SelectTrigger>
                                <SelectContent className="bg-emerald-950 border-emerald-700 text-white">
                                    {cards.map((card) => (
                                        <SelectItem
                                            key={card.id_card}
                                            value={String(card.id_card)}
                                        >
                                            {`${card.owner_name || "Card"} – ${formatCardNumber(
                                                card.card_number
                                            )}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-payment-date">Payment date</Label>
                            <Input
                                id="new-payment-date"
                                type="date"
                                value={formPaymentDate}
                                onChange={(e) => setFormPaymentDate(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        {accountsError && (
                            <p className="text-sm text-red-400">{accountsError}</p>
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
            <Dialog
                open={editOpen}
                onOpenChange={(open) => {
                    setEditOpen(open);
                    if (!open) {
                        resetForm();
                        setCurrentAccount(null);
                    }
                }}
            >
                <DialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit account</DialogTitle>
                        <DialogDescription>
                            Update the selected account links and settings.
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
                            <Label>Company</Label>
                            <Select
                                value={formCompanyId}
                                onValueChange={setFormCompanyId}
                                disabled={saving || loadingRefs}
                            >
                                <SelectTrigger className="w-full bg-emerald-900 border-emerald-700">
                                    <SelectValue placeholder="Select a company" />
                                </SelectTrigger>
                                <SelectContent className="bg-emerald-950 border-emerald-700">
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

                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Select
                                value={formEmailId}
                                onValueChange={setFormEmailId}
                                disabled={saving || loadingRefs}
                            >
                                <SelectTrigger className="w-full bg-emerald-900 border-emerald-700">
                                    <SelectValue placeholder="Select an email" />
                                </SelectTrigger>
                                <SelectContent className="bg-emerald-950 border-emerald-700">
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

                        <div className="space-y-1">
                            <Label htmlFor="edit-account-password">Password</Label>
                            <Input
                                id="edit-account-password"
                                type="text"
                                value={formPassword}
                                onChange={(e) => setFormPassword(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Card</Label>
                            <Select
                                value={formCardId}
                                onValueChange={setFormCardId}
                                disabled={saving || loadingRefs}
                            >
                                <SelectTrigger className="w-full bg-emerald-900 border-emerald-700">
                                    <SelectValue placeholder="Select a card" />
                                </SelectTrigger>
                                <SelectContent className="bg-emerald-950 border-emerald-700">
                                    {cards.map((card) => (
                                        <SelectItem
                                            key={card.id_card}
                                            value={String(card.id_card)}
                                        >
                                            {`${card.owner_name || "Card"} – ${formatCardNumber(
                                                card.card_number
                                            )}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-payment-date">Payment date</Label>
                            <Input
                                id="edit-payment-date"
                                type="date"
                                value={formPaymentDate}
                                onChange={(e) => setFormPaymentDate(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        {accountsError && (
                            <p className="text-sm text-red-400">{accountsError}</p>
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
                        <AlertDialogTitle>Delete account</AlertDialogTitle>
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
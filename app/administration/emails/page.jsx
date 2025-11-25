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
    LuPlus,
    LuPencil,
    LuTrash2,
    LuRefreshCw,
} from "react-icons/lu";

export default function EmailsAdminPage() {
    const supabase = useMemo(() => createBrowserClient(), []);

    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [currentEmail, setCurrentEmail] = useState(null);
    const [formEmail, setFormEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Load data
    const loadEmails = async () => {
        setLoading(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("emails")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to load emails.");
        } else {
            setEmails(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadEmails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handlers: create
    const openCreateModal = () => {
        setFormEmail("");
        setCurrentEmail(null);
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!formEmail.trim()) {
            setGlobalError("Email address is required.");
            return;
        }

        setSaving(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("emails")
            .insert({ email_address: formEmail.trim() })
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to create email.");
            return;
        }

        setEmails((prev) => [data, ...prev]);
        setCreateOpen(false);
    };

    // Handlers: edit
    const openEditModal = (row) => {
        setCurrentEmail(row);
        setFormEmail(row.email_address || "");
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!formEmail.trim()) {
            setGlobalError("Email address is required.");
            return;
        }

        if (!currentEmail) return;

        setSaving(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("emails")
            .update({ email_address: formEmail.trim() })
            .eq("id_email", currentEmail.id_email)
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to update email.");
            return;
        }

        setEmails((prev) =>
            prev.map((item) =>
                item.id_email === data.id_email ? data : item
            )
        );
        setEditOpen(false);
    };

    // Handlers: delete
    const openDeleteModal = (row) => {
        setCurrentEmail(row);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!currentEmail) return;

        setDeleting(true);
        setGlobalError("");

        const { error } = await supabase
            .from("emails")
            .delete()
            .eq("id_email", currentEmail.id_email);

        setDeleting(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to delete email.");
            return;
        }

        setEmails((prev) =>
            prev.filter((item) => item.id_email !== currentEmail.id_email)
        );
        setDeleteOpen(false);
    };

    return (
        <main className="max-w-5xl mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Emails</h1>
                    <p className="text-sm text-emerald-300">
                        Manage all email addresses used in your streaming system.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-emerald-400/60 cursor-pointer"
                        onClick={loadEmails}
                        disabled={loading}
                    >
                        <LuRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>

                    <Button
                        className="bg-emerald-500 hover:bg-emerald-600 cursor-pointer"
                        onClick={openCreateModal}
                    >
                        <LuPlus className="mr-2 h-4 w-4" />
                        New email
                    </Button>
                </div>
            </header>

            {globalError && (
                <p className="text-sm text-red-400">{globalError}</p>
            )}

            <Card className="border-emerald-800 bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Email list</CardTitle>
                    <CardDescription>
                        All email addresses stored in the <code>emails</code> table.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-emerald-300">Loading emails...</p>
                    ) : emails.length === 0 ? (
                        <p className="text-sm text-emerald-300">
                            No emails found. Click &quot;New email&quot; to add one.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-emerald-800 text-left text-xs uppercase text-emerald-300">
                                        <th className="py-2 pr-4">ID</th>
                                        <th className="py-2 pr-4">Email address</th>
                                        <th className="py-2 pr-4">Created at</th>
                                        <th className="py-2 pr-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emails.map((row) => (
                                        <tr
                                            key={row.id_email}
                                            className="border-b border-emerald-900/60 last:border-b-0"
                                        >
                                            <td className="py-2 pr-4 align-middle text-emerald-100">
                                                {row.id_email}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-50">
                                                {row.email_address}
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

            {/* Create modal */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <DialogHeader>
                        <DialogTitle>New email</DialogTitle>
                        <DialogDescription>
                            Add a new email address to the system.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="new-email">Email address</Label>
                            <Input
                                id="new-email"
                                type="email"
                                placeholder="email@example.com"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                disabled={saving}
                            />
                        </div>
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

            {/* Edit modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit email</DialogTitle>
                        <DialogDescription>
                            Update the selected email address.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="edit-email">Email address</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                disabled={saving}
                            />
                        </div>
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

            {/* Delete modal */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete email</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-mono text-emerald-200">
                                {currentEmail?.email_address}
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
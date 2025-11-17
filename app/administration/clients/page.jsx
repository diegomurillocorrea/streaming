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

export default function ClientsAdminPage() {
    const supabase = useMemo(() => createBrowserClient(), []);

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [currentClient, setCurrentClient] = useState(null);

    const [formName, setFormName] = useState("");
    const [formLastName, setFormLastName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPhoneNumber, setFormPhoneNumber] = useState("");

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // ------- Load data -------
    const loadClients = async () => {
        setLoading(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("clients")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to load clients.");
        } else {
            setClients(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadClients();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ------- Helpers -------
    const resetForm = () => {
        setFormName("");
        setFormLastName("");
        setFormEmail("");
        setFormPhoneNumber("");
        setGlobalError("");
    };

    // ------- Create -------
    const openCreateModal = () => {
        setCurrentClient(null);
        resetForm();
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!formName.trim() || !formLastName.trim()) {
            setGlobalError("Name and last name are required.");
            return;
        }

        setGlobalError("");
        setSaving(true);

        const payload = {
            name: formName.trim(),
            lastName: formLastName.trim(),
            email: formEmail.trim() || null,
            phoneNumber: formPhoneNumber.trim() || null,
        };

        const { data, error } = await supabase
            .from("clients")
            .insert(payload)
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to create client.");
            return;
        }

        setClients((prev) => [data, ...prev]);
        setCreateOpen(false);
    };

    // ------- Edit -------
    const openEditModal = (row) => {
        setCurrentClient(row);
        setFormName(row.name || "");
        setFormLastName(row.lastName || "");
        setFormEmail(row.email || "");
        setFormPhoneNumber(row.phoneNumber || "");
        setGlobalError("");
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!currentClient) return;

        if (!formName.trim() || !formLastName.trim()) {
            setGlobalError("Name and last name are required.");
            return;
        }

        setGlobalError("");
        setSaving(true);

        const payload = {
            name: formName.trim(),
            lastName: formLastName.trim(),
            email: formEmail.trim() || null,
            phoneNumber: formPhoneNumber.trim() || null,
        };

        const { data, error } = await supabase
            .from("clients")
            .update(payload)
            .eq("id_client", currentClient.id_client)
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to update client.");
            return;
        }

        setClients((prev) =>
            prev.map((item) =>
                item.id_client === data.id_client ? data : item
            )
        );
        setEditOpen(false);
    };

    // ------- Delete -------
    const openDeleteModal = (row) => {
        setCurrentClient(row);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!currentClient) return;

        setDeleting(true);
        setGlobalError("");

        const { error } = await supabase
            .from("clients")
            .delete()
            .eq("id_client", currentClient.id_client);

        setDeleting(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "Unable to delete client.");
            return;
        }

        setClients((prev) =>
            prev.filter((item) => item.id_client !== currentClient.id_client)
        );
        setDeleteOpen(false);
    };

    // ------- Render -------
    return (
        <main className="max-w-5xl mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Clients</h1>
                    <p className="text-sm text-emerald-300">
                        Manage the clients that use your streaming services.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-emerald-400/60 cursor-pointer"
                        onClick={loadClients}
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
                        New client
                    </Button>
                </div>
            </header>

            {globalError && (
                <p className="text-sm text-red-400">{globalError}</p>
            )}

            <Card className="border-emerald-800 bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Client list</CardTitle>
                    <CardDescription>
                        All clients stored in the <code>clients</code> table.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-emerald-300">Loading clients...</p>
                    ) : clients.length === 0 ? (
                        <p className="text-sm text-emerald-300">
                            No clients found. Click &quot;New client&quot; to add one.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-emerald-800 text-left text-xs uppercase text-emerald-300">
                                        <th className="py-2 pr-4">ID</th>
                                        <th className="py-2 pr-4">Name</th>
                                        <th className="py-2 pr-4">Last name</th>
                                        <th className="py-2 pr-4">Email</th>
                                        <th className="py-2 pr-4">Phone</th>
                                        <th className="py-2 pr-4">Created at</th>
                                        <th className="py-2 pr-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((row) => (
                                        <tr
                                            key={row.id_client}
                                            className="border-b border-emerald-900/60 last:border-b-0"
                                        >
                                            <td className="py-2 pr-4 align-middle text-emerald-100">
                                                {row.id_client}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-50">
                                                {row.name}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-50">
                                                {row.lastName}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {row.email || "-"}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-200">
                                                {row.phoneNumber || "-"}
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
                        <DialogTitle>New client</DialogTitle>
                        <DialogDescription>
                            Add a new client to the system.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="new-name">Name</Label>
                            <Input
                                id="new-name"
                                type="text"
                                placeholder="First name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-lastName">Last name</Label>
                            <Input
                                id="new-lastName"
                                type="text"
                                placeholder="Last name"
                                value={formLastName}
                                onChange={(e) => setFormLastName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-email">Email</Label>
                            <Input
                                id="new-email"
                                type="email"
                                placeholder="email@example.com"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-phone">Phone number</Label>
                            <Input
                                id="new-phone"
                                type="tel"
                                placeholder="+503 0000 0000"
                                value={formPhoneNumber}
                                onChange={(e) => setFormPhoneNumber(e.target.value)}
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

            {/* Edit modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit client</DialogTitle>
                        <DialogDescription>
                            Update the selected client.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-lastName">Last name</Label>
                            <Input
                                id="edit-lastName"
                                type="text"
                                value={formLastName}
                                onChange={(e) => setFormLastName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-phone">Phone number</Label>
                            <Input
                                id="edit-phone"
                                type="tel"
                                value={formPhoneNumber}
                                onChange={(e) => setFormPhoneNumber(e.target.value)}
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

            {/* Delete modal */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete client</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-mono text-emerald-200">
                                {currentClient?.name} {currentClient?.lastName}
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
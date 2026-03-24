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

import {
    LuPlus,
    LuPencil,
    LuTrash2,
    LuRefreshCw,
} from "react-icons/lu";

import { TableScrollArea } from "@/components/admin/table-scroll-area";
import { TableSearchInput } from "@/components/admin/table-search-input";
import { rowMatchesSearch } from "@/lib/table-search";

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

    const [tableSearch, setTableSearch] = useState("");

    const filteredEmails = useMemo(() => {
        if (!tableSearch.trim()) return emails;
        return emails.filter((row) =>
            rowMatchesSearch(
                [row.id_email, row.email_address, row.created_at],
                tableSearch
            )
        );
    }, [emails, tableSearch]);

    // Load data
    const loadEmails = async () => {
        setLoading(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("emails")
            .select("*")
            .order("id_email", { ascending: true });

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudieron cargar los correos.");
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
            setGlobalError("El correo es obligatorio.");
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
            setGlobalError(error.message || "No se pudo crear el correo.");
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
            setGlobalError("El correo es obligatorio.");
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
            setGlobalError(error.message || "No se pudo actualizar el correo.");
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
            setGlobalError(error.message || "No se pudo eliminar el correo.");
            return;
        }

        setEmails((prev) =>
            prev.filter((item) => item.id_email !== currentEmail.id_email)
        );
        setDeleteOpen(false);
    };

    return (
        <main className="mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Correos</h1>
                    <p className="text-sm text-zinc-600 dark:text-emerald-300">
                        Administra todos los correos usados en tu sistema.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                        onClick={loadEmails}
                        disabled={loading}
                    >
                        <LuRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>

                    <Button
                        className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={openCreateModal}
                    >
                        <LuPlus className="mr-2 h-4 w-4" />
                        Nuevo correo
                    </Button>
                </div>
            </header>

            {globalError && (
                <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
            )}

            <Card className="border border-zinc-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Lista de correos</CardTitle>
                    <CardDescription>
                        All email addresses stored in the <code>emails</code> table.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <TableSearchInput
                        id="emails-table-search"
                        value={tableSearch}
                        onChange={setTableSearch}
                        placeholder="Buscar por ID o dirección de correo…"
                        aria-label="Buscar en la lista de correos"
                    />
                    <TableScrollArea>
                        <table className="w-full min-w-max border-collapse text-sm">
                            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
                                <tr className="text-left text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-300">
                                    <th className="py-3.5 px-4">ID</th>
                                    <th className="py-3.5 px-4">Correo</th>
                                    <th className="py-3.5 px-4">Creado el</th>
                                    <th className="py-3.5 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            Cargando correos...
                                        </td>
                                    </tr>
                                ) : emails.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No se encontraron correos. Haz clic en &quot;Nuevo
                                            correo&quot; para agregar uno.
                                        </td>
                                    </tr>
                                ) : filteredEmails.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No hay resultados para &quot;{tableSearch.trim()}&quot;.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmails.map((row) => (
                                        <tr
                                            key={row.id_email}
                                            className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                                        >
                                            <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                                                {row.id_email}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                {row.email_address}
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

            {/* Create modal */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Nuevo correo</DialogTitle>
                        <DialogDescription>
                            Agrega un nuevo correo al sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="new-email">Correo</Label>
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

            {/* Edit modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Editar correo</DialogTitle>
                        <DialogDescription>
                            Actualiza el correo seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="edit-email">Correo</Label>
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

            {/* Delete modal */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar correo</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Seguro que deseas eliminar{" "}
                            <span className="font-mono text-zinc-700 dark:text-emerald-200">
                                {currentEmail?.email_address}
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
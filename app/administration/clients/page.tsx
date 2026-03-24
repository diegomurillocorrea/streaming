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

    const [tableSearch, setTableSearch] = useState("");

    const filteredClients = useMemo(() => {
        if (!tableSearch.trim()) return clients;
        return clients.filter((row) =>
            rowMatchesSearch(
                [
                    row.id_client,
                    row.name,
                    row.lastName,
                    row.email,
                    row.phoneNumber,
                    row.created_at,
                ],
                tableSearch
            )
        );
    }, [clients, tableSearch]);

    // ------- Load data -------
    const loadClients = async () => {
        setLoading(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("clients")
            .select("*")
            .order("id_client", { ascending: true });

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudieron cargar los clientes.");
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
            setGlobalError("El nombre y apellido son obligatorios.");
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
            setGlobalError(error.message || "No se pudo crear el cliente.");
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
            setGlobalError("El nombre y apellido son obligatorios.");
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
            setGlobalError(error.message || "No se pudo actualizar el cliente.");
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
            setGlobalError(error.message || "No se pudo eliminar el cliente.");
            return;
        }

        setClients((prev) =>
            prev.filter((item) => item.id_client !== currentClient.id_client)
        );
        setDeleteOpen(false);
    };

    // ------- Render -------
    return (
        <main className="mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Clientes</h1>
                    <p className="text-sm text-zinc-600 dark:text-emerald-300">
                        Administra los clientes que usan tus servicios de streaming.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                        onClick={loadClients}
                        disabled={loading}
                    >
                        <LuRefreshCw
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        />
                    </Button>

                    <Button
                        className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={openCreateModal}
                    >
                        <LuPlus className="mr-2 h-4 w-4" />
                        Nuevo cliente
                    </Button>
                </div>
            </header>

            {globalError && (
                <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
            )}

            <Card className="border border-zinc-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Lista de clientes</CardTitle>
                    <CardDescription>
                        Todos los clientes guardados en la tabla <code>clients</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <TableSearchInput
                        id="clients-table-search"
                        value={tableSearch}
                        onChange={setTableSearch}
                        placeholder="Buscar por nombre, apellido, email o teléfono…"
                        aria-label="Buscar en la lista de clientes"
                    />
                    <TableScrollArea>
                        <table className="w-full min-w-max border-collapse text-sm">
                            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
                                <tr className="text-left text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-300">
                                    <th className="py-3.5 px-4">ID</th>
                                    <th className="py-3.5 px-4">Nombre</th>
                                    <th className="py-3.5 px-4">Apellido</th>
                                    <th className="py-3.5 px-4">Email</th>
                                    <th className="py-3.5 px-4">Teléfono</th>
                                    <th className="py-3.5 px-4">Creado el</th>
                                    <th className="py-3.5 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            Cargando clientes...
                                        </td>
                                    </tr>
                                ) : clients.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No se encontraron clientes. Haz clic en &quot;Nuevo
                                            cliente&quot; para agregar uno.
                                        </td>
                                    </tr>
                                ) : filteredClients.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No hay resultados para &quot;{tableSearch.trim()}&quot;.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClients.map((row) => (
                                        <tr
                                            key={row.id_client}
                                            className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                                        >
                                            <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                                                {row.id_client}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                {row.name}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                {row.lastName}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                {row.email || "-"}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                {row.phoneNumber || "-"}
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
                        <DialogTitle>Nuevo cliente</DialogTitle>
                        <DialogDescription>
                            Agrega un nuevo cliente al sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="new-name">Nombre</Label>
                            <Input
                                id="new-name"
                                type="text"
                                placeholder="Nombre"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="new-lastName">Apellido</Label>
                            <Input
                                id="new-lastName"
                                type="text"
                                placeholder="Apellido"
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
                            <Label htmlFor="new-phone">Teléfono</Label>
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

            {/* Edit modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Editar cliente</DialogTitle>
                        <DialogDescription>
                            Actualiza el cliente seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="edit-name">Nombre</Label>
                            <Input
                                id="edit-name"
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-lastName">Apellido</Label>
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
                            <Label htmlFor="edit-phone">Teléfono</Label>
                            <Input
                                id="edit-phone"
                                type="tel"
                                value={formPhoneNumber}
                                onChange={(e) => setFormPhoneNumber(e.target.value)}
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

            {/* Delete modal */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Seguro que deseas eliminar a{" "}
                            <span className="font-mono text-zinc-700 dark:text-emerald-200">
                                {currentClient?.name} {currentClient?.lastName}
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
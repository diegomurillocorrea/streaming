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

export default function CompaniesAdminPage() {
    const supabase = useMemo(() => createBrowserClient(), []);

    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [currentCompany, setCurrentCompany] = useState(null);
    const [formCompanyName, setFormCompanyName] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Load data
    const loadCompanies = async () => {
        setLoading(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("companies")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudieron cargar las empresas.");
        } else {
            setCompanies(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Create
    const openCreateModal = () => {
        setFormCompanyName("");
        setCurrentCompany(null);
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!formCompanyName.trim()) {
            setGlobalError("El nombre de la empresa es obligatorio.");
            return;
        }

        setSaving(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("companies")
            .insert({ company_name: formCompanyName.trim() })
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudo crear la empresa.");
            return;
        }

        setCompanies((prev) => [data, ...prev]);
        setCreateOpen(false);
    };

    // Edit
    const openEditModal = (row) => {
        setCurrentCompany(row);
        setFormCompanyName(row.company_name || "");
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!formCompanyName.trim()) {
            setGlobalError("El nombre de la empresa es obligatorio.");
            return;
        }

        if (!currentCompany) return;

        setSaving(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("companies")
            .update({ company_name: formCompanyName.trim() })
            .eq("id_company", currentCompany.id_company)
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudo actualizar la empresa.");
            return;
        }

        setCompanies((prev) =>
            prev.map((item) =>
                item.id_company === data.id_company ? data : item
            )
        );
        setEditOpen(false);
    };

    // Delete
    const openDeleteModal = (row) => {
        setCurrentCompany(row);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!currentCompany) return;

        setDeleting(true);
        setGlobalError("");

        const { error } = await supabase
            .from("companies")
            .delete()
            .eq("id_company", currentCompany.id_company);

        setDeleting(false);

        if (error) {
            console.error(error);
            setGlobalError(error.message || "No se pudo eliminar la empresa.");
            return;
        }

        setCompanies((prev) =>
            prev.filter((item) => item.id_company !== currentCompany.id_company)
        );
        setDeleteOpen(false);
    };

    return (
        <main className="max-w-5xl mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Empresas</h1>
                    <p className="text-sm text-emerald-300">
                        Administra las empresas vinculadas a tus suscripciones.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-emerald-400/60 cursor-pointer"
                        onClick={loadCompanies}
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
                        Nueva empresa
                    </Button>
                </div>
            </header>

            {globalError && (
                <p className="text-sm text-red-400">{globalError}</p>
            )}

            <Card className="border-emerald-800 bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Lista de empresas</CardTitle>
                    <CardDescription>
                        All companies stored in the <code>companies</code> table.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-emerald-300">Cargando empresas...</p>
                    ) : companies.length === 0 ? (
                        <p className="text-sm text-emerald-300">
                            No se encontraron empresas. Haz clic en &quot;Nueva empresa&quot; para agregar una.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-emerald-800 text-left text-xs uppercase text-emerald-300">
                                        <th className="py-2 pr-4">ID</th>
                                        <th className="py-2 pr-4">Nombre de empresa</th>
                                        <th className="py-2 pr-4">Creado el</th>
                                        <th className="py-2 pr-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map((row) => (
                                        <tr
                                            key={row.id_company}
                                            className="border-b border-emerald-900/60 last:border-b-0"
                                        >
                                            <td className="py-2 pr-4 align-middle text-emerald-100">
                                                {row.id_company}
                                            </td>
                                            <td className="py-2 pr-4 align-middle text-emerald-50">
                                                {row.company_name}
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
                        <DialogTitle>Nueva empresa</DialogTitle>
                        <DialogDescription>
                            Agrega una nueva empresa al sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="new-company">Nombre de empresa</Label>
                            <Input
                                id="new-company"
                                type="text"
                                placeholder="Nombre de empresa"
                                value={formCompanyName}
                                onChange={(e) => setFormCompanyName(e.target.value)}
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
                            className="bg-emerald-500 hover:bg-emerald-600"
                        >
                            {saving ? "Guardando..." : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Editar empresa</DialogTitle>
                        <DialogDescription>
                            Actualiza la empresa seleccionada.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="edit-company">Nombre de empresa</Label>
                            <Input
                                id="edit-company"
                                type="text"
                                value={formCompanyName}
                                onChange={(e) => setFormCompanyName(e.target.value)}
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
                            className="bg-emerald-500 hover:bg-emerald-600"
                        >
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete modal */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="bg-emerald-950 border-emerald-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar empresa</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Seguro que deseas eliminar{" "}
                            <span className="font-mono text-emerald-200">
                                {currentCompany?.company_name}
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
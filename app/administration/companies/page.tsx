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
    const [formMembershipMonthlyCost, setFormMembershipMonthlyCost] =
        useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [tableSearch, setTableSearch] = useState("");

    const filteredCompanies = useMemo(() => {
        if (!tableSearch.trim()) return companies;
        return companies.filter((row) =>
            rowMatchesSearch(
                [
                    row.id_company,
                    row.company_name,
                    row.created_at,
                    row.membership_monthly_cost != null
                        ? String(row.membership_monthly_cost)
                        : "",
                ],
                tableSearch
            )
        );
    }, [companies, tableSearch]);

    // Load data
    const loadCompanies = async () => {
        setLoading(true);
        setGlobalError("");

        const { data, error } = await supabase
            .from("companies")
            .select("*")
            .order("id_company", { ascending: true });

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
    const parseMembershipMonthlyCostInput = (raw) => {
        const t = String(raw ?? "").trim();
        if (t === "") return null;
        const n = Number.parseFloat(t);
        return Number.isNaN(n) ? null : n;
    };

    const openCreateModal = () => {
        setFormCompanyName("");
        setFormMembershipMonthlyCost("");
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
            .insert({
                company_name: formCompanyName.trim(),
                membership_monthly_cost:
                    parseMembershipMonthlyCostInput(formMembershipMonthlyCost),
            })
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
        setFormMembershipMonthlyCost(
            row.membership_monthly_cost !== null &&
                row.membership_monthly_cost !== undefined
                ? String(row.membership_monthly_cost)
                : ""
        );
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
            .update({
                company_name: formCompanyName.trim(),
                membership_monthly_cost:
                    parseMembershipMonthlyCostInput(formMembershipMonthlyCost),
            })
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
        <main className="mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Empresas</h1>
                    <p className="text-sm text-zinc-600 dark:text-emerald-300">
                        Administra las empresas vinculadas a tus suscripciones.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                        onClick={loadCompanies}
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
                        Nueva empresa
                    </Button>
                </div>
            </header>

            {globalError && (
                <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
            )}

            <Card className="border border-zinc-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Lista de empresas</CardTitle>
                    <CardDescription>
                        All companies stored in the <code>companies</code> table.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <TableSearchInput
                        id="companies-table-search"
                        value={tableSearch}
                        onChange={setTableSearch}
                        placeholder="Buscar por ID, nombre o costo membresía…"
                        aria-label="Buscar en la lista de empresas"
                    />
                    <TableScrollArea>
                        <table className="w-full min-w-max border-collapse text-sm">
                            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
                                <tr className="text-left text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-300">
                                    <th className="py-3.5 px-4">ID</th>
                                    <th className="py-3.5 px-4">Nombre de empresa</th>
                                    <th className="py-3.5 px-4 text-right">
                                        Costo membresía
                                    </th>
                                    <th className="py-3.5 px-4">Creado el</th>
                                    <th className="py-3.5 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            Cargando empresas...
                                        </td>
                                    </tr>
                                ) : companies.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No se encontraron empresas. Haz clic en &quot;Nueva
                                            empresa&quot; para agregar una.
                                        </td>
                                    </tr>
                                ) : filteredCompanies.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No hay resultados para &quot;{tableSearch.trim()}&quot;.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCompanies.map((row) => (
                                        <tr
                                            key={row.id_company}
                                            className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                                        >
                                            <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                                                {row.id_company}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                {row.company_name}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-right text-zinc-600 dark:text-emerald-200">
                                                {row.membership_monthly_cost !==
                                                    null &&
                                                row.membership_monthly_cost !==
                                                    undefined
                                                    ? `$${Number(
                                                          row.membership_monthly_cost
                                                      ).toFixed(2)}`
                                                    : "-"}
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
                        <div className="space-y-1">
                            <Label htmlFor="new-membership-cost">
                                Costo membresía (mensual)
                            </Label>
                            <p
                                id="new-membership-cost-hint"
                                className="text-xs text-zinc-500 dark:text-emerald-400"
                            >
                                Lo que cuesta comprar la membresía mensual en la plataforma.
                            </p>
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-zinc-600 dark:text-emerald-200">
                                    $
                                </span>
                                <Input
                                    id="new-membership-cost"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formMembershipMonthlyCost}
                                    onChange={(e) =>
                                        setFormMembershipMonthlyCost(e.target.value)
                                    }
                                    disabled={saving}
                                    aria-describedby="new-membership-cost-hint"
                                />
                            </div>
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
                        <div className="space-y-1">
                            <Label htmlFor="edit-membership-cost">
                                Costo membresía (mensual)
                            </Label>
                            <p
                                id="edit-membership-cost-hint"
                                className="text-xs text-zinc-500 dark:text-emerald-400"
                            >
                                Lo que cuesta comprar la membresía mensual en la plataforma.
                            </p>
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-zinc-600 dark:text-emerald-200">
                                    $
                                </span>
                                <Input
                                    id="edit-membership-cost"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formMembershipMonthlyCost}
                                    onChange={(e) =>
                                        setFormMembershipMonthlyCost(e.target.value)
                                    }
                                    disabled={saving}
                                    aria-describedby="edit-membership-cost-hint"
                                />
                            </div>
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
                        <AlertDialogTitle>Eliminar empresa</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Seguro que deseas eliminar{" "}
                            <span className="font-mono text-zinc-700 dark:text-emerald-200">
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
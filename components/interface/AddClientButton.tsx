"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

export function AddClientButton({ accountId, clients }) {
    const [open, setOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [loading, setLoading] = useState(false);

    const supabase = createBrowserClient();
    const router = useRouter();

    const handleCreate = async () => {
        if (!selectedClientId || !accountId) return;
        setLoading(true);

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        const { error } = await supabase.from("subscriptions").insert({
            id_account: accountId,
            id_client: selectedClientId,
            service_start_date: today,
            period_in_months: 1,
            service_end_date: null,
        });

        setLoading(false);

        if (error) {
            console.error(error);
            alert(error.message || "Error al crear la suscripción");
            return;
        }

        setOpen(false);
        setSelectedClientId(null);
        router.refresh();
    };

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                className="cursor-pointer border-zinc-300 text-xs hover:bg-zinc-50 dark:border-emerald-400/60"
                onClick={() => setOpen(true)}
            >
                Agregar cliente
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-50">
                    <DialogHeader>
                        <DialogTitle className="text-base">
                            Agregar cliente a esta cuenta
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-600 dark:text-emerald-300">
                            Selecciona un cliente existente para vincularlo a esta cuenta.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-2">
                        <label className="text-xs text-zinc-600 dark:text-emerald-300">
                            Elegir cliente
                        </label>
                        <select
                            className="w-full rounded-md border border-zinc-200 bg-white p-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-emerald-800 dark:bg-emerald-900 dark:text-emerald-50"
                            value={selectedClientId ?? ""}
                            onChange={(e) =>
                                setSelectedClientId(
                                    e.target.value ? Number(e.target.value) : null
                                )
                            }
                        >
                            <option value="">Selecciona un cliente...</option>
                            {clients?.map((client) => (
                                <option key={client.id_client} value={client.id_client}>
                                    {client.name} {client.lastName} – {client.phoneNumber ?? ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <DialogFooter className="mt-4 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={handleCreate}
                            disabled={loading || !selectedClientId}
                        >
                            {loading ? "Guardando..." : "Agregar cliente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
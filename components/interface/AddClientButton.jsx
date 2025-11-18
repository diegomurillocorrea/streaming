"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
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
            alert(error.message || "Error creating subscription");
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
                className="border-emerald-400/60 text-xs cursor-pointer"
                onClick={() => setOpen(true)}
            >
                Add new client
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-emerald-950 border-emerald-800 text-emerald-50">
                    <DialogHeader>
                        <DialogTitle className="text-base">
                            Add client to this account
                        </DialogTitle>
                        <DialogDescription className="text-xs text-emerald-300">
                            Select an existing client to link it to this streaming account.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-2">
                        <label className="text-xs text-emerald-300">
                            Choose a client
                        </label>
                        <select
                            className="w-full rounded-md border border-emerald-800 bg-emerald-900 p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                            value={selectedClientId ?? ""}
                            onChange={(e) =>
                                setSelectedClientId(
                                    e.target.value ? Number(e.target.value) : null
                                )
                            }
                        >
                            <option value="">Select a client...</option>
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
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
                            onClick={handleCreate}
                            disabled={loading || !selectedClientId}
                        >
                            {loading ? "Saving..." : "Add client"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
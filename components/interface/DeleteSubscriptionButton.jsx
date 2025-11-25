"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function DeleteSubscriptionButton({ subscriptionId }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createBrowserClient();

    const handleConfirmDelete = async () => {
        setLoading(true);

        const { error } = await supabase
            .from("subscriptions")
            .delete()
            .eq("id_subscription", subscriptionId);

        setLoading(false);

        if (error) {
            console.error(error);
            // Si ya tenés toasts, aquí podrías usar uno en vez de alert
            alert("Error deleting subscription");
            return;
        }

        router.refresh();
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/60 text-red-400 hover:bg-red-500/10"
                >
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-emerald-950 border-emerald-700 text-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete client from this account?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove the subscription for this client from this
                        streaming account. Recorded payments will not be deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirmDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
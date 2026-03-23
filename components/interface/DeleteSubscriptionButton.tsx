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
            alert("Error al eliminar la suscripción");
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
                    Eliminar
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-emerald-950 border-emerald-700 text-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar cliente de esta cuenta?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esto eliminará la suscripción de este cliente en esta cuenta.
                        Los pagos registrados no se eliminarán.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirmDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {loading ? "Eliminando..." : "Eliminar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
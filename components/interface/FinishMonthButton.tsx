"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
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

function addMonths(dateStr, months) {
    const base = dateStr ? new Date(dateStr) : new Date();
    if (Number.isNaN(base.getTime())) return null;

    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d;
}

export function FinishMonthButton({ accountId }) {
    const router = useRouter();
    const supabase = createBrowserClient();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFinishMonth = async () => {
        if (!accountId) return;

        setLoading(true);

        try {
            // 1) Traemos todas las subscriptions de esta cuenta + sus payments
            const { data: subs, error } = await supabase
                .from("subscriptions")
                .select(`
          id_subscription,
          service_start_date,
          period_in_months,
          payments (
            id_payment,
            id_bank_account,
            amount,
            payment_date,
            paid_month
          )
        `)
                .eq("id_account", accountId);

            if (error) {
                console.error("cerrar mes - error al cargar suscripciones", error);
                return;
            }

            if (!subs || subs.length === 0) {
                setOpen(false);
                return;
            }

            for (const sub of subs) {
                const period =
                    sub.period_in_months && sub.period_in_months > 0
                        ? sub.period_in_months
                        : 1;

                // --- calcular nueva fecha de inicio de servicio ---
                const nextServiceDate = addMonths(sub.service_start_date, period);
                if (!nextServiceDate) continue;

                const nextServiceDateStr = nextServiceDate
                    .toISOString()
                    .slice(0, 10); // yyyy-mm-dd

                // paid_month = día 1 del nuevo mes
                const nextPaidMonth = new Date(
                    nextServiceDate.getFullYear(),
                    nextServiceDate.getMonth(),
                    1
                )
                    .toISOString()
                    .slice(0, 10);

                // payment_date no puede ser null
                const paymentDateISO = new Date().toISOString();

                // --- buscar el ÚLTIMO payment con bank no nulo (si existe) ---
                const payments = Array.isArray(sub.payments) ? sub.payments : [];
                let lastBankAccountId = null;

                if (payments.length > 0) {
                    // primero filtramos los que sí tienen banco
                    const withBank = payments.filter(
                        (p) => p.id_bank_account !== null && p.id_bank_account !== undefined
                    );

                    const baseArray =
                        withBank.length > 0 ? withBank : payments; // si ninguno tiene banco, usamos todos

                    const sorted = [...baseArray].sort((a, b) => {
                        const aDate = a.paid_month ?? a.payment_date;
                        const bDate = b.paid_month ?? b.payment_date;
                        return new Date(bDate).getTime() - new Date(aDate).getTime()
                    })

                    lastBankAccountId = sorted[0]?.id_bank_account ?? null;
                }

                // 2) Actualizar subscription al nuevo periodo
                const { error: updateError } = await supabase
                    .from("subscriptions")
                    .update({
                        service_start_date: nextServiceDateStr,
                    })
                    .eq("id_subscription", sub.id_subscription);

                if (updateError) {
                    console.error(
                        "cerrar mes - error al actualizar suscripción",
                        updateError
                    );
                    continue;
                }

                // 3) Insertar registro de pago del NUEVO mes
                //    - amount siempre 0.00 al iniciar mes
                //    - id_bank_account = último banco no nulo que se tenga
                const { error: insertError } = await supabase.from("payments").insert({
                    id_subscription: sub.id_subscription,
                    id_bank_account: lastBankAccountId,
                    amount: 0,
                    payment_date: paymentDateISO,
                    paid_month: nextPaidMonth,
                });

                if (insertError) {
                    console.error("cerrar mes - error al insertar pago", insertError);
                }
            }

            // cerrar modal y refrescar la tabla
            setOpen(false);
            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
                onClick={() => setOpen(true)}
            >
                Cerrar mes
            </Button>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent className="bg-emerald-950 border-emerald-800 text-emerald-50">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cerrar mes actual</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-emerald-300">
                            Esto moverá todas las suscripciones de esta cuenta al siguiente
                            período. La{" "}
                            <span className="font-semibold">fecha de inicio del servicio</span>{" "}
                            avanzará al próximo mes y el{" "}
                            <span className="font-semibold">pago</span> se reiniciará a{" "}
                            <span className="font-semibold">$0.00</span> para el nuevo mes.
                            Los pagos anteriores (con su monto y banco) quedarán en el
                            historial.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="cursor-pointer"
                            disabled={loading}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
                            onClick={handleFinishMonth}
                            disabled={loading}
                        >
                            {loading ? "Cerrando..." : "Cerrar mes"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
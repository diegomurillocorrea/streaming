"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { DeleteSubscriptionButton } from "./DeleteSubscriptionButton";

function formatDisplayDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(d);
}

function calcNextPaymentDate(serviceStart, periodStr) {
    if (!serviceStart) return "";
    const months = Number(periodStr);
    if (!months || Number.isNaN(months)) return "";

    const d = new Date(serviceStart);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
}

export function SubscriptionRow({ index, row, bankAccounts, accountPrice }) {
    const supabase = createBrowserClient();

    // --------- STATE LOCAL ----------
    const [userValue, setUserValue] = useState(row.user || "");
    const [pin, setPin] = useState(row.pin || "");
    const [serviceStart, setServiceStart] = useState(row.serviceStartRaw || "");
    const [period, setPeriod] = useState(
        row.periodInMonths != null ? String(row.periodInMonths) : "1"
    );
    const [bankAccountId, setBankAccountId] = useState(
        row.lastPaymentBankId ? String(row.lastPaymentBankId) : ""
    );
    const [paymentAmount, setPaymentAmount] = useState(
        row.lastPaymentAmount != null ? String(row.lastPaymentAmount) : ""
    );

    const [savingSubscription, setSavingSubscription] = useState(false);
    const [savingPayment, setSavingPayment] = useState(false);

    // --------- SINCRONIZAR CUANDO LLEGAN NUEVOS PROPS (router.refresh) ----------
    useEffect(() => {
        setUserValue(row.user || "");
    }, [row.user]);

    useEffect(() => {
        setPin(row.pin || "");
    }, [row.pin]);

    useEffect(() => {
        setServiceStart(row.serviceStartRaw || "");
    }, [row.serviceStartRaw]);

    useEffect(() => {
        setPeriod(
            row.periodInMonths != null ? String(row.periodInMonths) : "1"
        );
    }, [row.periodInMonths]);

    useEffect(() => {
        setBankAccountId(
            row.lastPaymentBankId ? String(row.lastPaymentBankId) : ""
        );
    }, [row.lastPaymentBankId]);

    useEffect(() => {
        setPaymentAmount(
            row.lastPaymentAmount != null ? String(row.lastPaymentAmount) : ""
        );
    }, [row.lastPaymentAmount]);

    // --------- FECHA DE PRÓXIMO PAGO ----------
    const nextPaymentDate = useMemo(
        () => calcNextPaymentDate(serviceStart, period),
        [serviceStart, period]
    );

    const nextPaymentDisplay = useMemo(
        () => (nextPaymentDate ? formatDisplayDate(nextPaymentDate) : "-"),
        [nextPaymentDate]
    );

    // --------- ESTADO DE PAYMENT vs PRICE ----------
    const isPaid = useMemo(() => {
        const priceNum =
            accountPrice != null && accountPrice !== ""
                ? Number(accountPrice)
                : 0;

        if (!priceNum || Number.isNaN(priceNum)) return false;

        const amountNum =
            paymentAmount !== "" && paymentAmount != null
                ? Number(paymentAmount)
                : row.lastPaymentAmount != null
                    ? Number(row.lastPaymentAmount)
                    : 0;

        if (Number.isNaN(amountNum)) return false;

        return amountNum >= priceNum;
    }, [accountPrice, paymentAmount, row.lastPaymentAmount]);

    const paymentStatusLabel = isPaid ? "PAID" : "PENDING";

    // --------- GUARDAR EN subscriptions ----------
    const persistSubscription = async () => {
        setSavingSubscription(true);
        try {
            const updates = {
                user: userValue || null,
                pin: pin || null,
                service_start_date: serviceStart || null,
            };

            const periodNum = Number(period);
            updates.period_in_months =
                Number.isNaN(periodNum) || periodNum <= 0 ? null : periodNum;

            const { error } = await supabase
                .from("subscriptions")
                .update(updates)
                .eq("id_subscription", row.id_subscription);

            if (error) {
                console.error("update subscription error", error);
            }
        } finally {
            setSavingSubscription(false);
        }
    };

    // --------- GUARDAR EN payments ----------
    const persistPayment = async (override = {}) => {
        // Usamos los valores más recientes (los que vienen del handler si los manda)
        const effectiveAmount =
            override.paymentAmount !== undefined
                ? override.paymentAmount
                : paymentAmount;

        const effectiveBankId =
            override.bankAccountId !== undefined
                ? override.bankAccountId
                : bankAccountId;

        const hasAmount =
            effectiveAmount !== "" && effectiveAmount !== null && effectiveAmount !== undefined;
        const hasBank =
            effectiveBankId !== "" && effectiveBankId !== null && effectiveBankId !== undefined;

        // Si no hay nada que guardar, no pegamos al backend
        if (!hasAmount && !hasBank) return;

        const parsedAmount = hasAmount ? Number(effectiveAmount) : 0;
        // si viene vacío o NaN, lo dejamos en 0
        const amountNum = Number.isNaN(parsedAmount) ? 0 : parsedAmount;
        const bankIdNum = hasBank ? Number(effectiveBankId) : null;

        setSavingPayment(true);
        try {
            if (row.lastPaymentId) {
                // UPDATE de un pago existente
                const updateData = {};

                // amount siempre es un número (puede ser 0)
                updateData.amount = amountNum;

                if (bankIdNum !== null) {
                    updateData.id_bank_account = bankIdNum;
                }

                const { error } = await supabase
                    .from("payments")
                    .update(updateData)
                    .eq("id_payment", row.lastPaymentId);

                if (error) {
                    console.error("update payment error", error);
                }
            } else {
                // INSERT de un pago nuevo
                const now = new Date();
                const paidMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                    .toISOString()
                    .slice(0, 10);

                const insertData = {
                    id_subscription: row.id_subscription,
                    amount: amountNum, // si no pusiste nada, será 0
                    payment_date: now.toISOString(),
                    paid_month: paidMonth,
                };

                if (bankIdNum !== null) {
                    insertData.id_bank_account = bankIdNum;
                }

                const { error } = await supabase.from("payments").insert(insertData);

                if (error) {
                    console.error("insert payment error", error);
                }
            }
        } finally {
            setSavingPayment(false);
        }
    };

    // --------- HANDLERS ----------
    const handlePinChange = (e) => {
        const value = e.target.value;
        if (/^\d{0,4}$/.test(value)) {
            setPin(value);
        }
    };

    const handlePeriodChange = (e) => {
        const value = e.target.value;
        if (value === "") {
            setPeriod("");
            return;
        }
        const num = Number(value);
        if (!Number.isNaN(num) && num >= 1) {
            setPeriod(value);
        }
    };

    const handleBankChange = async (value) => {
        setBankAccountId(value);
        // Forzamos a persistPayment a usar el banco recién seleccionado
        await persistPayment({ bankAccountId: value });
    };

    const handlePaymentBlur = async (e) => {
        const value = e.target.value;
        // Ya se actualizó en onChange, pero se lo pasamos igual para evitar estados viejos
        await persistPayment({ paymentAmount: value });
    };

    const handleSubscriptionBlur = async () => {
        await persistSubscription();
    };

    return (
        <tr className="border-b border-emerald-900/60 last:border-b-0 text-emerald-50">
            {/* No. Client */}
            <td className="py-3 pr-4 align-top text-xs">{index + 1}</td>

            {/* Name */}
            <td className="py-3 pr-4 align-top text-xs">
                <span className="font-medium">{row.firstName || "-"}</span>
            </td>

            {/* Last Name */}
            <td className="py-3 pr-4 align-top text-xs">
                {row.lastName || "-"}
            </td>

            {/* User */}
            <td className="py-3 pr-4 align-top">
                <Input
                    type="text"
                    value={userValue}
                    onChange={(e) => setUserValue(e.target.value)}
                    onBlur={handleSubscriptionBlur}
                    className="h-8 bg-emerald-950/40 border-emerald-700 text-xs text-emerald-50"
                    placeholder="User"
                />
            </td>

            {/* PIN */}
            <td className="py-3 pr-4 align-top">
                <Input
                    type="text"
                    inputMode="numeric"
                    value={pin}
                    onChange={handlePinChange}
                    onBlur={handleSubscriptionBlur}
                    maxLength={4}
                    className="h-8 w-20 bg-emerald-950/40 border-emerald-700 text-xs text-emerald-50 text-center"
                    placeholder="PIN"
                />
            </td>

            {/* Phone */}
            <td className="py-3 pr-4 align-top text-xs">
                {row.phone || "-"}
            </td>

            {/* Service Start Date */}
            <td className="py-3 pr-4 align-top">
                <Input
                    type="date"
                    value={serviceStart || ""}
                    onChange={(e) => setServiceStart(e.target.value)}
                    onBlur={handleSubscriptionBlur}
                    className="h-8 bg-emerald-950/40 border-emerald-700 text-xs text-emerald-50"
                />
            </td>

            {/* Period */}
            <td className="py-3 pr-4 align-top text-center">
                <Input
                    type="number"
                    min={1}
                    value={period}
                    onChange={handlePeriodChange}
                    onBlur={handleSubscriptionBlur}
                    className="h-8 w-20 mx-auto bg-emerald-950/40 border-emerald-700 text-xs text-emerald-50 text-center"
                />
            </td>

            {/* Next Payment Date */}
            <td className="py-3 pr-4 align-top text-xs">
                {nextPaymentDisplay}
            </td>

            {/* Payment Method */}
            <td className="py-3 pr-4 align-top">
                <Select value={bankAccountId} onValueChange={handleBankChange}>
                    <SelectTrigger className="h-8 bg-emerald-950/40 border-emerald-700 text-xs text-emerald-50">
                        <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent className="bg-emerald-950 border-emerald-700 text-emerald-50">
                        {bankAccounts.map((bank) => (
                            <SelectItem
                                key={bank.id_bank_account}
                                value={String(bank.id_bank_account)}
                                className="text-emerald-50"
                            >
                                {bank.bank_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>

            {/* Payment */}
            <td className="py-3 pr-4 align-top">
                <div className="flex items-center gap-1">
                    <span className="text-xs text-emerald-50">$</span>
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        onBlur={handlePaymentBlur}
                        className="h-8 bg-emerald-950/40 border-emerald-700 text-xs text-emerald-50"
                    />
                </div>
            </td>

            {/* Payment Status */}
            <td className="py-3 pr-4 align-top text-center">
                <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${isPaid
                        ? "bg-emerald-700 text-emerald-50"
                        : "bg-amber-700 text-amber-50"
                        }`}
                >
                    {paymentStatusLabel}
                </span>
            </td>

            {/* Actions */}
            <td className="py-3 pr-4 align-top text-center">
                <DeleteSubscriptionButton subscriptionId={row.id_subscription} />
            </td>
        </tr>
    );
}
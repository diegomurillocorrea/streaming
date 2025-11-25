import Link from "next/link";
import { createClient as createServerClient } from "@/utils/supabase/server";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { AddClientButton } from "@/components/interface/AddClientButton";
import { SubscriptionRow } from "@/components/interface/SubscriptionRow";
import { FinishMonthButton } from "@/components/interface/FinishMonthButton";

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
}

function getMonthKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${d.getMonth()}`;
}

function formatHeaderDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(d);
}

export default async function AccountSubscriptionsPage({ params }) {
    // Next 16: params es una Promise
    const routeParams = await params;
    const rawAccountId = routeParams?.id;

    if (!rawAccountId) {
        return (
            <main className="min-h-screen bg-emerald-950 text-emerald-50">
                <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                        STREAMING MURILLO
                    </p>
                    <h1 className="mt-1 text-3xl font-bold">Account not found</h1>
                    <p className="text-sm text-emerald-400">
                        No account id was provided in the URL. Make sure you are visiting a
                        path like <code>/subscriptions/9</code>.
                    </p>
                </div>
            </main>
        );
    }

    const accountId = Number(rawAccountId);

    if (Number.isNaN(accountId)) {
        return (
            <main className="min-h-screen bg-emerald-950 text-emerald-50">
                <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                        STREAMING MURILLO
                    </p>
                    <h1 className="mt-1 text-3xl font-bold">Invalid account id</h1>
                    <p className="text-sm text-emerald-400">
                        The account id <code>{String(rawAccountId)}</code> is not valid.
                    </p>
                </div>
            </main>
        );
    }

    const supabase = await createServerClient();

    const [
        { data: subscriptions, error },
        { data: accountData },
        { data: clientsList },
        { data: bankAccounts },
    ] = await Promise.all([
        supabase
            .from("subscriptions")
            .select(
                `
        id_subscription,
        user,
        pin,
        service_start_date,
        service_end_date,
        period_in_months,
        created_at,
        id_account,
        accounts (
          id_account,
          account_name,
          payment_date,
          price,
          companies (
            company_name
          ),
          emails (
            email_address
          )
        ),
        clients (
          id_client,
          name,
          lastName,
          email,
          phoneNumber
        ),
        payments (
          id_payment,
          id_bank_account,
          amount,
          payment_date,
          paid_month,
          bank_accounts (
            bank_name
          )
        )
      `
            )
            .eq("id_account", accountId)
            .order("created_at", { ascending: true }),

        supabase
            .from("accounts")
            .select(
                `
        id_account,
        account_name,
        payment_date,
        price,
        companies ( company_name ),
        emails ( email_address )
      `
            )
            .eq("id_account", accountId)
            .single(),

        supabase
            .from("clients")
            .select("id_client, name, lastName, email, phoneNumber")
            .order("name", { ascending: true }),

        supabase
            .from("bank_accounts")
            .select("id_bank_account, bank_name")
            .order("bank_name", { ascending: true }),
    ]);

    if (error) {
        console.error("subscriptions query error =>", error);
    }

    const list = subscriptions ?? [];

    const accountInfo = accountData ?? null;
    const accountName = accountInfo?.account_name ?? `Account ${accountId}`;
    const serviceName = accountInfo?.companies?.company_name ?? "-";
    const accountEmail = accountInfo?.emails?.email_address ?? "-";
    const accountPaymentDay = accountInfo?.payment_date ?? null;
    const accountPrice = accountInfo?.price ?? null;

    const currentMonthKey = getCurrentMonthKey();

    const rows = list.map((sub) => {
        const payments = sub.payments || [];

        const monthsPaid = payments.length;

        const sortedPayments = [...payments].sort(
            (a, b) => new Date(b.paid_month) - new Date(a.paid_month)
        );
        const lastPayment = sortedPayments[0];

        const isPaidThisMonth = payments.some((p) => {
            if (!p.paid_month) return false;
            return getMonthKey(p.paid_month) === currentMonthKey;
        });

        const status = isPaidThisMonth ? "CONFIRMED" : "PENDING";

        return {
            id_subscription: sub.id_subscription,
            user: sub.user ?? "",
            pin: sub.pin ?? "",
            firstName: sub.clients?.name ?? "",
            lastName: sub.clients?.lastName ?? "",
            email: sub.clients?.email ?? "-",
            phone: sub.clients?.phoneNumber ?? "-",
            serviceStartRaw: sub.service_start_date,
            periodInMonths: sub.period_in_months,
            monthsPaid,
            lastPaidMonth: lastPayment?.paid_month ?? null,
            lastPaymentDate: lastPayment?.payment_date ?? null,
            lastPaymentAmount: lastPayment?.amount ?? null,
            lastPaymentBank: lastPayment?.bank_accounts?.bank_name ?? null,
            lastPaymentBankId: lastPayment?.id_bank_account ?? null,
            lastPaymentId: lastPayment?.id_payment ?? null,
            status,
        };
    });

    const confirmedCount = rows.filter((r) => r.status === "CONFIRMED").length;
    const pendingCount = rows.filter((r) => r.status === "PENDING").length;

    const MAX_SLOTS = 5;
    const emptySlots = Math.max(MAX_SLOTS - rows.length, 0);

    return (
        <main className="min-h-screen bg-emerald-950 text-emerald-50">
            <div className="w-400 mx-auto px-4 py-8 space-y-6">
                {/* HEADER */}
                <header className="space-y-2">
                    <Link href="/" className="inline-block cursor-pointer">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                            STREAMING MURILLO
                        </p>
                    </Link>

                    <div className="mt-1 flex items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold">{accountName}</h1>
                        <FinishMonthButton accountId={accountId} />
                    </div>

                    <p className="text-sm text-emerald-400">
                        Service: <span className="font-medium">{serviceName}</span>
                    </p>
                    <p className="text-sm text-emerald-400">
                        Account email:{" "}
                        <span className="font-medium">{accountEmail}</span>
                    </p>
                    {accountPaymentDay && (
                        <p className="text-xs text-emerald-400">
                            Payment day: {formatHeaderDate(accountPaymentDay)}
                        </p>
                    )}
                    <p className="text-xs text-emerald-400">
                        Clients: {rows.length} • Confirmed this month: {confirmedCount} •
                        Pending: {pendingCount}
                    </p>
                </header>

                {/* TABLA */}
                <Card className="border-emerald-800 bg-emerald-900">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Clients & payment control
                        </CardTitle>
                        <CardDescription>
                            All clients linked to this account, with service period and
                            payment status.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="border-b border-emerald-800 text-emerald-50">
                                    <tr className="text-xs uppercase">
                                        <th className="py-2 pr-4">No. Client</th>
                                        <th className="py-2 pr-4">Name</th>
                                        <th className="py-2 pr-4">Last Name</th>
                                        <th className="py-2 pr-4">User</th>
                                        <th className="py-2 pr-4">PIN</th>
                                        <th className="py-2 pr-4">Phone Number</th>
                                        <th className="py-2 pr-4">Service Start Date</th>
                                        <th className="py-2 pr-4 text-center">
                                            Period in Months
                                        </th>
                                        <th className="py-2 pr-4">Next Payment Date</th>
                                        <th className="py-2 pr-4">Payment Method</th>
                                        <th className="py-2 pr-4">Payment</th>
                                        <th className="py-2 pr-4 text-center">
                                            Payment Status
                                        </th>
                                        <th className="py-2 pr-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Filas con data */}
                                    {rows.map((row, index) => (
                                        <SubscriptionRow
                                            key={row.id_subscription}
                                            index={index}
                                            row={row}
                                            bankAccounts={bankAccounts ?? []}
                                            accountPrice={accountPrice}
                                        />
                                    ))}

                                    {/* Filas vacías hasta llegar a 5 clientes */}
                                    {Array.from({ length: emptySlots }).map((_, index) => (
                                        <tr
                                            key={`empty-${index}`}
                                            className="border-b border-emerald-900/60 last:border-b-0 text-emerald-50"
                                        >
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-xs">
                                                <AddClientButton
                                                    accountId={accountId}
                                                    clients={clientsList ?? []}
                                                />
                                            </td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-center text-xs">
                                                -
                                            </td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-xs">-</td>
                                            <td className="py-3 pr-4 align-top text-center text-xs">
                                                -
                                            </td>
                                            <td className="py-3 pr-4 align-top text-center text-xs">
                                                -
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
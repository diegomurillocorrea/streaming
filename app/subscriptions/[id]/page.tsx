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
                    <h1 className="mt-1 text-3xl font-bold">Cuenta no encontrada</h1>
                    <p className="text-sm text-emerald-400">
                        No se proporcionó un id de cuenta en la URL. Asegúrate de visitar
                        una ruta como <code>/subscriptions/9</code>.
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
                    <h1 className="mt-1 text-3xl font-bold">Id de cuenta inválido</h1>
                    <p className="text-sm text-emerald-400">
                        El id de cuenta <code>{String(rawAccountId)}</code> no es válido.
                    </p>
                </div>
            </main>
        );
    }

    const supabase = await createServerClient()

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

    const accountInfo = accountData ?? null
    const accountCompany = Array.isArray(accountInfo?.companies)
        ? accountInfo.companies[0]
        : accountInfo?.companies
    const accountEmailInfo = Array.isArray(accountInfo?.emails)
        ? accountInfo.emails[0]
        : accountInfo?.emails
    const accountName = accountInfo?.account_name ?? `Cuenta ${accountId}`
    const serviceName = accountCompany?.company_name ?? "-"
    const accountEmail = accountEmailInfo?.email_address ?? "-"
    const accountPaymentDay = accountInfo?.payment_date ?? null
    const accountPrice = accountInfo?.price ?? null

    const currentMonthKey = getCurrentMonthKey();

    const rows = list.map((sub) => {
        const payments = sub.payments || []
        const client = Array.isArray(sub.clients) ? sub.clients[0] : sub.clients

        const monthsPaid = payments.length;

        const sortedPayments = [...payments].sort(
            (a, b) =>
                new Date(b.paid_month).getTime() - new Date(a.paid_month).getTime()
        )
        const lastPayment = sortedPayments[0]
        const lastPaymentBankData: any = lastPayment?.bank_accounts

        const isPaidThisMonth = payments.some((p) => {
            if (!p.paid_month) return false;
            return getMonthKey(p.paid_month) === currentMonthKey;
        });

        const status = isPaidThisMonth ? "CONFIRMADO" : "PENDIENTE";

        return {
            id_subscription: sub.id_subscription,
            user: sub.user ?? "",
            pin: sub.pin ?? "",
            firstName: client?.name ?? "",
            lastName: client?.lastName ?? "",
            email: client?.email ?? "-",
            phone: client?.phoneNumber ?? "-",
            serviceStartRaw: sub.service_start_date,
            periodInMonths: sub.period_in_months,
            monthsPaid,
            lastPaidMonth: lastPayment?.paid_month ?? null,
            lastPaymentDate: lastPayment?.payment_date ?? null,
            lastPaymentAmount: lastPayment?.amount ?? null,
            lastPaymentBank: Array.isArray(lastPaymentBankData)
                ? lastPaymentBankData[0]?.bank_name ?? null
                : lastPaymentBankData?.bank_name ?? null,
            lastPaymentBankId: lastPayment?.id_bank_account ?? null,
            lastPaymentId: lastPayment?.id_payment ?? null,
            status,
        };
    });

    const confirmedCount = rows.filter((r) => r.status === "CONFIRMADO").length;
    const pendingCount = rows.filter((r) => r.status === "PENDIENTE").length;

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
                        Servicio: <span className="font-medium">{serviceName}</span>
                    </p>
                    <p className="text-sm text-emerald-400">
                        Correo de la cuenta:{" "}
                        <span className="font-medium">{accountEmail}</span>
                    </p>
                    {accountPaymentDay && (
                        <p className="text-xs text-emerald-400">
                            Día de pago: {formatHeaderDate(accountPaymentDay)}
                        </p>
                    )}
                    <p className="text-xs text-emerald-400">
                        Clientes: {rows.length} • Confirmados este mes: {confirmedCount} •
                        Pendientes: {pendingCount}
                    </p>
                </header>

                {/* TABLA */}
                <Card className="border-emerald-800 bg-emerald-900">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Clientes y control de pagos
                        </CardTitle>
                        <CardDescription>
                            Todos los clientes vinculados a esta cuenta, con período de
                            servicio y estado de pago.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="border-b border-emerald-800 text-emerald-50">
                                    <tr className="text-xs uppercase">
                                        <th className="py-2 pr-4">No. cliente</th>
                                        <th className="py-2 pr-4">Nombre</th>
                                        <th className="py-2 pr-4">Apellido</th>
                                        <th className="py-2 pr-4">User</th>
                                        <th className="py-2 pr-4">PIN</th>
                                        <th className="py-2 pr-4">Teléfono</th>
                                        <th className="py-2 pr-4">Inicio de servicio</th>
                                        <th className="py-2 pr-4 text-center">
                                            Período en meses
                                        </th>
                                        <th className="py-2 pr-4">Próximo pago</th>
                                        <th className="py-2 pr-4">Método de pago</th>
                                        <th className="py-2 pr-4">Pago</th>
                                        <th className="py-2 pr-4 text-center">
                                            Estado de pago
                                        </th>
                                        <th className="py-2 pr-4 text-center">Acciones</th>
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
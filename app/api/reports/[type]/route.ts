// app/api/reports/[type]/route.js
import { NextResponse } from "next/server";
// ✅ usa el build standalone que incluye las fuentes
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { createClient as createServerClient } from "@/utils/supabase/server";

// Necesario para usar pdfkit (Node, no Edge)
export const runtime = "nodejs";

/* ---------------------- Utils numéricos / fechas ---------------------- */

const num = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
};

function monthKeyFromDateString(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${d.getMonth() + 1}`; // 1-12
}

function getCurrentMonthInfo() {
    const now = new Date();
    const monthLabel = now.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    return { monthLabel, monthKey };
}

/* ---------------------- Fetch y modelado de datos --------------------- */

async function fetchSubscriptionsForReports() {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from("subscriptions")
        .select(
            `
      id_subscription,
      id_account,
      user,
      pin,
      service_start_date,
      period_in_months,
      accounts (
        id_account,
        account_name,
        price
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
        amount,
        paid_month,
        payment_date,
        id_bank_account,
        bank_accounts (
          bank_name
        )
      )
    `
        )
        .order("id_subscription", { ascending: true });

    if (error) {
        console.error("supabase subscriptions error", error);
        throw new Error("supabase subscriptions error");
    }

    return data ?? [];
}

function buildComputedData(subscriptions, currentMonthKey) {
    const subsWithFlags = subscriptions.map((sub) => {
        const account = sub.accounts || {};
        const client = sub.clients || {};
        const payments = sub.payments || [];

        const price = num(account.price);
        const clientName = `${client.name ?? ""} ${client.lastName ?? ""}`.trim() || "Cliente sin nombre";

        const paymentsThisMonth = payments.filter(
            (p) =>
                p.paid_month &&
                monthKeyFromDateString(p.paid_month) === currentMonthKey
        );

        const totalPaidThisMonth = paymentsThisMonth.reduce(
            (sum, p) => sum + num(p.amount),
            0
        );

        const isPaid = price > 0 ? totalPaidThisMonth >= price : totalPaidThisMonth > 0;

        const lastPayment =
            paymentsThisMonth
                .slice()
                .sort(
                    (a, b) =>
                        new Date(b.payment_date).getTime() -
                        new Date(a.payment_date).getTime()
                )[0] ?? null;

        return {
            id_subscription: sub.id_subscription,
            accountId: sub.id_account,
            accountName: account.account_name || "Cuenta desconocida",
            accountPrice: price,
            clientName,
            clientEmail: client.email || "",
            clientPhone: client.phoneNumber || "",
            user: sub.user || "",
            pin: sub.pin || "",
            serviceStartDate: sub.service_start_date,
            periodInMonths: sub.period_in_months,
            totalPaidThisMonth,
            isPaid,
            lastPayment,
            payments,
        };
    });

    // Stats por cuenta
    const accountsMap = new Map();
    for (const s of subsWithFlags) {
        if (!s.accountId) continue;
        let acc = accountsMap.get(s.accountId);
        if (!acc) {
            acc = {
                accountId: s.accountId,
                accountName: s.accountName,
                price: s.accountPrice,
                clientsCount: 0,
                paidCount: 0,
                pendingCount: 0,
                expectedThisMonth: 0,
                collectedThisMonth: 0,
            };
            accountsMap.set(s.accountId, acc);
        }
        acc.clientsCount += 1;
        acc.expectedThisMonth += s.accountPrice || 0;
        acc.collectedThisMonth += s.totalPaidThisMonth;
        if (s.isPaid) acc.paidCount += 1;
        else acc.pendingCount += 1;
    }
    const accountsStats = Array.from(accountsMap.values());

    // Pagos del mes
    const paymentsOfMonth = [];
    for (const s of subsWithFlags) {
        for (const p of s.payments || []) {
            if (!p.paid_month) continue;
            if (monthKeyFromDateString(p.paid_month) !== currentMonthKey) continue;

            paymentsOfMonth.push({
                subscriptionId: s.id_subscription,
                accountName: s.accountName,
                clientName: s.clientName,
                amount: num(p.amount),
                paidMonth: p.paid_month,
                paymentDate: p.payment_date,
                bankName: p.bank_accounts?.bank_name || "Desconocido",
            });
        }
    }

    // Stats por banco
    const bankMap = new Map();
    for (const p of paymentsOfMonth) {
        const key = p.bankName || "Desconocido";
        let stat = bankMap.get(key);
        if (!stat) {
            stat = { bankName: key, paymentsCount: 0, totalAmount: 0 };
            bankMap.set(key, stat);
        }
        stat.paymentsCount += 1;
        stat.totalAmount += p.amount;
    }
    const bankStats = Array.from(bankMap.values()).map((b) => ({
        ...b,
        averageAmount: b.paymentsCount
            ? b.totalAmount / b.paymentsCount
            : 0,
    }));

    // Métricas overview
    const totalAccounts = accountsStats.length;
    const totalClients = subsWithFlags.length;
    const totalExpected = accountsStats.reduce(
        (sum, a) => sum + num(a.expectedThisMonth),
        0
    );
    const totalCollected = accountsStats.reduce(
        (sum, a) => sum + num(a.collectedThisMonth),
        0
    );
    const paidClients = subsWithFlags.filter((s) => s.isPaid).length;
    const pendingClients = totalClients - paidClients;
    const collectionRate =
        totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    const metrics = {
        totalAccounts,
        totalClients,
        totalExpected,
        totalCollected,
        paidClients,
        pendingClients,
        collectionRate,
    };

    return { subsWithFlags, accountsStats, paymentsOfMonth, bankStats, metrics };
}

/* ---------------------- Generar PDF en memoria ----------------------- */

function generatePdfBuffer(drawCallback) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 40,
            });

            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => {
                resolve(Buffer.concat(chunks));
            });
            doc.on("error", (err) => {
                reject(err);
            });

            drawCallback(doc);
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

function drawReportHeader(doc, title, subtitle, monthLabel) {
    const marginLeft = doc.page.margins.left;
    const marginRight = doc.page.width - doc.page.margins.right;

    // Brand global: STREAMING MURILLO
    doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#10b981") // verde tipo tu app
        .text("STREAMING MURILLO", marginLeft, doc.y, {
            align: "left",
        });

    doc.moveDown(0.4);

    // Título del reporte
    doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor("#022c22") // verde bien oscuro
        .text(title, marginLeft, doc.y, { align: "left" });

    // Subtítulo
    if (subtitle) {
        doc
            .moveDown(0.2)
            .font("Helvetica")
            .fontSize(11)
            .fillColor("#047857")
            .text(subtitle, { align: "left" });
    }

    // Periodo
    doc
        .moveDown(0.15)
        .fontSize(10)
        .fillColor("#065f46")
        .text(`Period: ${monthLabel}`, { align: "left" });

    // Línea separadora
    const lineY = doc.y + 4;
    doc
        .moveTo(marginLeft, lineY)
        .lineTo(marginRight, lineY)
        .lineWidth(1)
        .strokeColor("#10b981")
        .stroke();

    doc.moveDown(1);
    // Color por defecto para el resto del contenido
    doc.fillColor("#111827");
}

function drawSimpleTable(doc, headers, rows, widths) {
    const startX = doc.page.margins.left;
    let y = doc.y + 10;
    const totalWidth = widths.reduce((a, b) => a + b, 0);

    // Encabezado
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#064e3b");
    let x = startX;
    headers.forEach((h, i) => {
        doc.text(h, x, y, { width: widths[i], align: "left" });
        x += widths[i];
    });
    y += 14;

    // Línea debajo del header
    doc
        .moveTo(startX, y - 5)
        .lineTo(startX + totalWidth, y - 5)
        .strokeColor("#10b981")
        .lineWidth(0.8)
        .stroke();

    // Filas
    doc.font("Helvetica").fontSize(9).fillColor("#111827");

    rows.forEach((row) => {
        x = startX;
        row.forEach((cell, i) => {
            const text =
                cell === null || cell === undefined ? "" : String(cell);
            doc.text(text, x, y, { width: widths[i], align: "left" });
            x += widths[i];
        });
        y += 12;

        // Salto de página si se acaba el espacio
        if (y > doc.page.height - doc.page.margins.bottom - 20) {
            doc.addPage();
            y = doc.page.margins.top;
        }
    });

    doc.moveDown(1.5);
}

function drawOverviewReport(doc, monthLabel, m) {
    drawReportHeader(
        doc,
        "Resumen mensual",
        "Resumen general de tu negocio de streaming.",
        monthLabel
    );

    const margin = doc.page.margins.left;
    const boxTop = doc.y;
    const boxWidth = doc.page.width - margin * 2;
    const boxHeight = 140;

    // Fondo suave de la tarjeta
    doc
        .save()
        .roundedRect(margin, boxTop, boxWidth, boxHeight, 12)
        .fillOpacity(0.04)
        .fill("#047857")
        .restore();

    // Borde
    doc
        .roundedRect(margin, boxTop, boxWidth, boxHeight, 12)
        .lineWidth(1)
        .strokeColor("#059669")
        .stroke();

    const colX1 = margin + 18;
    const colX2 = margin + boxWidth / 2 + 10;
    let rowY = boxTop + 18;

    // Título de la tarjeta
    doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#022c22")
        .text("Métricas clave", colX1, rowY);

    rowY += 24;
    doc.font("Helvetica").fontSize(11).fillColor("#022c22");

    const totalExpected = num(m.totalExpected);
    const totalCollected = num(m.totalCollected);
    const pendingAmount = Math.max(0, totalExpected - totalCollected);

    // Columna izquierda
    doc.text(`Cuentas totales: ${m.totalAccounts}`, colX1, rowY);
    doc.text(`Clientes activos: ${m.totalClients}`, colX1, rowY + 18);
    doc.text(`Clientes al día: ${m.paidClients}`, colX1, rowY + 36);
    doc.text(`Clientes pendientes: ${m.pendingClients}`, colX1, rowY + 54);

    // Columna derecha
    doc.text(
        `Ingreso esperado: $${totalExpected.toFixed(2)}`,
        colX2,
        rowY
    );
    doc.text(
        `Cobrado: $${totalCollected.toFixed(2)}`,
        colX2,
        rowY + 18
    );
    doc.text(
        `Monto pendiente: $${pendingAmount.toFixed(2)}`,
        colX2,
        rowY + 36
    );
    doc.text(
        `Tasa de cobro: ${num(m.collectionRate).toFixed(1)} %`,
        colX2,
        rowY + 54
    );

    // Nota al pie de la tarjeta
    doc
        .fontSize(9)
        .fillColor("#6b7280")
        .text(
            "Este reporte es un resumen automático generado desde tu panel de DAIEGO Streaming.",
            margin,
            boxTop + boxHeight + 18,
            { width: boxWidth, align: "left" }
        );

    doc.moveDown(4);
}

function drawAccountsReport(doc, monthLabel, accountsStats) {
    drawReportHeader(
        doc,
        "Rendimiento por cuentas",
        "Cómo va cada cuenta de streaming este mes.",
        monthLabel
    );

    const headers = [
        "Account",
        "Price",
        "#Clients",
        "Expected",
        "Cobrado",
        "Paid",
        "Pending",
    ];
    const rows = accountsStats.map((a) => [
        a.accountName,
        `$${num(a.price).toFixed(2)}`,
        a.clientsCount,
        `$${num(a.expectedThisMonth).toFixed(2)}`,
        `$${num(a.collectedThisMonth).toFixed(2)}`,
        a.paidCount,
        a.pendingCount,
    ]);

    drawSimpleTable(doc, headers, rows, [150, 60, 60, 80, 80, 50, 60]);
}

function drawClientsReport(doc, monthLabel, subsWithFlags) {
    drawReportHeader(
        doc,
        "Clientes activos",
        "Todos los clientes con su cuenta y estado de pago del mes.",
        monthLabel
    );

    const headers = [
        "Account",
        "Client",
        "User",
        "PIN",
        "Start",
        "Status",
    ];
    const rows = subsWithFlags.map((s) => [
        s.accountName,
        s.clientName,
        s.user,
        s.pin,
        s.serviceStartDate
            ? new Date(s.serviceStartDate).toLocaleDateString("en-GB")
            : "",
        s.isPaid ? "PAID" : "PENDING",
    ]);

    drawSimpleTable(doc, headers, rows, [120, 130, 70, 40, 70, 60]);
}

function drawPaymentsReport(doc, monthLabel, paymentsOfMonth) {
    drawReportHeader(
        doc,
        "Pagos del mes",
        "Todos los pagos registrados durante este mes.",
        monthLabel
    );

    const headers = [
        "Account",
        "Client",
        "Bank",
        "Amount",
        "Payment date",
    ];
    const rows = paymentsOfMonth.map((p) => [
        p.accountName,
        p.clientName,
        p.bankName,
        `$${num(p.amount).toFixed(2)}`,
        p.paymentDate
            ? new Date(p.paymentDate).toLocaleString("en-GB")
            : "",
    ]);

    drawSimpleTable(doc, headers, rows, [110, 120, 80, 60, 110]);
}

function drawPendingReport(doc, monthLabel, subsWithFlags) {
    drawReportHeader(
        doc,
        "Pagos pendientes",
        "Clientes que aún tienen pagos pendientes este mes.",
        monthLabel
    );

    const pending = subsWithFlags.filter((s) => !s.isPaid);

    const headers = ["Account", "Client", "User", "PIN", "Expected"];
    const rows = pending.map((s) => [
        s.accountName,
        s.clientName,
        s.user,
        s.pin,
        `$${num(s.accountPrice).toFixed(2)}`,
    ]);

    drawSimpleTable(doc, headers, rows, [120, 130, 70, 40, 70]);
}

function drawBanksReport(doc, monthLabel, bankStats) {
    drawReportHeader(
        doc,
        "Por método de pago",
        "Cuánto se cobró por cada banco/método de pago.",
        monthLabel
    );

    const headers = ["Bank", "#Payments", "Total", "Average"];
    const rows = bankStats.map((b) => [
        b.bankName,
        b.paymentsCount,
        `$${num(b.totalAmount).toFixed(2)}`,
        `$${num(b.averageAmount).toFixed(2)}`,
    ]);

    drawSimpleTable(doc, headers, rows, [150, 80, 80, 80]);
}

/* ---------------------- Handler GET ------------------------- */

export async function GET(request, context) {
    try {
        const url = new URL(request.url);
        const typeFromPath = url.pathname.split("/").filter(Boolean).pop();
        const type = context?.params?.type ?? typeFromPath ?? "";

        console.log("reports - resolved type =>", type);

        const { monthLabel, monthKey } = getCurrentMonthInfo();
        const subscriptions = await fetchSubscriptionsForReports();
        const {
            subsWithFlags,
            accountsStats,
            paymentsOfMonth,
            bankStats,
            metrics,
        } = buildComputedData(subscriptions, monthKey);

        const filenameBase = `${type}-report-${monthLabel.replace(" ", "-")}`;

        let pdfBuffer;

        switch (type) {
            case "overview":
                pdfBuffer = await generatePdfBuffer((doc) =>
                    drawOverviewReport(doc, monthLabel, metrics)
                );
                break;

            case "accounts":
                pdfBuffer = await generatePdfBuffer((doc) =>
                    drawAccountsReport(doc, monthLabel, accountsStats)
                );
                break;

            case "clients":
                pdfBuffer = await generatePdfBuffer((doc) =>
                    drawClientsReport(doc, monthLabel, subsWithFlags)
                );
                break;

            case "payments":
                pdfBuffer = await generatePdfBuffer((doc) =>
                    drawPaymentsReport(doc, monthLabel, paymentsOfMonth)
                );
                break;

            case "pending":
                pdfBuffer = await generatePdfBuffer((doc) =>
                    drawPendingReport(doc, monthLabel, subsWithFlags)
                );
                break;

            case "banks":
                pdfBuffer = await generatePdfBuffer((doc) =>
                    drawBanksReport(doc, monthLabel, bankStats)
                );
                break;

            default:
                return NextResponse.json(
                    { error: "Tipo de reporte desconocido", received: type },
                    { status: 400 }
                );
        }

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
            },
        });
    } catch (err) {
        console.error("Error al generar reporte PDF", err);
        return NextResponse.json(
            {
                error: `Error al generar reporte: ${err?.message || "error desconocido"
                    }`,
            },
            { status: 500 }
        );
    }
}
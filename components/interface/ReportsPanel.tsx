// components/interface/ReportsPanel.jsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const REPORTS = [
    { id: "overview", label: "Resumen mensual" },
    { id: "accounts", label: "Rendimiento por cuentas" },
    { id: "clients", label: "Clientes activos" },
    { id: "payments", label: "Pagos del mes" },
    { id: "pending", label: "Pagos pendientes" },
    { id: "banks", label: "Por método de pago" },
];

export function ReportsPanel() {
    const [downloadingId, setDownloadingId] = useState(null);

    const handleDownload = async (reportId) => {
        try {
            setDownloadingId(reportId);

            const res = await fetch(`/api/reports/${reportId}`);
            if (!res.ok) {
                console.error("Error al generar reporte", await res.text());
                alert("Error al generar el PDF");
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${reportId}-report.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Error inesperado al generar el reporte");
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((r) => (
                <Button
                    key={r.id}
                    variant="outline"
                    className="flex items-center justify-between gap-2 border-emerald-600 text-emerald-50 bg-emerald-900/40 hover:bg-emerald-900 cursor-pointer"
                    disabled={downloadingId === r.id}
                    onClick={() => handleDownload(r.id)}
                >
                    <span className="text-xs font-medium">{r.label}</span>
                    <span className="flex items-center gap-1 text-[11px]">
                        {downloadingId === r.id ? "Generando..." : "Descargar"}
                        <Download className="h-3 w-3" />
                    </span>
                </Button>
            ))}
        </div>
    );
}
// components/interface/ReportsPanel.jsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const REPORTS = [
    { id: "overview", label: "Monthly overview" },
    { id: "accounts", label: "Accounts performance" },
    { id: "clients", label: "Active clients" },
    { id: "payments", label: "Payments of the month" },
    { id: "pending", label: "Pending payments" },
    { id: "banks", label: "By payment method" },
];

export function ReportsPanel() {
    const [downloadingId, setDownloadingId] = useState(null);

    const handleDownload = async (reportId) => {
        try {
            setDownloadingId(reportId);

            const res = await fetch(`/api/reports/${reportId}`);
            if (!res.ok) {
                console.error("Error generating report", await res.text());
                alert("Error generating report PDF");
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
            alert("Unexpected error generating report");
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
                        {downloadingId === r.id ? "Generating..." : "Download"}
                        <Download className="h-3 w-3" />
                    </span>
                </Button>
            ))}
        </div>
    );
}
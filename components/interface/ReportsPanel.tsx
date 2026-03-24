"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"

const REPORTS = [
  { id: "overview", label: "Resumen mensual" },
  { id: "accounts", label: "Rendimiento por cuentas" },
  { id: "clients", label: "Clientes activos" },
  { id: "payments", label: "Pagos del mes" },
  { id: "pending", label: "Pagos pendientes" },
  { id: "banks", label: "Por método de pago" },
]

export function ReportsPanel() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (reportId: string) => {
    try {
      setDownloadingId(reportId)

      const res = await fetch(`/api/reports/${reportId}`)
      if (!res.ok) {
        console.error("Error al generar reporte", await res.text())
        alert("Error al generar el PDF")
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${reportId}-report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("Error inesperado al generar el reporte")
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {REPORTS.map((r) => (
        <Button
          key={r.id}
          variant="outline"
          className="flex cursor-pointer items-center justify-between gap-2 border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-50 dark:hover:bg-emerald-900/80"
          disabled={downloadingId === r.id}
          onClick={() => void handleDownload(r.id)}
        >
          <span className="text-xs font-medium">{r.label}</span>
          <span className="flex items-center gap-1 text-[11px]">
            {downloadingId === r.id ? "Generando..." : "Descargar"}
            <Download className="h-3 w-3" />
          </span>
        </Button>
      ))}
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { closeAccountMonthAction } from "@/app/actions/close-account-month"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

type FinishMonthButtonProps = {
  accountId: number
}

export function FinishMonthButton({ accountId }: FinishMonthButtonProps) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleFinishMonth = async () => {
    if (!accountId) return

    setLoading(true)
    setActionError(null)

    try {
      const result = await closeAccountMonthAction(accountId)

      if (result.ok === false) {
        setActionError(result.error)
        return
      }

      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={() => {
          setActionError(null)
          setOpen(true)
        }}
      >
        Cerrar mes
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar mes actual</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-600 dark:text-emerald-300">
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
          {actionError ? (
            <p
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {actionError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={loading}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={(e) => {
                e.preventDefault()
                void handleFinishMonth()
              }}
              disabled={loading}
            >
              {loading ? "Cerrando..." : "Cerrar mes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

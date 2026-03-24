"use client"

import { useCallback, useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

type CopyAccountCredentialsButtonProps = {
  email: string
  password: string
}

export function CopyAccountCredentialsButton({
  email,
  password,
}: CopyAccountCredentialsButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const emailLine = email && email !== "-" ? email : "(sin correo)"
    const passLine =
      password && password.trim() !== "" ? password : "(sin contraseña)"
    const text = `Correo: ${emailLine}\nContraseña: ${passLine}`

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      window.alert(
        "No se pudo copiar al portapapeles. Copia manualmente o revisa permisos del navegador."
      )
    }
  }, [email, password])

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="mt-2 cursor-pointer border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
      aria-label="Copiar correo y contraseña de la cuenta al portapapeles"
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden />
          Copiado
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" aria-hidden />
          Copiar correo y contraseña
        </>
      )}
    </Button>
  )
}

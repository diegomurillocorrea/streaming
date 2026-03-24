"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type TableSearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  className?: string
  "aria-label"?: string
}

export function TableSearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  id = "table-search",
  className,
  "aria-label": ariaLabel,
}: TableSearchInputProps) {
  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border-zinc-200 bg-white pl-9 dark:border-emerald-800 dark:bg-emerald-950/50"
        autoComplete="off"
        aria-label={ariaLabel ?? placeholder}
      />
    </div>
  )
}

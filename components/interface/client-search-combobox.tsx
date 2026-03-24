"use client"

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { Input } from "@/components/ui/input"
import { rowMatchesSearch } from "@/lib/table-search"
import { cn } from "@/lib/utils"

export type ClientComboboxOption = {
  id_client: number
  name: string
  lastName: string
  email: string | null
  phoneNumber: string | null
}

type ClientSearchComboboxProps = {
  id?: string
  clients: ClientComboboxOption[]
  value: string
  onValueChange: (clientId: string) => void
  /** Cuando el diálogo padre se abre, se reinicia el campo */
  dialogOpen: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

function formatClientLabel(c: ClientComboboxOption) {
  return `${c.name} ${c.lastName} — ${c.phoneNumber ?? "Sin teléfono"}`
}

export function ClientSearchCombobox({
  id,
  clients,
  value,
  onValueChange,
  dialogOpen,
  disabled = false,
  placeholder = "Busca por nombre, teléfono o correo…",
  className,
}: ClientSearchComboboxProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [inputValue, setInputValue] = useState("")
  const [listOpen, setListOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const filteredClients = useMemo(() => {
    return clients.filter((c) =>
      rowMatchesSearch(
        [c.name, c.lastName, c.phoneNumber, c.email],
        inputValue
      )
    )
  }, [clients, inputValue])

  const prevDialogOpen = useRef(dialogOpen)

  useEffect(() => {
    if (dialogOpen && !prevDialogOpen.current) {
      setInputValue("")
      setListOpen(false)
      setHighlightedIndex(0)
      onValueChange("")
    }
    prevDialogOpen.current = dialogOpen
  }, [dialogOpen, onValueChange])

  useEffect(() => {
    if (!value) {
      return
    }
    const c = clients.find((x) => String(x.id_client) === value)
    if (c) {
      setInputValue(formatClientLabel(c))
    }
  }, [value, clients])

  useEffect(() => {
    if (!dialogOpen && !value) {
      setInputValue("")
    }
  }, [dialogOpen, value])

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const el = containerRef.current
      if (!el || el.contains(e.target as Node)) return
      setListOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      if (value) {
        onValueChange("")
      }
      setInputValue(next)
      setListOpen(true)
      setHighlightedIndex(0)
    },
    [value, onValueChange]
  )

  const handleSelectClient = useCallback(
    (c: ClientComboboxOption) => {
      onValueChange(String(c.id_client))
      setInputValue(formatClientLabel(c))
      setListOpen(false)
      inputRef.current?.blur()
    },
    [onValueChange]
  )

  const handleInputFocus = useCallback(() => {
    setListOpen(true)
  }, [])

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        setListOpen(true)
        return
      }

      if (e.key === "Escape") {
        setListOpen(false)
        return
      }

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightedIndex((i) =>
          Math.min(i + 1, Math.max(filteredClients.length - 1, 0))
        )
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        return
      }

      if (e.key === "Enter" && listOpen && filteredClients.length > 0) {
        e.preventDefault()
        const c = filteredClients[highlightedIndex]
        if (c) handleSelectClient(c)
      }
    },
    [listOpen, filteredClients, highlightedIndex, handleSelectClient]
  )

  useEffect(() => {
    if (highlightedIndex >= filteredClients.length) {
      setHighlightedIndex(Math.max(filteredClients.length - 1, 0))
    }
  }, [filteredClients.length, highlightedIndex])

  const showEmpty =
    listOpen && inputValue.trim() !== "" && filteredClients.length === 0
  const showList =
    listOpen && !showEmpty && filteredClients.length > 0

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Input
        ref={inputRef}
        id={id}
        type="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && filteredClients[highlightedIndex]
            ? `${listboxId}-option-${filteredClients[highlightedIndex].id_client}`
            : undefined
        }
        aria-label="Buscar y elegir cliente"
        placeholder={placeholder}
        className="h-auto min-h-9 w-full border-zinc-200 bg-white text-zinc-900 dark:border-emerald-700 dark:bg-emerald-900/90 dark:text-emerald-50 dark:placeholder:text-emerald-400/70"
      />

      {(showList || showEmpty) && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[120] mt-1 max-h-[min(280px,var(--combobox-max-h,280px))] overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-emerald-700 dark:bg-emerald-950"
        >
          {showEmpty && (
            <li
              role="presentation"
              className="px-3 py-2 text-sm text-zinc-500 dark:text-emerald-400"
            >
              No hay clientes que coincidan con &quot;{inputValue.trim()}&quot;.
            </li>
          )}
          {showList &&
            filteredClients.map((c, index) => {
              const isHighlighted = index === highlightedIndex
              const optionId = `${listboxId}-option-${c.id_client}`
              return (
                <li
                  key={c.id_client}
                  id={optionId}
                  role="option"
                  aria-selected={value === String(c.id_client)}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:text-emerald-100",
                    isHighlighted &&
                      "bg-emerald-100 text-zinc-950 dark:bg-emerald-800/80 dark:text-emerald-50"
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelectClient(c)
                  }}
                >
                  {formatClientLabel(c)}
                </li>
              )
            })}
        </ul>
      )}

    </div>
  )
}

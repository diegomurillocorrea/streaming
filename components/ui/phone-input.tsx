"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const DEFAULT_COUNTRY_CODE = "+503"
const LOCAL_DIGIT_COUNT = 8

const digitsOnly = (value: string): string => value.replace(/\D/g, "")

const formatLocalNumber = (digits: string): string => {
  const limited = digits.slice(0, LOCAL_DIGIT_COUNT)
  if (limited.length <= 4) return limited
  return `${limited.slice(0, 4)} ${limited.slice(4)}`
}

const stripCountryCode = (value: string): string => {
  const trimmed = value.trim()
  let local = trimmed

  if (trimmed.startsWith("+503")) {
    local = trimmed.slice(4)
  } else if (trimmed.startsWith("503") && digitsOnly(trimmed).length > 8) {
    local = trimmed.slice(3)
  }

  return formatLocalNumber(digitsOnly(local))
}

const composePhoneValue = (digits: string): string => {
  const limited = digits.slice(0, LOCAL_DIGIT_COUNT)
  if (!limited) return ""
  return `${DEFAULT_COUNTRY_CODE} ${formatLocalNumber(limited)}`
}

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> & {
  value?: string
  onChange?: (value: string) => void
  countrySelectId?: string
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput(
    {
      className,
      id,
      value = "",
      onChange,
      disabled,
      placeholder = "0000 0000",
      countrySelectId,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) {
    const localNumber = stripCountryCode(value)
    const selectId = countrySelectId ?? (id ? `${id}-country` : "phone-country")

    const handleLocalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextDigits = digitsOnly(event.target.value).slice(0, LOCAL_DIGIT_COUNT)
      onChange?.(composePhoneValue(nextDigits))
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      props.onKeyDown?.(event)
      if (event.defaultPrevented) return

      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ]
      if (allowedKeys.includes(event.key)) return
      if ((event.metaKey || event.ctrlKey) && ["a", "c", "v", "x"].includes(event.key.toLowerCase())) {
        return
      }
      if (!/^\d$/.test(event.key)) {
        event.preventDefault()
      }
    }

    return (
      <div
        className={cn(
          "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none",
          "has-[input:focus-within]:border-ring has-[input:focus-within]:ring-ring/50 has-[input:focus-within]:ring-[3px]",
          "dark:bg-input/30",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          className
        )}
      >
        <div className="grid shrink-0 grid-cols-1 focus-within:relative">
          <select
            id={selectId}
            name="country"
            autoComplete="tel-country-code"
            aria-label="Código de país"
            disabled={disabled}
            value={DEFAULT_COUNTRY_CODE}
            onChange={() => undefined}
            className={cn(
              "col-start-1 row-start-1 w-full appearance-none rounded-l-md bg-transparent py-1 pr-7 pl-3",
              "text-base text-zinc-500 sm:text-sm dark:text-zinc-400",
              "focus:outline-none"
            )}
          >
            <option value={DEFAULT_COUNTRY_CODE}>{DEFAULT_COUNTRY_CODE}</option>
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-2 size-4 self-center justify-self-end text-zinc-500 dark:text-zinc-400"
          />
        </div>
        <input
          {...props}
          ref={ref}
          id={id}
          name={props.name ?? "phone-number"}
          type="tel"
          inputMode="numeric"
          pattern="[0-9 ]*"
          maxLength={9}
          autoComplete="tel-national"
          placeholder={placeholder}
          value={localNumber}
          onChange={handleLocalChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel ?? "Número de teléfono"}
          className={cn(
            "block min-w-0 grow bg-transparent py-1 pr-3 pl-1 text-base text-zinc-900 placeholder:text-zinc-400",
            "focus:outline-none sm:text-sm dark:text-zinc-100 dark:placeholder:text-zinc-500"
          )}
        />
      </div>
    )
  }
)

export { PhoneInput, DEFAULT_COUNTRY_CODE }

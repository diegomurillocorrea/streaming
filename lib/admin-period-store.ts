import {
  ADMIN_PERIOD_STORAGE_KEY,
  normalizeAdminHtmlMonth,
} from "@/lib/admin-period"
import {
  getHtmlMonthValueForToday,
  monthBoundsFromHtmlMonth,
} from "@/lib/monthly-finance"

let snapshot = getHtmlMonthValueForToday()
/** Tras hidratar, `getSnapshot` usa `snapshot` (incluye localStorage). */
let hydrated = false

const listeners = new Set<() => void>()

const emit = () => {
  listeners.forEach((l) => l())
}

const readStoredOrDefault = (): string => {
  if (typeof window === "undefined") return getHtmlMonthValueForToday()
  try {
    const raw = localStorage.getItem(ADMIN_PERIOD_STORAGE_KEY)
    if (raw && monthBoundsFromHtmlMonth(raw)) {
      return normalizeAdminHtmlMonth(raw)
    }
  } catch {
    // ignore
  }
  return getHtmlMonthValueForToday()
}

const flushFromStorage = () => {
  const next = readStoredOrDefault()
  if (next !== snapshot) {
    snapshot = next
  }
}

export const subscribeAdminPeriod = (onStoreChange: () => void): (() => void) => {
  listeners.add(onStoreChange)

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(onStoreChange)
    }
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === ADMIN_PERIOD_STORAGE_KEY || e.key === null) {
      flushFromStorage()
      onStoreChange()
    }
  }

  window.addEventListener("storage", onStorage)

  queueMicrotask(() => {
    hydrated = true
    flushFromStorage()
    onStoreChange()
  })

  return () => {
    listeners.delete(onStoreChange)
    window.removeEventListener("storage", onStorage)
  }
}

export const getAdminPeriodServerSnapshot = (): string => getHtmlMonthValueForToday()

export const getAdminPeriodClientSnapshot = (): string => {
  if (typeof window === "undefined") return getHtmlMonthValueForToday()
  if (!hydrated) return getHtmlMonthValueForToday()
  return snapshot
}

export const writeAdminPeriod = (value: string): void => {
  hydrated = true
  const next = normalizeAdminHtmlMonth(value)
  snapshot = next
  try {
    localStorage.setItem(ADMIN_PERIOD_STORAGE_KEY, next)
  } catch {
    // ignore
  }
  emit()
}

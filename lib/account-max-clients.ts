/** Valor por defecto cuando `accounts.max_clients` es null o inválido. */
export const DEFAULT_MAX_CLIENTS = 5

/** Límite inferior y superior permitidos (alineado con check en BD). */
export const MIN_MAX_CLIENTS = 1
export const MAX_MAX_CLIENTS = 10

export type MaxClientsSource = {
  max_clients?: number | null
}

/**
 * Resuelve cupos máximos de una cuenta con fallback a {@link DEFAULT_MAX_CLIENTS}.
 */
export const getMaxClients = (account: MaxClientsSource | null | undefined): number => {
  const raw = account?.max_clients
  if (raw === null || raw === undefined) return DEFAULT_MAX_CLIENTS
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_MAX_CLIENTS
  const rounded = Math.trunc(n)
  if (rounded < MIN_MAX_CLIENTS) return MIN_MAX_CLIENTS
  if (rounded > MAX_MAX_CLIENTS) return MAX_MAX_CLIENTS
  return rounded
}

/**
 * Parsea y valida un valor de formulario para `max_clients`.
 */
export const parseMaxClientsFormValue = (
  value: string
): { ok: true; value: number } | { ok: false; message: string } => {
  const trimmed = value.trim()
  if (trimmed === "") {
    return { ok: true, value: DEFAULT_MAX_CLIENTS }
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: "Los cupos máximos deben ser un número entero." }
  }
  const n = Number.parseInt(trimmed, 10)
  if (n < MIN_MAX_CLIENTS || n > MAX_MAX_CLIENTS) {
    return {
      ok: false,
      message: `Los cupos máximos deben estar entre ${MIN_MAX_CLIENTS} y ${MAX_MAX_CLIENTS}.`,
    }
  }
  return { ok: true, value: n }
}

/** Mensaje cuando no se puede bajar el límite por suscripciones existentes. */
export const maxClientsBelowSubscriptionCountMessage = (
  newMax: number,
  currentCount: number
): string =>
  `No puedes bajar a ${newMax} cupo${newMax === 1 ? "" : "s"}: la cuenta ya tiene ${currentCount} suscripción${currentCount === 1 ? "" : "es"}.`

/** Mensaje cuando la cuenta ya alcanzó el máximo de cupos. */
export const accountAtMaxClientsMessage = (
  maxClients: number,
  currentCount: number
): string =>
  `Esta cuenta ya tiene el máximo de ${maxClients} suscripción${maxClients === 1 ? "" : "es"} (${currentCount} en uso).`

/** Mensaje legible desde un error de Supabase/PostgREST (evita `{}` en consola/UI). */
export const formatSupabaseError = (error: unknown, fallback = "Error desconocido"): string => {
  if (!error || typeof error !== "object") return fallback
  const e = error as {
    message?: string
    details?: string
    hint?: string
    code?: string
  }
  return e.message?.trim() || e.details?.trim() || e.hint?.trim() || e.code?.trim() || fallback
}

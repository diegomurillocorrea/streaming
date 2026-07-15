/** Bucket de Supabase Storage para archivos de comprobante de pago. */
export const PAYMENT_RECEIPTS_BUCKET = "payment-receipts"

/** Tamaño máximo de archivo (5 MiB). */
export const PAYMENT_RECEIPT_MAX_BYTES = 5 * 1024 * 1024

const RECEIPT_ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
])

export const hasReceiptEvidence = (payment: {
  receipt_storage_path?: string | null
}): boolean => {
  const path = (payment.receipt_storage_path ?? "").trim()
  return path.length > 0
}

/** Evidencia: archivo de comprobante (preferido) o referencia de texto legacy. */
export const hasPaymentEvidence = (payment: {
  payment_reference?: string | null
  receipt_storage_path?: string | null
}): boolean => {
  const ref = (payment.payment_reference ?? "").trim()
  return hasReceiptEvidence(payment) || ref.length > 0
}

export const isReceiptMimeAllowed = (mime: string): boolean =>
  RECEIPT_ALLOWED.has(mime)

export const sanitizeReceiptFileName = (name: string): string => {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 120)
  return base.trim() || "comprobante"
}

export const buildReceiptStoragePath = (input: {
  accountId: number
  paymentId: number
  fileName: string
}): string => {
  const safe = sanitizeReceiptFileName(input.fileName)
  const stamp = Date.now()
  return `${input.accountId}/${input.paymentId}/${stamp}-${safe}`
}

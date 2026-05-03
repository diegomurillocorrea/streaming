export type BankAccountShareRow = {
  id_bank_account: number
  account_name: string
  account_number: string
  bank_name: string
}

/** Valores que no son un número de cuenta real (p. ej. fila "Efectivo" con guión o texto). */
const PLACEHOLDER_ACCOUNT_NUMBERS = new Set(
  [
    "-",
    "—",
    "–",
    "--",
    "...",
    ".",
    "n/a",
    "na",
    "ninguno",
    "ninguna",
    "sin número",
    "sin numero",
    "s/n",
    "sn",
    "0",
    "00",
    "000",
    "efectivo",
  ].map((s) => s.toLowerCase())
)

const normalizeLabel = (value: string | null | undefined) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")

const isShareableBankRow = (row: BankAccountShareRow): boolean => {
  const bank = normalizeLabel(row.bank_name)
  const titular = normalizeLabel(row.account_name)
  if (bank === "efectivo" || titular === "efectivo") return false

  const numRaw = String(row.account_number ?? "").trim()
  if (!numRaw) return false

  const numLower = numRaw.toLowerCase()
  if (PLACEHOLDER_ACCOUNT_NUMBERS.has(numLower)) return false

  if (/^[\s\-–—._/\\]+$/u.test(numRaw)) return false

  if (!/\d/.test(numRaw)) return false

  return true
}

export const filterShareableBankRows = (
  rows: BankAccountShareRow[] | null
): BankAccountShareRow[] => {
  if (!rows?.length) return []
  return rows.filter(isShareableBankRow)
}

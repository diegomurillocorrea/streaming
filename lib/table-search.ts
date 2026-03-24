export const normalizeSearchText = (value: string) => value.trim().toLowerCase()

export const rowMatchesSearch = (
  parts: (string | number | null | undefined)[],
  query: string
) => {
  const q = normalizeSearchText(query)
  if (!q) return true
  const haystack = parts
    .map((p) => String(p ?? ""))
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}

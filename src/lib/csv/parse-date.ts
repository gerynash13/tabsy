// Accepts YYYY-MM-DD or YYYY/MM/DD (both common from Excel depending on
// regional date settings) and normalizes to YYYY-MM-DD. Returns null for
// anything else rather than guessing — a skipped row with a clear error
// is much better than a silently wrong due date on a real invoice.
export function parseDate(value: string): string | null {
  const trimmed = value.trim().replaceAll('/', '-')
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)
  if (!match) return null
  const [, y, m, d] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

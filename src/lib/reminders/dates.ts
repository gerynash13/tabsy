// Vercel Cron always runs on UTC. Everything about Tabsy's reminder logic
// is anchored to Asia/Tokyo instead, so these helpers are the only place
// date math happens — keep it that way rather than re-deriving dates
// elsewhere.

// "Today" as YYYY-MM-DD, in Japan Standard Time, regardless of the
// server process's own timezone.
export function todayInJST(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

// Adds (or subtracts, for negative n) days to a YYYY-MM-DD string.
export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Whole days between two YYYY-MM-DD strings (dateStr minus todayStr).
// Positive = in the future, negative = in the past.
export function daysBetween(dateStr: string, todayStr: string): number {
  const a = new Date(`${dateStr}T00:00:00Z`).getTime()
  const b = new Date(`${todayStr}T00:00:00Z`).getTime()
  return Math.round((a - b) / (1000 * 60 * 60 * 24))
}

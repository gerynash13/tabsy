// Vercel Cron always runs on UTC. Everything about Tabsy's reminder logic
// is anchored to Asia/Tokyo instead, so these two helpers are the only
// place date math happens — keep it that way rather than re-deriving
// "today" elsewhere.

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

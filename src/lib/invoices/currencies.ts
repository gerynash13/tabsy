// Single source of truth for supported currencies — used by both invoice
// forms and CSV import validation, so a typo'd or unsupported currency
// code can't quietly enter the system and break dashboard grouping.
export const SUPPORTED_CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CNY', 'KRW'] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]

export function isSupportedCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
}

// Deliberately no FX conversion here — a dashboard is grouped by
// currency, never summed across currencies. A wrong "combined total"
// from a naive or stale exchange rate is worse than showing nothing;
// real conversion (and which rate to use — invoice date vs. today) is
// its own feature, not a quick addition to this one.
export function groupByCurrency<T extends { currency: string; amount: number | string }>(
  rows: T[]
): { currency: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const r of rows) {
    totals.set(r.currency, (totals.get(r.currency) ?? 0) + Number(r.amount))
  }
  return Array.from(totals.entries())
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total)
}

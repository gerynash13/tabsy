export type LineItem = {
  description: string
  quantity: number
  unit_price: number // tax-EXCLUDED
  tax_rate: number // 0.10 or 0.08
}

export type TaxGroup = {
  rate: number
  subtotal: number // tax-excluded, summed BEFORE any rounding
  tax: number // rounded exactly once for this whole group
  total: number
}

// Japan's qualified invoice rules require rounding consumption tax
// exactly once per tax rate, for the whole invoice — never per line
// item, then summed. Summing pre-rounded per-line tax amounts is
// explicitly disallowed and produces a different (wrong) total. So:
// sum every line's exact, unrounded amount by rate first, THEN round
// the tax for each rate group a single time.
export function calculateTaxGroups(items: LineItem[]): TaxGroup[] {
  const byRate = new Map<number, number>()
  for (const item of items) {
    const lineTotal = item.quantity * item.unit_price
    byRate.set(item.tax_rate, (byRate.get(item.tax_rate) ?? 0) + lineTotal)
  }

  return Array.from(byRate.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([rate, subtotal]) => {
      // Rounding method (floor/ceil/round) is a free business choice under
      // the rule, as long as it's applied consistently — floor (切り捨て)
      // is the most common choice in practice.
      const tax = Math.floor(subtotal * rate)
      return { rate, subtotal, tax, total: subtotal + tax }
    })
}

export function calculateInvoiceTotal(items: LineItem[]): number {
  return calculateTaxGroups(items).reduce((sum, g) => sum + g.total, 0)
}

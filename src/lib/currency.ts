// Single source of truth for displaying money anywhere in the app.
// Uses Intl's currency formatting so each currency gets its correct
// number of decimal places automatically (JPY: 0, USD/EUR: 2, etc.)
// instead of every amount being formatted the same way regardless of
// currency. currencyDisplay: 'code' shows "USD 500.00" rather than
// "$500.00" — deliberate, since a bare $ is ambiguous (USD? CAD? AUD?)
// once more than one currency is actually in play.
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
    }).format(amount)
  } catch {
    // Fallback for a currency code Intl doesn't recognize.
    return `${currency} ${amount.toLocaleString()}`
  }
}

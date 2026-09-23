// Stripe expects amounts in the smallest currency unit (e.g. cents) for
// most currencies — but JPY and KRW are "zero-decimal": the amount IS
// the full amount, never multiplied by 100. Get this backwards and
// you're charging 100x too much or too little. This is the one thing in
// this whole integration that would be a genuinely bad, real-money bug
// to get wrong.
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW'])

export function toStripeAmount(amount: number, currency: string): number {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
  return isZeroDecimal ? Math.round(amount) : Math.round(amount * 100)
}

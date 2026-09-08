// Fills {{placeholder}} tokens in AI-drafted or user-edited templates.
// Deliberately dumb string replacement, not a templating engine — the
// whole point is that this step is 100% deterministic. The AI never
// touches the actual values (amount, date, invoice number); it only ever
// writes the surrounding language, once, at draft time.
export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
}

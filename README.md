# tabsy

## Weeks 1-4 — done
Auth, clients/invoices CRUD, daily reminder engine (Resend), dashboard, bank details, real overdue status, AI-assisted templates (Groq), CSV import, mobile pass.

## Post-MVP round 1 — done
Manual "send reminders now" button, idempotent seed script, currency/bank/account-type dropdowns, expanded client fields, per-stage AI regeneration, full Japanese UI translation.

## Now — インボイス制度-compliant invoice PDF generation

### New setup steps

1. **Run the migration**: `supabase/migrations/004_invoice_pdf.sql` — one statement batch, no ordering gotchas.
2. **Install the new dependency**: `npm install` (adds `@react-pdf/renderer`).
3. **If you're a registered qualified invoice issuer**, add your registration number in Settings (format: `T` + 13 digits — the app validates this and won't save anything else). Leave it blank if you're tax-exempt (免税事業者); the PDF still generates either way, it just won't legally qualify as a 適格請求書 for the recipient without a valid number.
4. **On any invoice**, add at least one line item (description, quantity, unit price — tax-excluded — and tax rate) to unlock the "Download PDF" link. Invoices without line items keep working exactly as before; this is fully additive, nothing existing breaks.

### What's actually in the PDF

Per 国税庁's published requirements for a 適格請求書 (as of 令和7年4月1日, current at the time this was built), six things are legally required, all present here:
1. Issuer name + registration number
2. Transaction date (発行日 — new `issue_date` field, separate from due date)
3. Description of each line item, with reduced-rate (8%) items marked
4. Subtotal per tax rate (10%/8%), tax-excluded
5. Consumption tax amount per tax rate
6. Recipient name (the client)

**The one rule that actually mattered to get right**: consumption tax must be rounded exactly once per tax rate for the whole invoice — never per line item, then summed. `src/lib/invoices/calculate.ts` sums every line's exact, unrounded amount by rate first, and only rounds once at the end, per rate group. This is directly from 国税庁's guidance (消令70の10) — summing pre-rounded per-line amounts is explicitly disallowed and produces a different total than the compliant method.

### What this doesn't do, on purpose

- **This is not a substitute for review by an accountant or tax advisor** before you rely on it for real filings. The six required fields and the rounding rule are handled correctly as far as this was researched and built, but tax law has edge cases (mixed transaction types, imports, agency/brokerage invoicing, the small-business transition-period rules through 2029) that aren't handled here and weren't in scope.
- Only two tax rates are supported (10% standard, 8% reduced) — the two that apply to virtually all freelance/consulting service invoices. No handling for non-taxable or export transactions.
- No 適格簡易請求書 (simplified qualified invoice, for retail/restaurant/taxi businesses) — not relevant to Tabsy's target user.
- The PDF has no logo, custom branding, or layout options yet — it's deliberately plain, correctness-first.

## Still not done
Multi-currency support, Stripe payment links, team accounts.

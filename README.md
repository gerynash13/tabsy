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
Team accounts.

## Stripe payment links

### Setup

1. **Run the migration**: `supabase/migrations/005_stripe_payment_links.sql`.
2. **Install the new dependency**: `npm install` (adds `stripe`).
3. **Get your Stripe secret key** from the Stripe Dashboard (Developers → API keys) — use a **test mode** key while you're trying this out, not a live one. Add it to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```
4. **Set up the webhook** so payments actually mark invoices as paid automatically:
   - **Local testing**: install the [Stripe CLI](https://stripe.com/docs/stripe-cli), run `stripe login`, then `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. It prints a webhook signing secret starting `whsec_...` — put that in `.env.local` as `STRIPE_WEBHOOK_SECRET`. Leave this running in a terminal while you test.
   - **Production (Vercel)**: in the Stripe Dashboard, add an endpoint pointing at `https://yourdomain.com/api/webhooks/stripe`, listening for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy its signing secret into Vercel's env vars as `STRIPE_WEBHOOK_SECRET`.
5. Leaving both variables unset is fine — the "Create payment link" button just doesn't appear, and nothing else about the app changes.

### What's actually happening

- Uses Stripe's **Payment Links API**, not Checkout Sessions. This matters: Checkout Sessions expire after a maximum of 24 hours, which would make them useless for a reminder sequence spanning 17 days (-3 to +14). Payment Links persist until manually deactivated — created once per invoice, reused in every reminder email until paid or edited.
- **JPY and KRW are zero-decimal currencies in Stripe's API** — the amount sent is the actual amount, not multiplied by 100 like most currencies. `src/lib/stripe/amount.ts` handles this; getting it backwards would mean charging 100x too much or too little.
- **Webhook signature verification is mandatory, not optional** — without it, anyone who found the webhook URL could POST a fake "payment succeeded" event and mark any invoice paid for free. The handler reads the raw request body (`request.text()`, never `.json()`) and verifies it against `STRIPE_WEBHOOK_SECRET` before trusting anything in it.
- The invoice is matched to the Stripe session via `client_reference_id` (appended as a URL parameter on the Payment Link) — Stripe's own documented mechanism for this, more reliable than depending on metadata inheriting from a Payment Link onto the session it generates.
- If an invoice's amount or currency changes after a link was created, the old link is automatically deactivated and cleared — a stale link would charge the wrong amount, so the user has to explicitly generate a fresh one rather than an old link silently continuing to work.
- Marking an invoice paid (manually, or automatically via the webhook) deactivates its payment link too, so nobody can pay an already-settled invoice twice from an old email.

### Not included

- Specific Japanese payment methods (Konbini, bank-transfer-via-Stripe/Furikomi) aren't hardcoded here — whatever payment methods are enabled on your Stripe account's Dashboard settings are what customers see. Enable them there if you want them offered, rather than this code assuming they're available (some require account-level eligibility/setup that varies by account).
- No in-app view of Stripe's own transaction/payout history — that lives in the Stripe Dashboard.

## Multi-currency support

The dashboard's outstanding total is now grouped by currency instead of naively summed across them — a ¥100,000 invoice and a $500 invoice show as two separate lines, not one meaningless combined number. `src/lib/invoices/currencies.ts` is now the single source of truth for supported currency codes, used by both invoice forms and CSV import validation (which now rejects/normalizes unsupported currency codes instead of silently accepting anything typed).

**Deliberately not included:** automatic FX conversion into one combined total. That needs a live exchange-rate source and a real decision about which rate to use (the invoice's date? today's rate?) — a wrong "converted" number is worse than showing currencies separately, so this is left for a dedicated pass rather than bolted on here.

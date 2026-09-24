# tabsy

**Invoice reminders for freelancers and small businesses — the awkward payment chase, automated.**

Built Japan-first: bank transfer (振込) is the default payment norm here, not cards, and the whole product is designed around that rather than treating it as an edge case.

🇯🇵 [日本語版はこちら](./README.ja.md)

---

## The problem

Freelancers, consultants, and tiny agencies lose real time and money chasing unpaid invoices: remembering to follow up, writing an awkward reminder email, losing track of who's actually late. Enterprise accounts-receivable software (Monk, Gaviti, Centime) is built for finance teams, not solo operators. Tabsy fills that gap — track invoices, send well-timed reminders automatically, and see who owes what at a glance.

**Positioning decision, made deliberately in week 1:** Tabsy is a reminder *layer*, not an invoice generator. Users log invoice data (and can attach a PDF made elsewhere) rather than Tabsy producing the source document. This keeps the core product small and sidesteps most of Japan's qualified invoice system (インボイス制度) compliance burden — until the point where PDF generation was explicitly added as its own scoped feature, with that compliance work done properly rather than avoided (see below).

## Features

**Core loop**
- Magic-link auth (no passwords — there's no meaningful distinction between "sign up" and "sign in" for a single email-based flow, so building one would have been pure overhead)
- Client and invoice management, with CSV import (Shift-JIS/CP932-aware, for Excel exports from Japanese-locale Windows)
- Dashboard: outstanding total (grouped by currency, never summed across them), due-soon and overdue lists
- Invoice status (unpaid / overdue / paid) computed automatically by the same daily job that sends reminders

**Reminder engine**
- Configurable offsets (default: −3d, due date, +3d, +7d, +14d), tone escalating from friendly to firm
- Runs once daily, computing "due today" in JST regardless of the server's own timezone
- Idempotent by construction — the same invoice can never be reminded twice for the same offset, even if the job runs twice
- Bilingual (Japanese/English) default templates, or AI-drafted (via Groq, free tier) per-user templates — editable per stage, individually regenerable without touching the other four

**Compliance**
- On-demand PDF generation meeting Japan's qualified invoice (適格請求書) requirements: registration number, per-line tax rate, tax calculated and rounded per NTA's actual rule (see below), all six legally required fields present
- Optional Stripe payment links appended to reminder emails, with correct zero-decimal-currency handling and signature-verified webhook confirmation

**Everything else**
- Full Japanese/English UI (a cookie-based locale, separate from — and never confused with — each client's own reminder-language preference)
- Multi-currency support, with per-currency dashboard totals (no invented exchange-rate conversion)

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript | One framework, one deploy target — right-sized for a solo build |
| Database / Auth / Storage | Supabase (Postgres) | Auth, DB, and RLS-based per-user isolation in one place, generous free tier |
| Scheduling | Vercel Cron (daily) | One sweep a day is all this needs; forced an explicit decision about JST vs. the platform's UTC clock |
| Email | Resend | Clean API; free tier covers real usage at this scale |
| AI (template drafting) | Groq (Llama 3.3 70B), OpenAI-compatible API | Free tier, no card required — used a handful of times per user, never at send time |
| Payments | Stripe Payment Links | Chosen over Checkout Sessions specifically because Sessions expire in ≤24h — too short for a 17-day reminder sequence |
| PDF generation | @react-pdf/renderer | No headless browser needed — works cleanly in a serverless function |
| CSV parsing | papaparse + iconv-lite | The latter specifically for Shift-JIS detection/decoding |
| UI | Tailwind + a small custom brand system | Ledger green / paper / ink / overdue-red palette, IBM Plex Sans + IBM Plex Sans JP |

## Architecture & engineering decisions worth knowing about

A flat feature list undersells what actually made this project non-trivial. A few specific decisions:

**Idempotent reminders via claim-then-send.** `reminder_log` has a unique constraint on `(invoice_id, offset_days)`. The cron job writes to that table *before* sending the email, not after — so the write itself is the thing that can only succeed once. If the job somehow ran twice, or a future retry mechanism called it again, only one send could ever win. Get this ordering backwards (send, then log) and a crash between the two steps produces a real duplicate reminder to a real client.

**JST math, decoupled from server time.** Vercel Cron always fires in UTC. All "is this invoice due today" logic goes through one explicit `Asia/Tokyo` conversion (`todayInJST()`), rather than trusting whatever timezone the Node process happens to think it's in.

**Qualified invoice tax rounding, verified against source.** Japan's インボイス制度 requires consumption tax to be rounded *exactly once per tax rate, for the whole invoice* — never per line item, then summed. This is directly from 国税庁 (National Tax Agency) guidance, checked against their published rules rather than assumed; a naive per-line implementation produces a different, non-compliant total.

**Stripe Payment Links, not Checkout Sessions.** Checkout Sessions cap out at a 24-hour expiration — confirmed against Stripe's docs before writing any code — which would make a link dead before most of a 17-day reminder sequence even ran. Payment Links persist until explicitly deactivated, which is what this actually needs. Invoices are matched back to completed sessions via `client_reference_id` (Stripe's documented mechanism for this), not metadata inheritance, which is less reliably documented for Payment-Link-generated sessions.

**Zero-decimal currencies handled explicitly.** JPY and KRW aren't multiplied by 100 before being sent to Stripe's API, unlike every other supported currency here. This is a one-line detail that silently overcharges by 100x if missed.

**The AI/determinism boundary.** Every reminder email's amount, date, invoice number, bank details, and payment link are inserted as plain string interpolation — never generated by a model, even when the surrounding language comes from an LLM-drafted, user-edited template. This boundary doesn't move even as the templating system got more flexible.

**Multi-currency without pretending to convert currencies.** The dashboard groups outstanding totals by currency rather than summing incompatible amounts into one misleading number. Real FX conversion (and the real question of *which* rate — invoice date vs. today) was deliberately left out rather than bolted on carelessly.

## Bugs found and fixed along the way

Worth documenting honestly rather than pretending the first version of everything was correct:

- **`dotenv/config` loads `.env`, not `.env.local`.** A seed script silently had no environment variables at all until this was caught via a `supabaseUrl is required` error and traced to the default config path.
- **A "successful" send wasn't actually checked.** The Resend SDK returns `{ data, error }` rather than throwing — an early version of the cron job ignored the `error` field entirely, so a rejected send was reported as `"sent": true`. Fixed by actually checking the response before recording success.
- **Stripe CLI account/sandbox mismatch.** `stripe listen`'s login session was authenticated to a different account than the one the app's API key belonged to — events fired correctly on Stripe's side but the local listener never saw them. Resolved by pinning the CLI to the exact same key via `--api-key`, removing the ambiguity entirely.
- **Auth middleware silently blocking every server-to-server call.** The middleware gating the app behind a login redirect was also intercepting `/api/*` routes — including the Stripe webhook and, more seriously, the route Vercel's own cron scheduler calls in production. It "worked" in manual testing purely because manual tests came from an already-authenticated browser tab, masking the bug until it was tested via `curl`/incognito with no session at all. Fixed by excluding `/api/*` from the middleware's matcher; each API route already checks its own authorization (Stripe's signature, a bearer secret, or a direct Supabase session check).

## Project structure

```
src/
  app/
    (app)/                    # authenticated routes (dashboard, invoices, clients, settings)
    api/
      cron/reminders/         # the daily reminder sweep, called by Vercel Cron
      webhooks/stripe/        # signature-verified payment confirmation
      invoices/[id]/pdf/      # on-demand qualified-invoice PDF
      locale/                 # sets the UI language cookie
    auth/callback/            # magic-link session exchange
    login/
  lib/
    reminders/                # dates (JST math), templates, AI drafting, the sweep itself
    stripe/                   # payment link creation/deactivation, zero-decimal amount handling
    invoices/                 # tax calculation (qualified-invoice rounding), currency list
    invoice-pdf/               # the React-PDF document template
    csv/                      # Shift-JIS-aware decoding, date parsing
    i18n/                     # locale cookie + full EN/JA dictionary
    supabase/                 # server, browser, and service-role clients
supabase/
  schema.sql                  # full schema for a fresh install
  migrations/                 # incremental migrations for an existing database
```

## Getting started

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.local.example` to `.env.local` and fill in Supabase, Resend, and (optionally) Groq/Stripe credentials.
3. `npm install && npm run dev`.
4. `npm run seed` creates test invoices at each reminder offset for exercising the engine locally.

See [`DEVELOPMENT.md`](./DEVELOPMENT.md) (the working development log this document was distilled from) for the full week-by-week build process and setup detail for each individual feature.

## Known limitations

- No team/multi-user accounts yet — every table's row-level security currently assumes one user owns everything it touches.
- The qualified-invoice PDF generator was built carefully against 国税庁's published requirements, but **is not a substitute for review by an accountant or tax advisor** before relying on it for real filings — transition-period rules, agency invoicing, and other edge cases weren't in scope.
- No automatic currency conversion on the dashboard, by design (see above).

## Development process

Built through an extended pair-programming process with Claude (Anthropic), with every scoping call, feature priority, and product decision made by the project owner — including catching several of the real bugs listed above through actual hands-on testing, not just code review. Documented here because it's an accurate description of how this was built, not a disclaimer.

## License

MIT — feel free to adjust if you'd prefer otherwise before publishing.

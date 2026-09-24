# tabsy

**Invoice reminders for freelancers and small businesses — the awkward payment chase, automated.**

Built Japan-first: bank transfer (振込) is the default payment norm here, not cards, and the whole product is designed around that rather than treating it as an edge case.

🇯🇵 [日本語版はこちら](./README.ja.md)

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase) ![Stripe](https://img.shields.io/badge/Stripe-Payment%20Links-635BFF?logo=stripe) ![License](https://img.shields.io/badge/license-MIT-green)

*(Tech-stack badges only — there's no CI pipeline behind this yet, so no build/coverage badges are shown; adding either would be claiming something that isn't true.)*

---

## The problem

Freelancers, consultants, and tiny agencies lose real time and money chasing unpaid invoices: remembering to follow up, writing an awkward reminder email, losing track of who's actually late. Enterprise accounts-receivable software (Monk, Gaviti, Centime) is built for finance teams, not solo operators. Tabsy fills that gap — track invoices, send well-timed reminders automatically, and see who owes what at a glance.

## Demo / Screenshots

*Not yet added to this repo.* Recommended screens to capture before publishing, in this order:
- [ ] Dashboard (outstanding total, due-soon / overdue lists)
- [ ] Invoice list showing status badges (unpaid / overdue / paid)
- [ ] Invoice edit page — line items, the "Download PDF" and "Create payment link" actions
- [ ] Template editor — AI-drafted Japanese template, before/after editing
- [ ] The 日本語 / EN language toggle in the header

## Features

**Core loop**
- Magic-link auth (no passwords — there's no meaningful difference between "sign up" and "sign in" for a single email-based flow)
- Client and invoice management, with CSV import (Shift-JIS/CP932-aware, for Excel exports from Japanese-locale Windows)
- Dashboard: outstanding total grouped by currency (never summed across them), due-soon and overdue lists
- Invoice status (unpaid / overdue / paid) computed automatically by the same daily job that sends reminders

**Reminder engine**
- Configurable offsets (default: −3d, due date, +3d, +7d, +14d), tone escalating from friendly to firm
- Runs once daily, computing "due today" in JST regardless of the server's own timezone
- Idempotent by construction — the same invoice can never be reminded twice for the same offset
- Bilingual (Japanese/English) default templates, or AI-drafted (via Groq, free tier) per-user templates — editable per stage, individually regenerable

**Compliance**
- On-demand PDF generation meeting Japan's qualified invoice (適格請求書) requirements: registration number, per-line tax rate, tax rounded per the NTA's actual rule (see [Engineering notes](#engineering-notes))
- Optional Stripe payment links in reminder emails, with correct zero-decimal-currency handling and signature-verified webhook confirmation

**Everything else**
- Full Japanese/English UI (a cookie-based locale, separate from each client's own reminder-language preference)
- Multi-currency support, with per-currency dashboard totals (no invented exchange-rate conversion)

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript | One framework, one deploy target |
| Database / Auth / Storage | Supabase (Postgres) | Auth, DB, and RLS-based per-user isolation in one place |
| Scheduling | Vercel Cron (daily) | One sweep a day is all this needs |
| Email | Resend | Clean API, generous free tier |
| AI (template drafting) | Groq (Llama 3.3 70B), OpenAI-compatible API | Free tier, no card required |
| Payments | Stripe Payment Links | Not Checkout Sessions — see [Engineering notes](#engineering-notes) |
| PDF generation | @react-pdf/renderer | No headless browser needed, serverless-friendly |
| CSV parsing | papaparse + iconv-lite | The latter for Shift-JIS detection/decoding |
| UI | Tailwind + a small custom brand system | Ledger green / paper / ink / overdue-red palette, IBM Plex Sans + IBM Plex Sans JP |

## Prerequisites

- Node.js 20 or later, and npm
- A [Supabase](https://supabase.com) account (free tier is enough)
- A [Resend](https://resend.com) account (free tier: 3,000 emails/month)
- Optional: a [Groq](https://console.groq.com) account for AI-drafted templates, a [Stripe](https://stripe.com) account for payment links

## Quick start

```bash
git clone <this-repo>
cd tabsy
npm install
cp .env.local.example .env.local   # fill in the values — see table below
npm run dev
```

Then, once:
1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Sign in at `localhost:3000` with your email (a magic link is sent — no password to set).
3. `npm run seed` creates test invoices at every reminder offset, for exercising the engine without waiting days for real due dates.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (client-safe) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Used for magic-link redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only — bypasses RLS for the cron job and seed script. Never expose to the browser |
| `RESEND_API_KEY` | Yes | Sends reminder emails |
| `REMINDER_FROM_EMAIL` | Yes | The "from" address on reminder emails |
| `CRON_SECRET` | Yes (production) | Authenticates Vercel's own call to the cron route |
| `GROQ_API_KEY` | No | Enables AI-drafted templates. Feature just doesn't appear without it |
| `STRIPE_SECRET_KEY` | No | Enables payment links. Feature just doesn't appear without it |
| `STRIPE_WEBHOOK_SECRET` | No | Required only if `STRIPE_SECRET_KEY` is set — verifies webhook signatures |

## Usage

1. **Settings** — add your business name, bank transfer details, and (optionally) your インボイス制度 registration number.
2. **Clients** — add a client's contact info and their preferred reminder language.
3. **Invoices** — create one manually, or import a batch via CSV. Add line items if you want a compliant PDF or a Stripe payment link for it.
4. **Reminders** — once deployed, these send automatically, once a day, based on each invoice's due date. Locally, or right after deploying, use the "Send reminders now" button in Settings to trigger a check on demand instead of waiting.
5. **Dashboard** — see what's outstanding, due soon, and overdue at a glance.

## Testing & verification

There's no automated test suite (no Jest/Playwright setup) — this was verified through hands-on testing during development, not a CI pipeline. The actual verification approach:
- `npm run seed` creates one test invoice per reminder offset; running the cron route twice in a row is the real check that nothing gets double-sent (the second run should report `"sent": false` for everything).
- Stripe's test mode (card `4242 4242 4242 4242`) plus the Stripe CLI's `stripe listen` for exercising the payment-link → webhook → "invoice marked paid" flow end to end.
- No formal test coverage for the PDF tax calculation beyond manual verification against 国税庁's published examples — worth adding real unit tests for `src/lib/invoices/calculate.ts` specifically, since that's the one piece where a silent regression would be a genuine compliance problem, not just a cosmetic bug.

## Troubleshooting

Real issues hit during development, kept here because the next person (possibly future-me) will hit the same ones:

- **`tsx: not found`** — ran `npm run seed` without running `npm install` after a dependency was added. Fix: `npm install`, then retry.
- **`supabaseUrl is required` in the seed script** — `dotenv/config` loads a file literally named `.env`, not `.env.local`. The seed script loads `.env.local` explicitly for this reason; if you copy this pattern elsewhere, don't assume the default `dotenv/config` import does what you'd expect.
- **Garbled/broken Japanese text in the generated PDF** — `@react-pdf/renderer`'s default fonts have no Japanese glyphs at all. Fixed by registering Noto Sans JP via `Font.register()` before rendering.
- **`stripe listen` errors with "must specify events to forward"** — a Stripe CLI version change now requires an explicit flag. Use `--all-snapshot` (the classic full-payload event format this codebase expects), not `--all-thin`.
- **Stripe events fire in the Dashboard but never reach `stripe listen`** — the CLI's login session is authenticated to a different account/sandbox than the key in `.env.local`. Force it: `stripe listen --api-key sk_test_... --all-snapshot --forward-to localhost:3000/api/webhooks/stripe`.
- **Webhook or cron route returns a 307 redirect to `/login` instead of running** — the auth middleware was gating `/api/*` routes too, redirecting any request without a browser session (which is every server-to-server call: Stripe's webhook, Vercel's own cron scheduler). Fixed by excluding `/api/*` from the middleware's matcher in `src/middleware.ts`.
- **Garbled client names after CSV import** — Excel on Japanese-locale Windows commonly exports Shift-JIS, not UTF-8. `src/lib/csv/decode.ts` detects and falls back to Shift-JIS decoding for this.

## Engineering notes

A few decisions worth knowing about, for anyone reading the code rather than just running it:

- **Idempotent reminders**: `reminder_log` has a unique constraint on `(invoice_id, offset_days)`, and the cron job writes to it *before* sending — the write itself is the thing that can only succeed once, not an after-the-fact log.
- **JST math decoupled from server time**: Vercel Cron fires in UTC; all "is this due today" logic goes through one explicit `Asia/Tokyo` conversion rather than trusting the process's own timezone.
- **Qualified invoice tax rounding**: verified directly against 国税庁 guidance — consumption tax is rounded exactly once per tax rate for the whole invoice, never per line item then summed, since the latter produces a non-compliant total.
- **Stripe Payment Links, not Checkout Sessions**: Sessions expire in a maximum of 24 hours, confirmed against Stripe's docs before writing code — too short for a 17-day reminder sequence. Invoices are matched to completed payments via `client_reference_id` (Stripe's documented mechanism for this), not metadata inheritance.
- **Zero-decimal currencies**: JPY and KRW aren't multiplied by 100 before hitting Stripe's API, unlike every other supported currency — missing this silently overcharges by 100x.
- **The AI/determinism boundary**: every reminder's amount, date, invoice number, bank details, and payment link are plain string interpolation, never model-generated — even when the surrounding language comes from an LLM-drafted, user-edited template.

## Known limitations

- No team/multi-user accounts — every table's row-level security currently assumes one user owns everything it touches.
- The qualified-invoice PDF generator is **not a substitute for review by an accountant or tax advisor** before relying on it for real filings — transition-period rules and other edge cases weren't in scope.
- No automatic currency conversion on the dashboard, by design.

## Contributing

This is a personal project, built and documented as part of a learning process rather than a maintained open-source library — there's no CONTRIBUTING.md workflow or issue triage process set up. Forks and reading the code are welcome; if you spot something worth fixing, opening an issue describing it is more useful than a PR out of the blue, at least until this has an actual process for that.

## License

MIT — feel free to adjust if you'd prefer otherwise before publishing.

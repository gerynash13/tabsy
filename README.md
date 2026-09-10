# tabsy

## Week 1 — done
Auth, clients CRUD, invoices CRUD.

## Week 2 — done
Daily reminder cron job, Resend integration, default JA/EN templates, idempotent send logging.

## Week 3 — done
Dashboard, bank details in settings, real stored "overdue" status, AI-assisted template editor (Groq).

## Week 4 — CSV import, polish, soft launch

### New setup steps

1. **Install the new dependencies:**
   ```
   npm install
   ```
   This adds `papaparse` (CSV parsing) and `iconv-lite` (Shift-JIS decoding).

2. **Try the CSV import.** Go to Invoices → Import CSV. A sample file matching the expected format is included at `sample-invoices.csv` in the project root — upload it as a first test. Required columns: `client_name`, `invoice_number`, `amount`, `due_date`. `client_email` and `notes` are optional; `currency` defaults to `JPY` if left blank. Clients are matched by email (falling back to name if there's no email column) and created automatically if they don't already exist.

3. **If you want to test the Shift-JIS handling specifically**, save a CSV from Excel on a Japanese-locale Windows machine (Excel's default CSV export there is commonly Shift-JIS, not UTF-8) and import that — this is the actual real-world case the encoding detection exists for.

### What's new

- **CSV import** (`/invoices/import`) — decodes UTF-8 or Shift-JIS automatically, parses with `papaparse`, reports exactly which rows succeeded and which were skipped and why (missing field, bad date, etc.), rather than failing the whole file on one bad row.
- **Mobile pass** — tables scroll horizontally instead of breaking layout on narrow screens, the dashboard's summary cards stack to one column, and the nav wraps instead of overflowing.
- **Cron route now has a top-level error handler** — an unexpected failure (bad query, schema mismatch, anything) now returns a proper JSON error and logs clearly via `console.error`, which shows up in Vercel's Logs tab with zero extra setup. That's genuinely enough monitoring for this stage. If you want real alerting later (a notification when something fails, not just a log you have to go look at), run `npx @sentry/wizard@latest -i nextjs` yourself when you're ready — it needs an interactive setup this delivery format can't do safely on your behalf, and hand-writing that config blind is more likely to introduce a subtle bug than to help.

### Before you send a reminder to an actual client (soft-launch checklist)

- [ ] Verify your own domain in Resend (Domains → Add Domain) and switch `REMINDER_FROM_EMAIL` off the shared sandbox sender — a freshly verified domain needs a little time to build sending reputation, so do this a few days before you need it, not the day of.
- [ ] Have someone fluent in business Japanese read through your saved templates in Settings → Manage email templates — AI-drafted copy is a starting point, not something to trust unread, especially for the more firmly-worded overdue stages.
- [ ] Fill in real bank transfer details in Settings and confirm they render correctly in a test email to yourself.
- [ ] Delete any leftover `TEST-*` invoices from earlier testing.
- [ ] Re-run the Week 2 test loop (seed → trigger cron → trigger again) one more time end to end, now with real templates and real bank details, before pointing it at a real invoice.

## Still not done
Stripe/payment links, multi-currency, team accounts, invoice PDF generation with インボイス制度-compliant formatting.

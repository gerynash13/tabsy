# tabsy

## Week 1 — done
Auth, clients CRUD, invoices CRUD.

## Week 2 — done
Daily reminder cron job, Resend integration, default JA/EN templates, idempotent send logging.

## Week 3 — dashboard, bank details, real overdue status, AI templates

### New setup steps

1. **Run the migration.** Open `supabase/migrations/002_week3.sql` in the Supabase SQL editor. **Run Part 1 by itself first** (`alter type invoice_status add value 'overdue';`), wait for it to finish, then run Part 2 (creates `email_templates`). Postgres won't let a brand-new enum value be used in the same statement batch it was just added in, so this has to be two separate runs, in order.

2. **Get a Groq API key** at console.groq.com — sign up with email or Google, no credit card needed, ever, on the free tier. Grab a key from console.groq.com/keys and add it to `.env.local`:
   ```
   GROQ_API_KEY=...
   ```
   The free tier is rate-limited (roughly 30 requests/minute), but this is only ever called when you click "Draft with AI" — a handful of times total, not per reminder sent — so you won't come close to that limit in normal use.

   Prefer OpenRouter instead? `src/lib/reminders/draft-templates.ts` has a comment showing exactly what to change (`baseURL`, `apiKey`, `MODEL`) — it's a two-line swap since both providers expose an OpenAI-compatible API.

3. **Install the new dependency:**
   ```
   npm install
   ```

4. **Fill in your bank details.** Go to Settings in the app and add your business name and bank transfer (振込) details. These now get appended to every reminder email automatically.

5. **Draft your email templates.** Go to Settings → Manage email templates, pick a language, and click "Draft all 5 with AI." Review and edit what comes back — this is placeholder-quality copy from a model, not something to trust blindly, especially the Japanese phrasing if you're not fluent enough to check it yourself. Leaving a stage blank falls back to the built-in default.

6. **Re-run the Week 2 test loop** (`npm run seed`, hit `/api/cron/reminders`, run it again to confirm no duplicates) to see your bank details and any custom templates actually show up in a real send.

### What changed under the hood

- **`invoices.status` can now be `overdue` for real.** The cron job promotes any unpaid invoice past its due date before it does anything else, every day. The invoice list and dashboard just read this stored value now — no more computing it on the fly.
- **The cron job checks `email_templates` before falling back to the hardcoded defaults**, per user, per language, per stage. If you haven't drafted anything yet, everything behaves exactly as it did in Week 2.
- **AI only ever touches the surrounding language, once, at draft time** — never the amount, date, invoice number, or bank details, which are always inserted as plain variables (`{{client_name}}`, `{{amount}}`, etc.) after the fact. That rule doesn't change even though templates are now editable.
- **The dashboard's outstanding total is a naive sum** — it assumes one currency. Multi-currency support is still explicitly out of scope for the MVP.

## Still not done
Stripe/payment links, CSV import, multi-currency, team accounts, invoice PDF generation.

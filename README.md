# tabsy

## Week 1 — done
Auth, clients CRUD, invoices CRUD.

## Week 2 — the reminder engine

### New setup steps

1. **Get your Supabase service role key.** Project Settings → API → "service_role" key (different from the "anon public" one you already have). This is secret — never put it in a browser-facing file.

2. **Create a Resend account** at resend.com (free tier: 3,000 emails/month). Grab an API key from the dashboard.

3. **Add the new variables to your existing `.env.local`** (don't overwrite the file, just add these lines — see `.env.local.example` for the full list):
   ```
   SUPABASE_SERVICE_ROLE_KEY=...
   RESEND_API_KEY=...
   REMINDER_FROM_EMAIL=Tabsy <onboarding@resend.dev>
   CRON_SECRET=any-random-string-you-make-up
   ```
   `onboarding@resend.dev` is Resend's shared sandbox sender — it works immediately with no setup, but in sandbox mode Resend will generally only deliver to *your own* verified account email. That's fine for testing this week. Once you have a domain, verify it in Resend (Domains → Add Domain, then add the DNS records it shows you) and switch `REMINDER_FROM_EMAIL` to something like `Tabsy <reminders@yourdomain.com>` — do this well before sending to real clients, since a freshly verified domain needs a little time to build sending reputation.

4. **Install the new dependencies:**
   ```
   npm install
   ```

5. **For a fast test loop, set your first client's email to your own address** (edit the client in the app) — otherwise Resend's sandbox mode won't actually deliver anywhere you can see.

6. **Seed some test invoices:**
   ```
   npm run seed
   ```
   This creates five invoices for your first client, with due dates set so today matches each default reminder offset (−3, 0, +3, +7, +14 days).

7. **Trigger the cron job manually** (in dev, the auth check is skipped): open `http://localhost:3000/api/cron/reminders` in your browser, or `curl http://localhost:3000/api/cron/reminders`. You should get back a JSON summary and, if you set your own email as the client's contact, five emails.

8. **Run it again immediately.** This is the important check: the second run should report `"sent": false` for all five — nothing should be emailed twice. That's the idempotency behavior the whole design depends on.

### What's actually running

- `src/app/api/cron/reminders/route.ts` — the daily job. For every unpaid invoice, checks each of that user's reminder offsets against today's date (computed in JST, not the server's own timezone), and sends whichever ones match.
- `src/lib/reminders/templates.ts` — the email copy itself, in Japanese and English, escalating in tone as an invoice gets more overdue. **This is placeholder copy** — worth having someone fluent in business Japanese review the ja templates before this goes near a real client. Week 3 replaces this with an AI-drafted, per-user editable version, but the mechanism (claim → send → log) doesn't change.
- `src/lib/supabase/admin.ts` — a service-role Supabase client, used only server-side, only by the cron job and the seed script. It bypasses your row-level security entirely, which is exactly what a background job needs (it has to see every user's data, not just one signed-in person's) and exactly why the key must never reach the browser.
- `vercel.json` — schedules the cron route to run once a day at `0 0 * * *` UTC, which is 9:00am JST.

### Known limitations, on purpose

- If Resend's send call fails after the slot's already been claimed in `reminder_log`, that reminder silently never retries. Fine to notice-and-manually-fix at your current scale; worth a real retry/dead-letter approach before this is handling other people's client relationships unsupervised.
- No dashboard yet, no bank details in the emails yet, no stored "overdue" status — those are Week 3.
- Deploying this to Vercel with cron actually running requires setting all of the env vars above in the Vercel project settings too, plus `CRON_SECRET` specifically (Vercel automatically attaches it as a Bearer token when it invokes the route).

## Next: Week 3

Dashboard (outstanding total, due-soon, overdue lists), bank transfer details in settings wired into the emails, stored overdue status computed by the cron job itself, and the AI-assisted template editor.

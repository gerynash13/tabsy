# tabsy — Week 1

Auth, clients, and invoices CRUD, wired to Supabase. No reminders yet — that's Week 2.

## Setup

1. **Create a Supabase project** at supabase.com (free tier is fine).

2. **Run the schema.** Open the SQL editor in your Supabase project and paste in the contents of `supabase/schema.sql`, then run it. This creates `profiles`, `clients`, `invoices`, `reminder_log`, sets up row-level security so each user only ever sees their own data, and adds a trigger that creates a `profiles` row automatically whenever someone signs up.

3. **Configure auth redirect URLs.** In Supabase, go to Authentication → URL Configuration and add:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

   (Add your production URL here too once you deploy.)

4. **Copy environment variables.**
   ```
   cp .env.local.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase → Project Settings → API.

5. **Install and run.**
   ```
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`. Sign in with your email — Supabase sends a magic link (check your inbox, including spam, the first time).

## What's here

- Magic-link auth (no passwords to manage)
- Clients: create, list, edit, delete
- Invoices: create, list, edit, delete, mark as paid
- Brand colors and IBM Plex Sans / IBM Plex Sans JP wired into Tailwind, matching the Tabsy brand kit

## Known things to watch for

- **`IBM_Plex_Sans_JP` import** in `src/app/layout.tsx` — this should resolve from `next/font/google`, but if your installed Next.js version's font catalogue doesn't have it under that exact name, swap it for `Noto_Sans_JP` (same idea, slightly different letterforms). This is the one spot I couldn't verify by actually running a build in this environment.
- **"Overdue" is computed, not stored, for now.** The invoice list works out whether something's overdue on the fly from `due_date` + `status`. Week 3 adds the cron job that actually promotes the stored status — until then, editing an invoice only lets you set `unpaid`/`paid`.
- **`reminder_log` exists but is unused.** It's there so Week 2's cron job has somewhere to write to on day one, per the project brief.
- **First sign-in:** Supabase's default email sending works out of the box in development — no need to wire up Resend yet, that's for the automated reminder emails in Week 2, not for login.

## Next: Week 2

Daily cron endpoint that reads `reminder_offsets` off each invoice, checks `reminder_log` to avoid duplicate sends, and sends via Resend.

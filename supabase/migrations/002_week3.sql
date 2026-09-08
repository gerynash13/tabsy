-- Week 3 migration — run in the Supabase SQL editor against your existing
-- project. Run part 1 by itself and let it finish before running part 2 —
-- Postgres won't let a brand-new enum value be used in the same
-- statement batch it was just added in.

-- ── Part 1 — run this alone, then come back for part 2 ──────────────────
alter type invoice_status add value 'overdue';


-- ── Part 2 — run after part 1 has completed ──────────────────────────────

-- Per-user, per-language, per-stage custom email templates. If a row
-- doesn't exist for a given (user, language, offset), the cron job falls
-- back to the built-in default in src/lib/reminders/templates.ts.
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  language text not null check (language in ('ja', 'en')),
  stage_offset int not null,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, language, stage_offset)
);

alter table email_templates enable row level security;

create policy "manage own email templates" on email_templates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

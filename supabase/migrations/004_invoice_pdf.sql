-- Run in the Supabase SQL editor. Safe as a single statement batch, no
-- ordering gotchas.

-- Optional — not every user is a registered qualified invoice issuer
-- (many small freelancers stay tax-exempt/免税事業者 and have no
-- registration number at all). Format is always "T" + 13 digits.
alter table profiles add column invoice_registration_number text;

-- 取引年月日 (transaction/service date) — a required field on a
-- qualified invoice, distinct from due_date.
alter table invoices add column issue_date date;

-- Line items, stored as JSON rather than a separate table: each invoice
-- owns its own items, nothing needs to query across them, and this
-- avoids a second RLS-protected table for what is really just structured
-- data on one row. Shape: [{ description, quantity, unit_price, tax_rate }]
-- tax_rate is a decimal (0.10 or 0.08), unit_price is tax-EXCLUDED.
alter table invoices add column line_items jsonb not null default '[]'::jsonb;

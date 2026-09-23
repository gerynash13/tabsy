-- Run in the Supabase SQL editor. Single statement batch, safe as-is.
alter table invoices add column stripe_payment_link_id text;
alter table invoices add column stripe_payment_link_url text;

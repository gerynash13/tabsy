-- Run in the Supabase SQL editor. Adds optional extra fields to clients —
-- safe to run as one statement, no ordering gotchas like the Week 3 migration.
alter table clients
  add column company_name text,
  add column phone text,
  add column notes text;

-- Tabsy — Week 1 schema
-- Run this in the Supabase SQL editor on a fresh project.

-- profiles: one row per authenticated user, extends auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  business_name text,
  bank_details jsonb not null default '{}'::jsonb,
  reminder_offsets int[] not null default '{-3,0,3,7,14}',
  created_at timestamptz not null default now()
);

-- clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  contact_email text,
  preferred_language text not null default 'ja' check (preferred_language in ('ja', 'en')),
  created_at timestamptz not null default now()
);

-- invoices
create type invoice_status as enum ('unpaid', 'paid');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  invoice_number text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'JPY',
  due_date date not null,
  status invoice_status not null default 'unpaid',
  pdf_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- reminder_log — not used until Week 2's cron job, but the shape is fixed now
-- so the reminder engine has somewhere to write to on day one.
create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  offset_days int not null,
  sent_at timestamptz not null default now(),
  unique (invoice_id, offset_days)
);

-- Row Level Security: every table is scoped to the owning user.
alter table profiles enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table reminder_log enable row level security;

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "manage own clients" on clients for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "manage own invoices" on invoices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "manage own reminder logs" on reminder_log for all
  using (exists (
    select 1 from invoices
    where invoices.id = reminder_log.invoice_id
    and invoices.user_id = auth.uid()
  ));

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

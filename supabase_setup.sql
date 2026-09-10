-- Supabase Schema for EXPTRACK Expense Tracker
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- Safe to re-run: all statements use IF NOT EXISTS / DO blocks.

-- 1. Create Users Table
create table if not exists public.users (
  id text primary key,
  email text unique not null,
  password_hash text,
  full_name text not null,
  occupation text default '',
  monthly_budget numeric default null,
  google_id text unique,
  auth_provider text default 'password',
  token_version integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1a. Migrations for existing deployments (safe no-op if already present)
do $$ begin
  alter table public.users alter column password_hash drop not null;
exception when others then null;
end $$;

do $$ begin
  alter table public.users add column if not exists google_id text unique;
exception when others then null;
end $$;

do $$ begin
  alter table public.users add column if not exists auth_provider text default 'password';
exception when others then null;
end $$;

do $$ begin
  alter table public.users add column if not exists token_version integer not null default 0;
exception when others then null;
end $$;

-- Optional cleanup if reverting from phone-auth experiments (run only after verifying no accounts depend on them):
-- alter table public.users alter column email set not null;
-- drop index if exists public.idx_users_phone;
-- alter table public.users drop column if exists phone;

-- 2. Create Expenses Table
create table if not exists public.expenses (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  date text not null,
  category text not null,
  amount numeric not null,
  type text not null check (type in ('debit', 'credit')),
  currency text default '₹',
  description text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Password Resets Table (OTP-based)
--    If an older token-based table exists, migrate/replace cleanly.
--    NOTE: stores the SHA-256 HASH of the 6-digit OTP, never the raw OTP.
do $$ begin
  -- If password_resets exists with older token_hash column, replace with clean OTP-based schema
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'password_resets' and column_name = 'token_hash'
  ) then
    drop table public.password_resets cascade;
  end if;
end $$;

create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  otp_hash text not null,
  expires_at timestamp with time zone not null,
  attempts integer default 0,
  used boolean default false,
  created_at timestamp with time zone default now()
);

-- 4. Create Indexes for fast querying
create index if not exists idx_expenses_user_date on public.expenses(user_id, date desc);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_google_id on public.users(google_id);
create index if not exists idx_pw_resets_user on public.password_resets(user_id);

-- 5. Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.expenses enable row level security;
alter table public.password_resets enable row level security;

-- Permissive policies for backend server access (using service role / anon key)
-- Uses DO blocks for compatibility with PostgreSQL 15 (Supabase default).
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users'
    and policyname = 'Allow all operations for anon/authenticated'
  ) then
    execute 'create policy "Allow all operations for anon/authenticated" on public.users for all using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'expenses'
    and policyname = 'Allow all operations for anon/authenticated'
  ) then
    execute 'create policy "Allow all operations for anon/authenticated" on public.expenses for all using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'password_resets'
    and policyname = 'Allow all operations for anon/authenticated'
  ) then
    execute 'create policy "Allow all operations for anon/authenticated" on public.password_resets for all using (true) with check (true)';
  end if;
end $$;

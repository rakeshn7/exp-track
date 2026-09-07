-- Supabase Schema for Ledger Expense Tracker
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create Users Table
create table if not exists public.users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  phone text default '',
  occupation text default '',
  monthly_budget numeric default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- 3. Create Indexes for fast querying by user and date
create index if not exists idx_expenses_user_date on public.expenses(user_id, date desc);
create index if not exists idx_users_email on public.users(email);

-- 4. Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.expenses enable row level security;

-- Permissive policies for the backend server access (using API key)
create policy "Allow all operations for anon/authenticated" on public.users
  for all using (true) with check (true);

create policy "Allow all operations for anon/authenticated" on public.expenses
  for all using (true) with check (true);

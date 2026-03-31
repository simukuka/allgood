-- ═══════════════════════════════════════════════════════════
-- AllGood Database Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  avatar_url text,
  phone text,
  country text,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


-- 2. Accounts table (balances)
create table if not exists public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  balance numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  account_type text not null default 'checking' check (account_type in ('checking', 'savings')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "Users can view own accounts"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "Users can update own accounts"
  on public.accounts for update
  using (auth.uid() = user_id);

create policy "Users can insert own accounts"
  on public.accounts for insert
  with check (auth.uid() = user_id);


-- 3. Bank Accounts table
create table if not exists public.bank_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  bank_name text not null,
  account_holder text not null,
  account_last4 text not null,
  routing_last4 text,
  currency text not null default 'USD',
  available_balance numeric(12, 2) not null default 0,
  is_verified boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_accounts
  add column if not exists is_default boolean not null default false;

create unique index if not exists bank_accounts_one_default_per_user
  on public.bank_accounts (user_id)
  where is_default = true;

alter table public.bank_accounts enable row level security;

create policy "Users can view own bank accounts"
  on public.bank_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own bank accounts"
  on public.bank_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bank accounts"
  on public.bank_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete own bank accounts"
  on public.bank_accounts for delete
  using (auth.uid() = user_id);


-- 4. Bank Transfers table
create table if not exists public.bank_transfers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  bank_account_id uuid references public.bank_accounts(id) on delete cascade not null,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  direction text not null check (direction in ('inbound', 'outbound')),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  note text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.bank_transfers enable row level security;

create policy "Users can view own bank transfers"
  on public.bank_transfers for select
  using (auth.uid() = user_id);

create policy "Users can insert own bank transfers"
  on public.bank_transfers for insert
  with check (auth.uid() = user_id);


-- 4a. Webhook event lock table (idempotency)
create table if not exists public.webhook_events (
  id uuid default gen_random_uuid() primary key,
  provider text not null,
  event_id text not null,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  error_message text,
  payload jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, event_id)
);

alter table public.webhook_events enable row level security;

create policy "Service role manages webhook events"
  on public.webhook_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- 4b. Funding audit ledger
create table if not exists public.funding_audit_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  event_type text not null,
  external_ref text,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'succeeded' check (status in ('succeeded', 'failed')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.funding_audit_events enable row level security;

create policy "Users can view own funding audit events"
  on public.funding_audit_events for select
  using (auth.uid() = user_id);

create policy "Service role inserts funding audit events"
  on public.funding_audit_events for insert
  with check (auth.role() = 'service_role' or auth.uid() = user_id);


-- 5. Transactions table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete set null not null,
  recipient_id uuid references public.profiles(id) on delete set null,
  recipient_email text,
  recipient_phone text,
  recipient_name text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  converted_amount numeric(12, 2),
  converted_currency text,
  exchange_rate numeric(10, 6),
  fee numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  type text not null check (type in ('send', 'receive', 'request')),
  note text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = sender_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = sender_id or auth.uid() = recipient_id);


-- 6. Contacts table
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  country_code text,
  flag_emoji text,
  is_favorite boolean not null default false,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, contact_email)
);

alter table public.contacts enable row level security;

create policy "Users can view own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);


-- 7. Scheduled Transfers table
create table if not exists public.scheduled_transfers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  recipient_email text,
  recipient_phone text,
  recipient_name text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  frequency text not null check (frequency in ('once', 'weekly', 'biweekly', 'monthly')),
  next_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.scheduled_transfers enable row level security;

create policy "Users can view own scheduled transfers"
  on public.scheduled_transfers for select
  using (auth.uid() = user_id);

create policy "Users can insert own scheduled transfers"
  on public.scheduled_transfers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scheduled transfers"
  on public.scheduled_transfers for update
  using (auth.uid() = user_id);


-- 6a. Helper RPC: atomic balance deduction (with negative-balance guard)
create or replace function public.deduct_balance(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
as $$
declare
  v_balance numeric;
begin
  select balance into v_balance
  from public.accounts
  where user_id = p_user_id and account_type = 'checking'
  for update;

  if v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  update public.accounts
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = p_user_id
    and account_type = 'checking';
end;
$$;

-- 6b. Helper RPC: atomic balance addition (deposits)
create or replace function public.add_balance(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
as $$
begin
  update public.accounts
  set balance = balance + p_amount,
      updated_at = now()
  where user_id = p_user_id
    and account_type = 'checking';
end;
$$;


-- 7. Auto-create profile on signup (trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  insert into public.accounts (user_id, balance, currency, account_type)
  values (new.id, 0, 'USD', 'checking');

  return new;
end;
$$;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 8. Rafiki wallet address ID on profiles
-- Populated by the operator backend after provisioning a wallet for each user.
alter table public.profiles
  add column if not exists rafiki_wallet_address_id text;

alter table public.profiles
  add column if not exists passport_number text;

-- Backfill deterministic passport numbers for existing users
update public.profiles
set passport_number = concat(
  'AG-',
  upper(substr(replace(id::text, '-', ''), 1, 4)),
  '-',
  upper(substr(replace(id::text, '-', ''), 29, 4)),
  '-',
  lpad(
    (
      (
        ascii(substr(replace(id::text, '-', ''), 1, 1)) +
        ascii(substr(replace(id::text, '-', ''), 2, 1)) +
        ascii(substr(replace(id::text, '-', ''), 3, 1)) +
        ascii(substr(replace(id::text, '-', ''), 4, 1))
      ) % 100
    )::text,
    2,
    '0'
  )
)
where passport_number is null;

-- 8c. AI coach chat memory table
create table if not exists public.ai_chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_chat_messages enable row level security;

create policy "Users can view own ai chat messages"
  on public.ai_chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own ai chat messages"
  on public.ai_chat_messages for insert
  with check (auth.uid() = user_id);

-- 8b. Identity fields collected at sign-up
alter table public.profiles
  add column if not exists dob text,       -- date of birth MM/DD/YYYY
  add column if not exists id_type text;   -- 'ssn' | 'itin' | 'matricula' | 'passport'

-- Update trigger to capture these from user_metadata on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, country, dob, id_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'dob',
    new.raw_user_meta_data->>'id_type'
  )
  on conflict (id) do nothing;

  insert into public.accounts (user_id, balance, currency, account_type)
  values (new.id, 500.00, 'USD', 'checking')
  on conflict do nothing;

  return new;
end;
$$;


-- 9. Indexes for performance
create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_transactions_sender on public.transactions(sender_id);
create index if not exists idx_transactions_recipient on public.transactions(recipient_id);
create index if not exists idx_transactions_created on public.transactions(created_at desc);
create index if not exists idx_contacts_user_id on public.contacts(user_id);
create index if not exists idx_scheduled_user_id on public.scheduled_transfers(user_id);


-- 10. Seed: give all existing zero-balance accounts a $500 demo balance
-- Safe to run multiple times; only updates accounts that are still at $0
update public.accounts
set balance = 500.00, updated_at = now()
where account_type = 'checking' and balance = 0;


-- ═══════════════════════════════════════════════════════════
-- DONE — run the full file in Supabase SQL Editor (Dashboard → SQL Editor)
-- Then copy .env.example → .env, fill in your project credentials, and run:
--   npm start
-- ═══════════════════════════════════════════════════════════

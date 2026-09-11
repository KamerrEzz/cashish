-- Cashish Entrega 1 schema (MXN, solo personal, RLS por auth.uid())

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  timezone text not null default 'America/Mexico_City',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create type public.account_type as enum ('cash', 'checking', 'savings', 'credit_card');
create type public.transaction_type as enum ('expense', 'income', 'transfer');
create type public.statement_status as enum ('open', 'closed', 'paid');
create type public.subscription_frequency as enum ('weekly', 'monthly', 'yearly');
create type public.reminder_event_type as enum (
  'statement_close',
  'payment_due',
  'subscription_charge',
  'cashflow_shortfall'
);
create type public.reminder_channel as enum ('in_app', 'email');
create type public.reminder_status as enum ('pending', 'sent', 'dismissed');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type public.account_type not null,
  currency text not null default 'MXN' check (currency = 'MXN'),
  -- cash/checking/savings: money available
  -- credit_card: amount owed (debt)
  balance_cents bigint not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "accounts_all_own" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.credit_card_profiles (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  credit_limit_cents bigint not null check (credit_limit_cents >= 0),
  statement_close_day smallint not null check (statement_close_day between 1 and 28),
  payment_due_day smallint not null check (payment_due_day between 1 and 28),
  minimum_payment_cents bigint not null default 0 check (minimum_payment_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index credit_card_profiles_user_id_idx on public.credit_card_profiles (user_id);

alter table public.credit_card_profiles enable row level security;

create policy "cc_profiles_all_own" on public.credit_card_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.statement_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  opens_on date not null,
  closes_on date not null,
  due_on date not null,
  opening_balance_cents bigint not null default 0,
  closing_balance_cents bigint,
  minimum_payment_cents bigint not null default 0,
  status public.statement_status not null default 'open',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (closes_on >= opens_on),
  check (due_on >= closes_on)
);

create unique index statement_periods_one_open_per_account
  on public.statement_periods (account_id)
  where status = 'open';

create index statement_periods_user_id_idx on public.statement_periods (user_id);
create index statement_periods_account_id_idx on public.statement_periods (account_id);

alter table public.statement_periods enable row level security;

create policy "statement_periods_all_own" on public.statement_periods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_account_id uuid not null references public.accounts (id),
  to_account_id uuid not null references public.accounts (id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  occurred_on date not null default (timezone('America/Mexico_City', now()))::date,
  note text,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

create index transfers_user_id_idx on public.transfers (user_id);

alter table public.transfers enable row level security;

create policy "transfers_all_own" on public.transfers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  name text not null,
  merchant text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  frequency public.subscription_frequency not null default 'monthly',
  next_billing_on date not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_next_billing_idx on public.subscriptions (next_billing_on)
  where is_active = true;

alter table public.subscriptions enable row level security;

create policy "subscriptions_all_own" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type public.transaction_type not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  merchant text,
  description text,
  category text,
  occurred_on date not null default (timezone('America/Mexico_City', now()))::date,
  statement_period_id uuid references public.statement_periods (id) on delete set null,
  transfer_id uuid references public.transfers (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_occurred_on_idx on public.transactions (occurred_on);

alter table public.transactions enable row level security;

create policy "transactions_all_own" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type public.reminder_event_type not null,
  channel public.reminder_channel not null,
  title text not null,
  body text not null,
  due_on date not null,
  related_account_id uuid references public.accounts (id) on delete set null,
  related_subscription_id uuid references public.subscriptions (id) on delete set null,
  related_statement_id uuid references public.statement_periods (id) on delete set null,
  dedupe_key text not null,
  status public.reminder_status not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dedupe_key)
);

create index reminders_user_pending_idx on public.reminders (user_id, status, due_on);

alter table public.reminders enable row level security;

create policy "reminders_select_own" on public.reminders
  for select using (auth.uid() = user_id);
create policy "reminders_update_own" on public.reminders
  for update using (auth.uid() = user_id);
create policy "reminders_insert_own" on public.reminders
  for insert with check (auth.uid() = user_id);

-- Atomic linked transfer (pago TDC / move money)
create or replace function public.create_linked_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount_cents bigint,
  p_occurred_on date,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
  v_transfer_id uuid;
  v_open_period_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents <> floor(p_amount_cents) then
    raise exception 'amount_cents must be a positive integer';
  end if;

  select * into v_from from public.accounts
    where id = p_from_account_id and user_id = v_user_id for update;
  select * into v_to from public.accounts
    where id = p_to_account_id and user_id = v_user_id for update;

  if v_from.id is null or v_to.id is null then
    raise exception 'Account not found';
  end if;
  if v_from.currency <> 'MXN' or v_to.currency <> 'MXN' then
    raise exception 'Only MXN supported';
  end if;

  -- Apply balance changes by account type
  if v_from.type = 'credit_card' then
    -- Paying from a credit card increases debt (cash advance style) — block for MVP
    raise exception 'Cannot transfer from a credit card in MVP';
  else
    update public.accounts
      set balance_cents = balance_cents - p_amount_cents, updated_at = now()
      where id = v_from.id;
  end if;

  if v_to.type = 'credit_card' then
    -- Payment toward card reduces debt
    update public.accounts
      set balance_cents = balance_cents - p_amount_cents, updated_at = now()
      where id = v_to.id;
  else
    update public.accounts
      set balance_cents = balance_cents + p_amount_cents, updated_at = now()
      where id = v_to.id;
  end if;

  insert into public.transfers (
    user_id, from_account_id, to_account_id, amount_cents, occurred_on, note
  ) values (
    v_user_id, p_from_account_id, p_to_account_id, p_amount_cents, p_occurred_on, p_note
  ) returning id into v_transfer_id;

  -- Outgoing leg on from account
  insert into public.transactions (
    user_id, account_id, type, amount_cents, description, occurred_on, transfer_id
  ) values (
    v_user_id, p_from_account_id, 'transfer', p_amount_cents,
    coalesce(p_note, 'Transferencia'), p_occurred_on, v_transfer_id
  );

  -- Incoming leg on to account (attach open statement if CC)
  if v_to.type = 'credit_card' then
    select id into v_open_period_id
      from public.statement_periods
      where account_id = v_to.id and status = 'open'
      limit 1;
  end if;

  insert into public.transactions (
    user_id, account_id, type, amount_cents, description, occurred_on,
    transfer_id, statement_period_id
  ) values (
    v_user_id, p_to_account_id, 'transfer', p_amount_cents,
    coalesce(p_note, 'Transferencia'), p_occurred_on,
    v_transfer_id, v_open_period_id
  );

  return v_transfer_id;
end;
$$;

revoke all on function public.create_linked_transfer(uuid, uuid, bigint, date, text) from public;
grant execute on function public.create_linked_transfer(uuid, uuid, bigint, date, text) to authenticated;

-- Close open statement period and open the next one
create or replace function public.close_statement_period(
  p_account_id uuid,
  p_minimum_payment_cents bigint default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_profile public.credit_card_profiles%rowtype;
  v_period public.statement_periods%rowtype;
  v_closed_id uuid;
  v_next_open date;
  v_next_close date;
  v_next_due date;
  v_min bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_account from public.accounts
    where id = p_account_id and user_id = v_user_id for update;
  if v_account.id is null or v_account.type <> 'credit_card' then
    raise exception 'Credit card account required';
  end if;

  select * into v_profile from public.credit_card_profiles
    where account_id = p_account_id and user_id = v_user_id;
  if v_profile.account_id is null then
    raise exception 'Credit card profile missing';
  end if;

  select * into v_period from public.statement_periods
    where account_id = p_account_id and status = 'open'
    for update;
  if v_period.id is null then
    raise exception 'No open statement period';
  end if;

  v_min := coalesce(p_minimum_payment_cents, v_profile.minimum_payment_cents);

  update public.statement_periods
    set status = 'closed',
        closing_balance_cents = v_account.balance_cents,
        minimum_payment_cents = v_min,
        closed_at = now()
    where id = v_period.id
    returning id into v_closed_id;

  -- Next cycle: day after close → next close day → due day
  v_next_open := v_period.closes_on + 1;
  v_next_close := make_date(
    extract(year from v_next_open)::int,
    extract(month from v_next_open)::int,
    v_profile.statement_close_day
  );
  if v_next_close <= v_period.closes_on then
    v_next_close := (v_next_close + interval '1 month')::date;
  end if;

  v_next_due := make_date(
    extract(year from v_next_close)::int,
    extract(month from v_next_close)::int,
    v_profile.payment_due_day
  );
  if v_next_due <= v_next_close then
    v_next_due := (v_next_due + interval '1 month')::date;
  end if;

  insert into public.statement_periods (
    user_id, account_id, opens_on, closes_on, due_on,
    opening_balance_cents, minimum_payment_cents, status
  ) values (
    v_user_id, p_account_id, v_next_open, v_next_close, v_next_due,
    v_account.balance_cents, v_profile.minimum_payment_cents, 'open'
  );

  return v_closed_id;
end;
$$;

revoke all on function public.close_statement_period(uuid, bigint) from public;
grant execute on function public.close_statement_period(uuid, bigint) to authenticated;

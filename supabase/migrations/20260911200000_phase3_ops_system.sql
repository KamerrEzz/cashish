-- Phase 3: import batches, planned inflows, MSI, budgets, viewer role, push, archive

-- ── Enums ──────────────────────────────────────────────────────────
do $$ begin
  create type public.import_row_status as enum (
    'pending', 'review', 'applied', 'rejected', 'duplicate'
  );
exception when duplicate_object then null;
end $$;

-- viewer enum value added in 20260911200001 (must commit before use)

-- ── Transactions merchant_key ──────────────────────────────────────
alter table public.transactions
  add column if not exists merchant_key text;

create index if not exists transactions_merchant_key_idx
  on public.transactions (project_id, merchant_key)
  where merchant_key is not null;

-- ── Projects archive ───────────────────────────────────────────────
alter table public.projects
  add column if not exists archived_at timestamptz;

-- ── Import ─────────────────────────────────────────────────────────
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_filename text not null,
  source_format text not null check (source_format in ('csv', 'ofx')),
  account_id uuid references public.accounts (id) on delete set null,
  status text not null default 'review'
    check (status in ('review', 'applied', 'cancelled')),
  row_count int not null default 0,
  applied_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_batches_project_idx
  on public.import_batches (project_id);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  status public.import_row_status not null default 'review',
  occurred_on date not null,
  amount_cents bigint not null,
  type public.transaction_type not null,
  merchant text,
  description text,
  category text,
  fingerprint text not null,
  raw jsonb not null default '{}'::jsonb,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (batch_id, fingerprint)
);

create index if not exists import_rows_batch_idx on public.import_rows (batch_id);
create index if not exists import_rows_project_status_idx
  on public.import_rows (project_id, status);
create index if not exists import_rows_fingerprint_project_idx
  on public.import_rows (project_id, fingerprint);

-- ── Planned inflows (expected income) ──────────────────────────────
create table if not exists public.planned_inflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'MXN',
  next_on date not null,
  frequency public.subscription_frequency not null default 'monthly',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planned_inflows_project_idx
  on public.planned_inflows (project_id);

-- ── MSI installment plans ──────────────────────────────────────────
create table if not exists public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete set null,
  label text not null,
  total_cents bigint not null check (total_cents > 0),
  installment_cents bigint not null check (installment_cents > 0),
  months_total int not null check (months_total between 2 and 48),
  months_remaining int not null check (months_remaining >= 0),
  next_due_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists installment_plans_project_idx
  on public.installment_plans (project_id);
create index if not exists installment_plans_account_idx
  on public.installment_plans (account_id);

-- ── Budgets / envelopes ────────────────────────────────────────────
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category text,
  monthly_limit_cents bigint not null check (monthly_limit_cents > 0),
  currency text not null default 'MXN',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists budgets_project_idx on public.budgets (project_id);

-- ── Web push subscriptions ─────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ── RLS helpers for write roles (owner|member, not viewer) ─────────
create or replace function public.is_project_writer(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'member')
  );
$$;

revoke all on function public.is_project_writer(uuid) from public, anon;
grant execute on function public.is_project_writer(uuid) to authenticated;

-- Update member insert policy to allow viewer invites later via invites table
-- (invites still member-only for now; viewer can be set by owner RPC)

-- Enable RLS
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.planned_inflows enable row level security;
alter table public.installment_plans enable row level security;
alter table public.budgets enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "import_batches_member" on public.import_batches;
create policy "import_batches_member" on public.import_batches
  for select using (public.is_project_member(project_id));
create policy "import_batches_writer" on public.import_batches
  for all using (public.is_project_writer(project_id))
  with check (public.is_project_writer(project_id) and user_id = auth.uid());

drop policy if exists "import_rows_member" on public.import_rows;
create policy "import_rows_member" on public.import_rows
  for select using (public.is_project_member(project_id));
create policy "import_rows_writer" on public.import_rows
  for all using (public.is_project_writer(project_id))
  with check (public.is_project_writer(project_id));

drop policy if exists "planned_inflows_all" on public.planned_inflows;
create policy "planned_inflows_select" on public.planned_inflows
  for select using (public.is_project_member(project_id));
create policy "planned_inflows_writer" on public.planned_inflows
  for all using (public.is_project_writer(project_id))
  with check (public.is_project_writer(project_id) and user_id = auth.uid());

drop policy if exists "installment_plans_all" on public.installment_plans;
create policy "installment_plans_select" on public.installment_plans
  for select using (public.is_project_member(project_id));
create policy "installment_plans_writer" on public.installment_plans
  for all using (public.is_project_writer(project_id))
  with check (public.is_project_writer(project_id) and user_id = auth.uid());

drop policy if exists "budgets_all" on public.budgets;
create policy "budgets_select" on public.budgets
  for select using (public.is_project_member(project_id));
create policy "budgets_writer" on public.budgets
  for all using (public.is_project_writer(project_id))
  with check (public.is_project_writer(project_id) and user_id = auth.uid());

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tighten finance write policies to writers where policies were "for all"
-- (select stays member; mutating ops need writer). Keep existing member-all
-- policies for backward compat on core tables — viewer blocked in app layer
-- + is_project_writer on new tables. For core tables add WITH CHECK writer
-- via replacing insert/update policies is heavy; enforce via requireProjectWriter().

-- Batch apply import rows RPC
create or replace function public.apply_import_rows(
  p_batch_id uuid,
  p_account_id uuid,
  p_row_ids uuid[] default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_batch public.import_batches%rowtype;
  v_account public.accounts%rowtype;
  v_row public.import_rows%rowtype;
  v_tx_id uuid;
  v_period_id uuid;
  v_applied int := 0;
  v_delta bigint;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_batch from public.import_batches where id = p_batch_id;
  if not found then
    raise exception 'Batch not found';
  end if;
  if not public.is_project_writer(v_batch.project_id) then
    raise exception 'Not allowed';
  end if;

  select * into v_account
  from public.accounts
  where id = p_account_id and project_id = v_batch.project_id;
  if not found then
    raise exception 'Account not found';
  end if;

  for v_row in
    select * from public.import_rows r
    where r.batch_id = p_batch_id
      and r.status = 'review'
      and (p_row_ids is null or r.id = any(p_row_ids))
    order by r.occurred_on, r.created_at
  loop
    -- Skip if fingerprint already applied in project
    if exists (
      select 1 from public.import_rows ir
      where ir.project_id = v_batch.project_id
        and ir.fingerprint = v_row.fingerprint
        and ir.status = 'applied'
        and ir.id <> v_row.id
    ) then
      update public.import_rows set status = 'duplicate' where id = v_row.id;
      continue;
    end if;

    v_period_id := null;
    if v_account.type = 'credit_card' then
      select id into v_period_id
      from public.statement_periods
      where account_id = v_account.id and status = 'open'
      limit 1;
    end if;

    insert into public.transactions (
      user_id, project_id, account_id, type, amount_cents, currency,
      merchant, description, category, occurred_on, statement_period_id, merchant_key
    ) values (
      v_uid, v_batch.project_id, v_account.id, v_row.type, abs(v_row.amount_cents), 'MXN',
      v_row.merchant, v_row.description, v_row.category, v_row.occurred_on, v_period_id,
      nullif(lower(regexp_replace(coalesce(v_row.merchant, ''), '[^a-z0-9]+', '', 'g')), '')
    ) returning id into v_tx_id;

    -- balance update
    if v_account.type = 'credit_card' then
      if v_row.type = 'expense' then
        v_delta := abs(v_row.amount_cents);
      else
        v_delta := -abs(v_row.amount_cents);
      end if;
    else
      if v_row.type = 'income' then
        v_delta := abs(v_row.amount_cents);
      else
        v_delta := -abs(v_row.amount_cents);
      end if;
    end if;

    update public.accounts
      set balance_cents = balance_cents + v_delta,
          updated_at = now()
      where id = v_account.id;

    update public.import_rows
      set status = 'applied', transaction_id = v_tx_id
      where id = v_row.id;

    v_applied := v_applied + 1;
  end loop;

  update public.import_batches
    set applied_count = applied_count + v_applied,
        status = case
          when not exists (
            select 1 from public.import_rows
            where batch_id = p_batch_id and status = 'review'
          ) then 'applied'
          else status
        end,
        account_id = coalesce(account_id, p_account_id),
        updated_at = now()
    where id = p_batch_id;

  return v_applied;
end;
$$;

revoke all on function public.apply_import_rows(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.apply_import_rows(uuid, uuid, uuid[]) to authenticated;

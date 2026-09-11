-- Phase 2: projects as separate ledgers + members + invites + receipts

create type public.project_member_role as enum ('owner', 'member');
create type public.receipt_status as enum (
  'uploaded',
  'parsing',
  'ready',
  'failed',
  'applied'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, slug)
);

create index projects_created_by_idx on public.projects (created_by);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.project_member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);

create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null,
  role public.project_member_role not null default 'member'
    check (role = 'member'),
  token text not null unique,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index project_invites_project_id_idx on public.project_invites (project_id);
create index project_invites_email_idx on public.project_invites (lower(email));

-- Membership helpers (SECURITY DEFINER to avoid RLS recursion)
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_owner(p_project_id uuid)
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
      and m.role = 'owner'
  );
$$;

revoke all on function public.is_project_member(uuid) from public, anon;
revoke all on function public.is_project_owner(uuid) from public, anon;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.is_project_owner(uuid) to authenticated;

-- Backfill: one Personal project per existing profile
insert into public.projects (id, name, slug, created_by)
select gen_random_uuid(), 'Personal', 'personal', p.id
from public.profiles p
where not exists (
  select 1 from public.projects pr
  where pr.created_by = p.id and pr.slug = 'personal'
);

insert into public.project_members (project_id, user_id, role)
select pr.id, pr.created_by, 'owner'
from public.projects pr
where pr.slug = 'personal'
on conflict do nothing;

-- Add project_id columns (nullable first)
alter table public.accounts add column if not exists project_id uuid references public.projects (id);
alter table public.credit_card_profiles add column if not exists project_id uuid references public.projects (id);
alter table public.statement_periods add column if not exists project_id uuid references public.projects (id);
alter table public.transfers add column if not exists project_id uuid references public.projects (id);
alter table public.subscriptions add column if not exists project_id uuid references public.projects (id);
alter table public.transactions add column if not exists project_id uuid references public.projects (id);
alter table public.reminders add column if not exists project_id uuid references public.projects (id);
alter table public.mcp_api_keys add column if not exists project_id uuid references public.projects (id);
alter table public.ai_conversations add column if not exists project_id uuid references public.projects (id);
alter table public.ai_usage_events add column if not exists project_id uuid references public.projects (id);

-- Backfill project_id from each owner's Personal project
update public.accounts a
set project_id = pr.id
from public.projects pr
where pr.created_by = a.user_id and pr.slug = 'personal' and a.project_id is null;

update public.credit_card_profiles c
set project_id = pr.id
from public.projects pr
where pr.created_by = c.user_id and pr.slug = 'personal' and c.project_id is null;

update public.statement_periods s
set project_id = pr.id
from public.projects pr
where pr.created_by = s.user_id and pr.slug = 'personal' and s.project_id is null;

update public.transfers t
set project_id = pr.id
from public.projects pr
where pr.created_by = t.user_id and pr.slug = 'personal' and t.project_id is null;

update public.subscriptions s
set project_id = pr.id
from public.projects pr
where pr.created_by = s.user_id and pr.slug = 'personal' and s.project_id is null;

update public.transactions t
set project_id = pr.id
from public.projects pr
where pr.created_by = t.user_id and pr.slug = 'personal' and t.project_id is null;

update public.reminders r
set project_id = pr.id
from public.projects pr
where pr.created_by = r.user_id and pr.slug = 'personal' and r.project_id is null;

update public.mcp_api_keys k
set project_id = pr.id
from public.projects pr
where pr.created_by = k.user_id and pr.slug = 'personal' and k.project_id is null;

update public.ai_conversations c
set project_id = pr.id
from public.projects pr
where pr.created_by = c.user_id and pr.slug = 'personal' and c.project_id is null;

update public.ai_usage_events e
set project_id = pr.id
from public.projects pr
where pr.created_by = e.user_id and pr.slug = 'personal' and e.project_id is null;

-- Enforce NOT NULL
alter table public.accounts alter column project_id set not null;
alter table public.credit_card_profiles alter column project_id set not null;
alter table public.statement_periods alter column project_id set not null;
alter table public.transfers alter column project_id set not null;
alter table public.subscriptions alter column project_id set not null;
alter table public.transactions alter column project_id set not null;
alter table public.reminders alter column project_id set not null;
alter table public.mcp_api_keys alter column project_id set not null;
alter table public.ai_conversations alter column project_id set not null;
alter table public.ai_usage_events alter column project_id set not null;

create index accounts_project_id_idx on public.accounts (project_id);
create index transactions_project_id_idx on public.transactions (project_id);
create index subscriptions_project_id_idx on public.subscriptions (project_id);
create index reminders_project_id_idx on public.reminders (project_id);
create index mcp_api_keys_project_id_idx on public.mcp_api_keys (project_id);
create index ai_conversations_project_id_idx on public.ai_conversations (project_id);

-- Receipts
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  mime text not null,
  status public.receipt_status not null default 'uploaded',
  parsed jsonb,
  error text,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index receipts_project_id_idx on public.receipts (project_id);

-- RLS projects
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.receipts enable row level security;

create policy "projects_select_member" on public.projects
  for select using (
    public.is_project_member(id)
    or created_by = auth.uid()
  );
create policy "projects_insert_authenticated" on public.projects
  for insert with check (auth.uid() = created_by);
create policy "projects_update_owner" on public.projects
  for update using (public.is_project_owner(id));
create policy "projects_delete_owner" on public.projects
  for delete using (public.is_project_owner(id));

create policy "project_members_select" on public.project_members
  for select using (public.is_project_member(project_id));
create policy "project_members_insert_owner" on public.project_members
  for insert with check (
    public.is_project_owner(project_id)
    or (auth.uid() = user_id and role = 'owner')
  );
create policy "project_members_delete_owner" on public.project_members
  for delete using (
    public.is_project_owner(project_id)
    and not (user_id = auth.uid() and role = 'owner')
  );

create policy "project_invites_select" on public.project_invites
  for select using (
    public.is_project_owner(project_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "project_invites_insert_owner" on public.project_invites
  for insert with check (public.is_project_owner(project_id) and invited_by = auth.uid());
create policy "project_invites_update" on public.project_invites
  for update using (
    public.is_project_owner(project_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "project_invites_delete_owner" on public.project_invites
  for delete using (public.is_project_owner(project_id));

create policy "receipts_all_member" on public.receipts
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id) and uploaded_by = auth.uid());

-- Replace finance RLS with membership
drop policy if exists "accounts_all_own" on public.accounts;
create policy "accounts_member" on public.accounts
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists "cc_profiles_all_own" on public.credit_card_profiles;
create policy "cc_profiles_member" on public.credit_card_profiles
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists "statement_periods_all_own" on public.statement_periods;
create policy "statement_periods_member" on public.statement_periods
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists "transfers_all_own" on public.transfers;
create policy "transfers_member" on public.transfers
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists "subscriptions_all_own" on public.subscriptions;
create policy "subscriptions_member" on public.subscriptions
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists "transactions_all_own" on public.transactions;
create policy "transactions_member" on public.transactions
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists "reminders_select_own" on public.reminders;
drop policy if exists "reminders_update_own" on public.reminders;
drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_member" on public.reminders
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists "mcp_keys_select_own" on public.mcp_api_keys;
drop policy if exists "mcp_keys_insert_own" on public.mcp_api_keys;
drop policy if exists "mcp_keys_update_own" on public.mcp_api_keys;
create policy "mcp_keys_own" on public.mcp_api_keys
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and public.is_project_member(project_id)
  );

drop policy if exists "ai_conversations_select_own" on public.ai_conversations;
drop policy if exists "ai_conversations_insert_own" on public.ai_conversations;
drop policy if exists "ai_conversations_update_own" on public.ai_conversations;
drop policy if exists "ai_conversations_delete_own" on public.ai_conversations;
create policy "ai_conversations_member" on public.ai_conversations
  for all using (
    auth.uid() = user_id and public.is_project_member(project_id)
  )
  with check (
    auth.uid() = user_id and public.is_project_member(project_id)
  );

-- ai_messages still via conversation ownership
drop policy if exists "ai_usage_events_select_own" on public.ai_usage_events;
drop policy if exists "ai_usage_events_insert_own" on public.ai_usage_events;
create policy "ai_usage_events_member" on public.ai_usage_events
  for all using (
    auth.uid() = user_id and public.is_project_member(project_id)
  )
  with check (
    auth.uid() = user_id and public.is_project_member(project_id)
  );

-- Signup: profile + Personal project
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  insert into public.projects (name, slug, created_by)
  values ('Personal', 'personal', new.id)
  returning id into v_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, new.id, 'owner');

  return new;
end;
$$;

-- Accept invite RPC
create or replace function public.accept_project_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invite public.project_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_invite
  from public.project_invites
  where token = p_token
  for update;

  if v_invite.id is null then
    raise exception 'Invitación no encontrada';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Invitación ya aceptada';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Invitación expirada';
  end if;
  if lower(v_invite.email) <> v_email then
    raise exception 'Esta invitación es para otro correo';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_invite.project_id, v_uid, v_invite.role)
  on conflict (project_id, user_id) do nothing;

  update public.project_invites
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.project_id;
end;
$$;

revoke all on function public.accept_project_invite(text) from public, anon;
grant execute on function public.accept_project_invite(text) to authenticated;

create or replace function public.preview_project_invite(p_token text)
returns table (
  project_id uuid,
  project_name text,
  email text,
  role public.project_member_role,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.project_id, p.name, i.email, i.role, i.expires_at, i.accepted_at
  from public.project_invites i
  join public.projects p on p.id = i.project_id
  where i.token = p_token
    and (
      auth.uid() is not null
      and (
        public.is_project_owner(i.project_id)
        or lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    );
$$;

revoke all on function public.preview_project_invite(text) from public, anon;
grant execute on function public.preview_project_invite(text) to authenticated;

-- RPCs: authorize via project membership; set project_id on inserts
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
    where id = p_from_account_id for update;
  select * into v_to from public.accounts
    where id = p_to_account_id for update;

  if v_from.id is null or v_to.id is null then
    raise exception 'Account not found';
  end if;
  if v_from.project_id <> v_to.project_id then
    raise exception 'Accounts must belong to the same project';
  end if;
  if not public.is_project_member(v_from.project_id) then
    raise exception 'Not a project member';
  end if;
  if v_from.currency <> 'MXN' or v_to.currency <> 'MXN' then
    raise exception 'Only MXN supported';
  end if;

  if v_from.type = 'credit_card' then
    raise exception 'Cannot transfer from a credit card in MVP';
  else
    update public.accounts
      set balance_cents = balance_cents - p_amount_cents, updated_at = now()
      where id = v_from.id;
  end if;

  if v_to.type = 'credit_card' then
    update public.accounts
      set balance_cents = balance_cents - p_amount_cents, updated_at = now()
      where id = v_to.id;
  else
    update public.accounts
      set balance_cents = balance_cents + p_amount_cents, updated_at = now()
      where id = v_to.id;
  end if;

  insert into public.transfers (
    user_id, project_id, from_account_id, to_account_id, amount_cents, occurred_on, note
  ) values (
    v_user_id, v_from.project_id, p_from_account_id, p_to_account_id, p_amount_cents, p_occurred_on, p_note
  ) returning id into v_transfer_id;

  insert into public.transactions (
    user_id, project_id, account_id, type, amount_cents, description, occurred_on, transfer_id
  ) values (
    v_user_id, v_from.project_id, p_from_account_id, 'transfer', p_amount_cents,
    coalesce(p_note, 'Transferencia'), p_occurred_on, v_transfer_id
  );

  if v_to.type = 'credit_card' then
    select id into v_open_period_id
      from public.statement_periods
      where account_id = v_to.id and status = 'open'
      limit 1;
  end if;

  insert into public.transactions (
    user_id, project_id, account_id, type, amount_cents, description, occurred_on,
    transfer_id, statement_period_id
  ) values (
    v_user_id, v_from.project_id, p_to_account_id, 'transfer', p_amount_cents,
    coalesce(p_note, 'Transferencia'), p_occurred_on,
    v_transfer_id, v_open_period_id
  );

  return v_transfer_id;
end;
$$;

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
    where id = p_account_id for update;
  if v_account.id is null or v_account.type <> 'credit_card' then
    raise exception 'Credit card account required';
  end if;
  if not public.is_project_member(v_account.project_id) then
    raise exception 'Not a project member';
  end if;

  select * into v_profile from public.credit_card_profiles
    where account_id = p_account_id;
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
    user_id, project_id, account_id, opens_on, closes_on, due_on,
    opening_balance_cents, minimum_payment_cents, status
  ) values (
    v_user_id, v_account.project_id, p_account_id, v_next_open, v_next_close, v_next_due,
    v_account.balance_cents, v_profile.minimum_payment_cents, 'open'
  );

  return v_closed_id;
end;
$$;

-- Storage bucket for receipts (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "receipts_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and public.is_project_member((storage.foldername(name))[1]::uuid)
);

create policy "receipts_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and public.is_project_member((storage.foldername(name))[1]::uuid)
);

create policy "receipts_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'receipts'
  and public.is_project_member((storage.foldername(name))[1]::uuid)
);

-- MCP keys resolve to a project-scoped ledger
drop function if exists public.mcp_resolve_api_key(text);

create function public.mcp_resolve_api_key(p_key_hash text)
returns table (user_id uuid, key_id uuid, project_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with updated as (
    update public.mcp_api_keys k
      set last_used_at = now()
      where k.key_hash = p_key_hash
        and k.revoked_at is null
      returning k.user_id, k.id, k.project_id
  )
  select u.user_id, u.id, u.project_id from updated u;
end;
$$;

revoke all on function public.mcp_resolve_api_key(text) from public;
grant execute on function public.mcp_resolve_api_key(text) to service_role;

-- Multi-currency Phase 1: MXN, COP, PEN, CLP (account-level, no FX)

-- Widen currency checks on core tables
alter table public.accounts drop constraint if exists accounts_currency_check;
alter table public.accounts
  add constraint accounts_currency_check
  check (currency in ('MXN', 'COP', 'PEN', 'CLP'));

alter table public.transactions drop constraint if exists transactions_currency_check;
alter table public.transactions
  add constraint transactions_currency_check
  check (currency in ('MXN', 'COP', 'PEN', 'CLP'));

alter table public.transfers drop constraint if exists transfers_currency_check;
alter table public.transfers
  add constraint transfers_currency_check
  check (currency in ('MXN', 'COP', 'PEN', 'CLP'));

alter table public.subscriptions drop constraint if exists subscriptions_currency_check;
alter table public.subscriptions
  add constraint subscriptions_currency_check
  check (currency in ('MXN', 'COP', 'PEN', 'CLP'));

alter table public.planned_inflows drop constraint if exists planned_inflows_currency_check;
alter table public.planned_inflows
  add constraint planned_inflows_currency_check
  check (currency in ('MXN', 'COP', 'PEN', 'CLP'));

alter table public.budgets drop constraint if exists budgets_currency_check;
alter table public.budgets
  add constraint budgets_currency_check
  check (currency in ('MXN', 'COP', 'PEN', 'CLP'));

-- Transfers: same-currency only (no FX). Stamp currency from accounts.
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
  v_currency text;
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
  if v_from.currency <> v_to.currency then
    raise exception 'Las cuentas deben compartir la misma moneda (sin conversión FX)';
  end if;
  if v_from.currency not in ('MXN', 'COP', 'PEN', 'CLP') then
    raise exception 'Unsupported currency';
  end if;
  v_currency := v_from.currency;

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
    user_id, project_id, from_account_id, to_account_id, amount_cents, currency, occurred_on, note
  ) values (
    v_user_id, v_from.project_id, p_from_account_id, p_to_account_id, p_amount_cents, v_currency, p_occurred_on, p_note
  ) returning id into v_transfer_id;

  insert into public.transactions (
    user_id, project_id, account_id, type, amount_cents, currency, description, occurred_on, transfer_id
  ) values (
    v_user_id, v_from.project_id, p_from_account_id, 'transfer', p_amount_cents, v_currency,
    coalesce(p_note, 'Transferencia'), p_occurred_on, v_transfer_id
  );

  if v_to.type = 'credit_card' then
    select id into v_open_period_id
      from public.statement_periods
      where account_id = v_to.id and status = 'open'
      limit 1;
  end if;

  insert into public.transactions (
    user_id, project_id, account_id, type, amount_cents, currency, description, occurred_on,
    transfer_id, statement_period_id
  ) values (
    v_user_id, v_from.project_id, p_to_account_id, 'transfer', p_amount_cents, v_currency,
    coalesce(p_note, 'Transferencia'), p_occurred_on,
    v_transfer_id, v_open_period_id
  );

  return v_transfer_id;
end;
$$;

-- Import applies account currency (not hardcoded MXN)
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
      v_uid, v_batch.project_id, v_account.id, v_row.type, abs(v_row.amount_cents), v_account.currency,
      v_row.merchant, v_row.description, v_row.category, v_row.occurred_on, v_period_id,
      nullif(lower(regexp_replace(coalesce(v_row.merchant, ''), '[^a-z0-9]+', '', 'g')), '')
    ) returning id into v_tx_id;

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

-- BYOK AI credentials + in-app assistant conversations (personal finance, single-user)

create table public.user_ai_credentials (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  ciphertext text not null,
  last4 text not null,
  provider text not null default 'openai'
    check (provider in ('openai', 'nan', 'compatible')),
  base_url text not null,
  chat_model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_ai_credentials enable row level security;
revoke all on public.user_ai_credentials from public, anon, authenticated;

create or replace function public.save_own_ai_credential(
  p_provider text,
  p_base_url text,
  p_chat_model text,
  p_ciphertext text,
  p_last4 text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_provider is null or p_provider not in ('openai', 'nan', 'compatible') then
    raise exception 'Proveedor inválido';
  end if;
  if p_base_url is null or length(p_base_url) < 8 or length(p_base_url) > 200 then
    raise exception 'URL inválida';
  end if;
  if p_chat_model is null or length(p_chat_model) < 2 or length(p_chat_model) > 80 then
    raise exception 'Modelo de chat inválido';
  end if;

  if p_ciphertext is null then
    update public.user_ai_credentials
    set provider = p_provider,
        base_url = p_base_url,
        chat_model = p_chat_model,
        updated_at = now()
    where user_id = auth.uid();
    if not found then
      raise exception 'Añade una clave';
    end if;
    return;
  end if;

  if length(p_ciphertext) < 16 then
    raise exception 'Clave inválida';
  end if;
  if p_last4 is null or length(p_last4) < 2 or length(p_last4) > 8 then
    raise exception 'Metadato inválido';
  end if;

  insert into public.user_ai_credentials (
    user_id, ciphertext, last4, provider, base_url, chat_model
  )
  values (
    auth.uid(), p_ciphertext, p_last4, p_provider, p_base_url, p_chat_model
  )
  on conflict (user_id) do update
    set ciphertext = excluded.ciphertext,
        last4 = excluded.last4,
        provider = excluded.provider,
        base_url = excluded.base_url,
        chat_model = excluded.chat_model,
        updated_at = now();
end;
$$;

create or replace function public.own_ai_credential_meta()
returns table (
  last4 text,
  updated_at timestamptz,
  provider text,
  base_url text,
  chat_model text
)
language sql
stable
security definer
set search_path = public
as $$
  select k.last4, k.updated_at, k.provider, k.base_url, k.chat_model
  from public.user_ai_credentials k
  where k.user_id = auth.uid();
$$;

create or replace function public.own_ai_credential_cipher()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select k.ciphertext
  from public.user_ai_credentials k
  where k.user_id = auth.uid();
$$;

create or replace function public.delete_own_ai_credential()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  delete from public.user_ai_credentials where user_id = auth.uid();
end;
$$;

revoke all on function public.save_own_ai_credential(text, text, text, text, text) from public, anon;
revoke all on function public.own_ai_credential_meta() from public, anon;
revoke all on function public.own_ai_credential_cipher() from public, anon;
revoke all on function public.delete_own_ai_credential() from public, anon;

grant execute on function public.save_own_ai_credential(text, text, text, text, text) to authenticated;
grant execute on function public.own_ai_credential_meta() to authenticated;
grant execute on function public.own_ai_credential_cipher() to authenticated;
grant execute on function public.delete_own_ai_credential() to authenticated;

-- Conversations (personal assistant)
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  tool_calls jsonb,
  tool_call_id text,
  created_at timestamptz not null default now()
);

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'chat' check (kind in ('chat')),
  model text,
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  estimated_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index ai_conversations_user_idx
  on public.ai_conversations (user_id, updated_at desc);
create index ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at);
create index ai_usage_events_user_idx
  on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_events enable row level security;

create policy "ai_conversations_select_own" on public.ai_conversations
  for select using (auth.uid() = user_id);
create policy "ai_conversations_insert_own" on public.ai_conversations
  for insert with check (auth.uid() = user_id);
create policy "ai_conversations_update_own" on public.ai_conversations
  for update using (auth.uid() = user_id);
create policy "ai_conversations_delete_own" on public.ai_conversations
  for delete using (auth.uid() = user_id);

create policy "ai_messages_select_own" on public.ai_messages
  for select using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
create policy "ai_messages_insert_own" on public.ai_messages
  for insert with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "ai_usage_events_select_own" on public.ai_usage_events
  for select using (auth.uid() = user_id);
create policy "ai_usage_events_insert_own" on public.ai_usage_events
  for insert with check (auth.uid() = user_id);

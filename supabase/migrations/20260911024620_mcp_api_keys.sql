-- API keys for agent / MCP access (hashed at rest)

create table public.mcp_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index mcp_api_keys_user_id_idx on public.mcp_api_keys (user_id);
create index mcp_api_keys_hash_idx on public.mcp_api_keys (key_hash)
  where revoked_at is null;

alter table public.mcp_api_keys enable row level security;

create policy "mcp_keys_select_own" on public.mcp_api_keys
  for select using (auth.uid() = user_id);
create policy "mcp_keys_insert_own" on public.mcp_api_keys
  for insert with check (auth.uid() = user_id);
create policy "mcp_keys_update_own" on public.mcp_api_keys
  for update using (auth.uid() = user_id);

-- Resolve bearer key → user (service role / edge only; not granted to anon)
create or replace function public.mcp_resolve_api_key(p_key_hash text)
returns table (user_id uuid, key_id uuid)
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
      returning k.user_id, k.id
  )
  select u.user_id, u.id from updated u;
end;
$$;

revoke all on function public.mcp_resolve_api_key(text) from public;
grant execute on function public.mcp_resolve_api_key(text) to service_role;

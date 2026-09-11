-- Fix create-project: INSERT...RETURNING failed because projects SELECT RLS
-- required membership before the owner row existed.

drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member" on public.projects
  for select using (
    public.is_project_member(id)
    or created_by = auth.uid()
  );

create or replace function public.create_project(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_slug text;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_name is null or length(trim(p_name)) = 0 or length(trim(p_name)) > 80 then
    raise exception 'Invalid project name';
  end if;

  v_slug := nullif(trim(both '-' from lower(regexp_replace(
    regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  ))), '');
  if p_slug is not null and length(trim(p_slug)) > 0 then
    v_slug := left(trim(p_slug), 48);
  end if;
  if v_slug is null or v_slug = '' then
    v_slug := 'proyecto';
  end if;
  v_slug := left(v_slug, 48);

  loop
    begin
      insert into public.projects (name, slug, created_by)
      values (trim(p_name), v_slug, v_uid)
      returning id into v_id;

      insert into public.project_members (project_id, user_id, role)
      values (v_id, v_uid, 'owner');

      return v_id;
    exception
      when unique_violation then
        v_attempt := v_attempt + 1;
        if v_attempt >= 5 then
          raise;
        end if;
        v_slug := left(v_slug, 40) || '-' || substr(md5(random()::text), 1, 4);
    end;
  end loop;
end;
$$;

revoke all on function public.create_project(text, text) from public, anon;
grant execute on function public.create_project(text, text) to authenticated;

delete from public.projects p
where not exists (
  select 1 from public.project_members m where m.project_id = p.id
);

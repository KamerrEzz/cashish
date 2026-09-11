-- Add viewer role (separate txn so value is usable)
alter type public.project_member_role add value if not exists 'viewer';

alter table public.project_invites drop constraint if exists project_invites_role_check;
alter table public.project_invites
  add constraint project_invites_role_check
  check (role::text in ('member', 'viewer'));

-- GP Inventory tables on the shared test database.
-- Every object is prefixed with gp_ so it stays distinct from other projects.

create extension if not exists pgcrypto;

create table if not exists public.gp_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null check (role in ('admin', 'employee')),
  created_at timestamptz not null default now()
);

create table if not exists public.gp_employee_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  created_by uuid not null references public.gp_profiles (id) on delete cascade,
  consumed boolean not null default false,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create unique index if not exists gp_profiles_email_idx
  on public.gp_profiles (lower(email));

create index if not exists gp_profiles_role_idx
  on public.gp_profiles (role);

create index if not exists gp_employee_invites_open_email_idx
  on public.gp_employee_invites (lower(email))
  where consumed = false;

alter table public.gp_profiles enable row level security;
alter table public.gp_employee_invites enable row level security;

create or replace function public.gp_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gp_profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.gp_has_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gp_profiles
    where role = 'admin'
  );
$$;

create or replace function public.gp_workspace_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'people', (select count(*)::int from public.gp_profiles),
    'employees', (select count(*)::int from public.gp_profiles where role = 'employee')
  );
$$;

create or replace function public.gp_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  meta_name text;
  invite_row public.gp_employee_invites%rowtype;
begin
  meta_role := coalesce(new.raw_user_meta_data ->> 'role', '');
  meta_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  if meta_name is null then
    meta_name := split_part(coalesce(new.email, 'user'), '@', 1);
  end if;

  perform pg_advisory_xact_lock(814271);

  if meta_role = 'admin'
     and not exists (select 1 from public.gp_profiles where role = 'admin') then
    insert into public.gp_profiles (id, email, full_name, role)
    values (new.id, lower(coalesce(new.email, '')), meta_name, 'admin');
    return new;
  end if;

  select *
    into invite_row
  from public.gp_employee_invites
  where lower(email) = lower(coalesce(new.email, ''))
    and consumed = false
  order by created_at desc
  limit 1
  for update;

  if invite_row.id is null then
    raise exception 'Registration is closed';
  end if;

  insert into public.gp_profiles (id, email, full_name, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(nullif(btrim(invite_row.full_name), ''), meta_name),
    'employee'
  );

  update public.gp_employee_invites
  set consumed = true,
      consumed_at = now()
  where id = invite_row.id;

  return new;
end;
$$;

drop trigger if exists gp_on_auth_user_created on auth.users;

create trigger gp_on_auth_user_created
  after insert on auth.users
  for each row execute function public.gp_handle_new_user();

revoke all on function public.gp_handle_new_user() from public, anon, authenticated;
grant execute on function public.gp_handle_new_user() to supabase_auth_admin;

revoke all on function public.gp_is_admin() from public, anon;
grant execute on function public.gp_is_admin() to authenticated;

revoke all on function public.gp_has_admin() from public;
grant execute on function public.gp_has_admin() to anon, authenticated;

revoke all on function public.gp_workspace_stats() from public, anon;
grant execute on function public.gp_workspace_stats() to authenticated;

revoke all on table public.gp_profiles from anon, authenticated;
grant select on table public.gp_profiles to authenticated;

revoke all on table public.gp_employee_invites from anon, authenticated;
grant select, insert, update, delete on table public.gp_employee_invites to authenticated;

drop policy if exists gp_profiles_select on public.gp_profiles;
create policy gp_profiles_select
  on public.gp_profiles
  for select
  to authenticated
  using (id = auth.uid() or public.gp_is_admin());

drop policy if exists gp_invites_admin_select on public.gp_employee_invites;
create policy gp_invites_admin_select
  on public.gp_employee_invites
  for select
  to authenticated
  using (public.gp_is_admin());

drop policy if exists gp_invites_admin_insert on public.gp_employee_invites;
create policy gp_invites_admin_insert
  on public.gp_employee_invites
  for insert
  to authenticated
  with check (public.gp_is_admin() and created_by = auth.uid());

drop policy if exists gp_invites_admin_update on public.gp_employee_invites;
create policy gp_invites_admin_update
  on public.gp_employee_invites
  for update
  to authenticated
  using (public.gp_is_admin())
  with check (public.gp_is_admin());

drop policy if exists gp_invites_admin_delete on public.gp_employee_invites;
create policy gp_invites_admin_delete
  on public.gp_employee_invites
  for delete
  to authenticated
  using (public.gp_is_admin());

comment on table public.gp_profiles is 'GP Inventory accounts. Role lives here, not in auth metadata.';
comment on table public.gp_employee_invites is 'One-time hire records. Signup succeeds only when a matching open invite exists.';

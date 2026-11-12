-- =============================================================================
-- Planora · Sprint 1 · Database foundation
-- profiles, workspaces, workspace_members + automatic private workspace + RLS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 120),
  avatar_url  text check (avatar_url is null or char_length(avatar_url) <= 2048),
  timezone    text not null default 'Africa/Johannesburg'
              check (char_length(timezone) between 1 and 64),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth user. Created by the handle_new_user trigger.';

create table public.workspaces (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  is_personal  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.workspaces is 'Container that owns all user data. Every user gets one personal workspace.';

-- A user has exactly one personal workspace.
create unique index workspaces_one_personal_per_owner
  on public.workspaces (owner_id) where is_personal;
create index workspaces_owner_id_idx on public.workspaces (owner_id);

create table public.workspace_members (
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          public.workspace_role not null default 'member',
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
comment on table public.workspace_members is 'Who can access a workspace, and with which role.';

create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers
-- SECURITY DEFINER so policies can consult workspace_members without
-- recursively triggering workspace_members' own RLS policies.
-- Every future user-owned table (tasks, projects, documents, ...) should
-- carry a workspace_id and use these helpers in its policies.
-- ---------------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(ws uuid, roles public.workspace_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws
      and wm.user_id = (select auth.uid())
      and wm.role = any (roles)
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

-- ---------------------------------------------------------------------------
-- New user onboarding: profile + private workspace + owner membership.
-- Runs in the same transaction as the auth.users insert, so a user can never
-- exist without a workspace.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
  first_name   text;
  new_ws_id    uuid;
begin
  display_name := left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 120);
  first_name   := left(split_part(display_name, ' ', 1), 100);

  insert into public.profiles (id, full_name)
  values (new.id, display_name);

  insert into public.workspaces (name, owner_id, is_personal)
  values (
    coalesce(nullif(first_name, '') || '''s workspace', 'My workspace'),
    new.id,
    true
  )
  returning id into new_ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_ws_id, new.id, 'owner');

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: users who signed up before this migration ran get the same
-- profile, personal workspace and owner membership the trigger would create.
do $$
declare
  u          record;
  first_name text;
  new_ws_id  uuid;
begin
  for u in
    select au.id, left(nullif(btrim(au.raw_user_meta_data ->> 'full_name'), ''), 120) as display_name
    from auth.users au
    where not exists (select 1 from public.profiles p where p.id = au.id)
  loop
    first_name := left(split_part(u.display_name, ' ', 1), 100);

    insert into public.profiles (id, full_name) values (u.id, u.display_name);

    insert into public.workspaces (name, owner_id, is_personal)
    values (coalesce(nullif(first_name, '') || '''s workspace', 'My workspace'), u.id, true)
    returning id into new_ws_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (new_ws_id, u.id, 'owner');
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- Anonymous visitors get nothing. Signed-in users get only the columns they
-- may legitimately change; ownership/personal flags are never client-writable.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.workspaces, public.workspace_members from anon;
revoke all on public.profiles, public.workspaces, public.workspace_members from authenticated;

grant select on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
grant update (full_name, avatar_url, timezone) on public.profiles to authenticated;

grant select, delete on public.workspaces to authenticated;
grant insert on public.workspaces to authenticated;
grant update (name) on public.workspaces to authenticated;

grant select on public.workspace_members to authenticated;
grant insert on public.workspace_members to authenticated;
-- Membership changes (invitations, role changes) arrive with collaboration in a
-- later release; until then memberships are only created by handle_new_user.

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "Users can create their own personal workspace"
  on public.workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()) and is_personal = true);

create policy "Users can create their own personal membership"
  on public.workspace_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_id
        and w.owner_id = (select auth.uid())
        and w.is_personal = true
    )
  );

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- profiles: a user sees and edits only their own profile.
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- workspaces: visible to members; renamed by owners/admins;
-- deleted only by the owner, and never the personal workspace.
create policy "Members can view their workspaces"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));

create policy "Owners and admins can update workspaces"
  on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));

create policy "Owners can delete non-personal workspaces"
  on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()) and not is_personal);

-- workspace_members: members can see who else belongs to their workspaces.
create policy "Members can view workspace memberships"
  on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

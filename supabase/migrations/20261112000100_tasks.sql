-- =============================================================================
-- Planora · Sprint 2 · Core task management
-- task_categories, tasks, subtasks
-- =============================================================================

create type public.task_status as enum ('todo', 'in_progress', 'completed');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

-- ---------------------------------------------------------------------------
-- Reusable helper: apply the standard "workspace members only" RLS policies.
-- Used by every user-owned table from here on.
-- ---------------------------------------------------------------------------
create or replace function public.apply_workspace_rls(tbl text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('alter table public.%I enable row level security', tbl);
  execute format('revoke all on public.%I from anon', tbl);
  execute format(
    'create policy "Members can view %1$s" on public.%1$I for select to authenticated
       using (public.is_workspace_member(workspace_id))', tbl);
  execute format(
    'create policy "Members can create %1$s" on public.%1$I for insert to authenticated
       with check (public.is_workspace_member(workspace_id))', tbl);
  execute format(
    'create policy "Members can update %1$s" on public.%1$I for update to authenticated
       using (public.is_workspace_member(workspace_id))
       with check (public.is_workspace_member(workspace_id))', tbl);
  execute format(
    'create policy "Members can delete %1$s" on public.%1$I for delete to authenticated
       using (public.is_workspace_member(workspace_id))', tbl);
end;
$$;
revoke all on function public.apply_workspace_rls(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.task_categories (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 50),
  color         text not null default 'navy'
                check (color in ('navy', 'sage', 'amber', 'red', 'blue', 'purple', 'slate')),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (workspace_id, name),
  unique (id, workspace_id)
);

create or replace function public.seed_default_categories(ws uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.task_categories (workspace_id, name, color, is_default)
  values
    (ws, 'Personal', 'sage', true),
    (ws, 'Academic', 'blue', true),
    (ws, 'Professional', 'navy', true),
    (ws, 'Projects', 'purple', true),
    (ws, 'Administration', 'amber', true),
    (ws, 'Other', 'slate', true)
  on conflict (workspace_id, name) do nothing;
$$;
revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;
revoke all on function public.handle_new_workspace() from public, anon, authenticated;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- Backfill workspaces created before this migration.
select public.seed_default_categories(id) from public.workspaces;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  category_id   uuid,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  description   text check (description is null or char_length(description) <= 5000),
  status        public.task_status not null default 'todo',
  priority      public.task_priority not null default 'medium',
  start_date    date,
  due_date      date,
  completed_at  timestamptz,
  assigned_to   uuid references public.profiles (id) on delete set null,
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, workspace_id),
  check (start_date is null or due_date is null or start_date <= due_date),
  -- A category must belong to the same workspace as the task.
  foreign key (category_id, workspace_id)
    references public.task_categories (id, workspace_id) on delete set null (category_id)
);

create index tasks_workspace_due_idx on public.tasks (workspace_id, due_date);
create index tasks_workspace_status_idx on public.tasks (workspace_id, status);
create index tasks_category_idx on public.tasks (category_id);

-- Keep completed_at consistent with status.
create or replace function public.sync_task_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_completion
  before insert or update of status on public.tasks
  for each row execute function public.sync_task_completion();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Subtasks
-- ---------------------------------------------------------------------------
create table public.subtasks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  task_id       uuid not null,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (task_id, workspace_id)
    references public.tasks (id, workspace_id) on delete cascade
);

create index subtasks_task_idx on public.subtasks (task_id, position);

create or replace function public.sync_subtask_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_completed then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger subtasks_sync_completion
  before insert or update of is_completed on public.subtasks
  for each row execute function public.sync_subtask_completion();

create trigger subtasks_set_updated_at
  before update on public.subtasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
select public.apply_workspace_rls('task_categories');
select public.apply_workspace_rls('tasks');
select public.apply_workspace_rls('subtasks');

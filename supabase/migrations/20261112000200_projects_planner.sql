-- =============================================================================
-- Planora · Sprint 3 · Projects, milestones, monthly planner, daily checklist
-- =============================================================================

create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed');

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 120),
  description   text check (description is null or char_length(description) <= 5000),
  status        public.project_status not null default 'planning',
  priority      public.task_priority not null default 'medium',
  start_date    date,
  end_date      date,
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, workspace_id),
  check (start_date is null or end_date is null or start_date <= end_date)
);

create index projects_workspace_idx on public.projects (workspace_id, status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Tasks can belong to a project in the same workspace.
alter table public.tasks
  add column project_id uuid,
  add foreign key (project_id, workspace_id)
    references public.projects (id, workspace_id) on delete set null (project_id);

create index tasks_project_idx on public.tasks (project_id);

-- ---------------------------------------------------------------------------
-- Milestones
-- ---------------------------------------------------------------------------
create table public.milestones (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  project_id    uuid not null,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  description   text check (description is null or char_length(description) <= 2000),
  due_date      date,
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (project_id, workspace_id)
    references public.projects (id, workspace_id) on delete cascade
);

create index milestones_project_idx on public.milestones (project_id, due_date);
create index milestones_workspace_due_idx on public.milestones (workspace_id, due_date);

create trigger milestones_sync_completion
  before insert or update of is_completed on public.milestones
  for each row execute function public.sync_subtask_completion();

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Planner events (monthly planner)
-- ---------------------------------------------------------------------------
create table public.planner_events (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  description   text check (description is null or char_length(description) <= 2000),
  event_date    date not null,
  start_time    time,
  end_time      time,
  category      text not null default 'personal'
                check (category in ('personal', 'academic', 'work', 'meeting', 'deadline', 'other')),
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, workspace_id),
  check (start_time is null or end_time is null or start_time <= end_time)
);

create index planner_events_workspace_date_idx on public.planner_events (workspace_id, event_date);

create trigger planner_events_set_updated_at
  before update on public.planner_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Daily checklist items
-- ---------------------------------------------------------------------------
create table public.daily_checklists (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_date     date not null,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index daily_checklists_workspace_date_idx
  on public.daily_checklists (workspace_id, item_date, position);

create trigger daily_checklists_sync_completion
  before insert or update of is_completed on public.daily_checklists
  for each row execute function public.sync_subtask_completion();

create trigger daily_checklists_set_updated_at
  before update on public.daily_checklists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
select public.apply_workspace_rls('projects');
select public.apply_workspace_rls('milestones');
select public.apply_workspace_rls('planner_events');
select public.apply_workspace_rls('daily_checklists');

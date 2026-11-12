-- =============================================================================
-- Planora · Sprint 5 · AI-powered project planning
-- ai_jobs, generated_plans, task_dependencies, approve/reject functions
-- =============================================================================

create type public.ai_job_status as enum ('queued', 'extracting', 'analysing', 'completed', 'failed');
create type public.plan_status as enum ('pending_review', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Task dependencies (used by AI plans, available to all tasks)
-- ---------------------------------------------------------------------------
create table public.task_dependencies (
  workspace_id        uuid not null references public.workspaces (id) on delete cascade,
  task_id             uuid not null,
  depends_on_task_id  uuid not null,
  created_at          timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id),
  foreign key (task_id, workspace_id) references public.tasks (id, workspace_id) on delete cascade,
  foreign key (depends_on_task_id, workspace_id) references public.tasks (id, workspace_id) on delete cascade
);
create index task_dependencies_depends_on_idx on public.task_dependencies (depends_on_task_id);
select public.apply_workspace_rls('task_dependencies');

-- ---------------------------------------------------------------------------
-- AI processing jobs (written only by the generate-plan Edge Function)
-- ---------------------------------------------------------------------------
create table public.ai_jobs (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id) on delete cascade,
  document_id    uuid not null,
  requested_by   uuid references public.profiles (id) on delete set null,
  status         public.ai_job_status not null default 'queued',
  error_message  text check (error_message is null or char_length(error_message) <= 2000),
  model          text,
  input_chars    integer,
  truncated      boolean not null default false,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (document_id, workspace_id) references public.documents (id, workspace_id) on delete cascade
);
create index ai_jobs_document_idx on public.ai_jobs (document_id, created_at desc);
create index ai_jobs_requested_by_idx on public.ai_jobs (requested_by, created_at desc);

create trigger ai_jobs_set_updated_at
  before update on public.ai_jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Generated plans awaiting human review
-- ---------------------------------------------------------------------------
create table public.generated_plans (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id) on delete cascade,
  ai_job_id      uuid not null unique references public.ai_jobs (id) on delete cascade,
  document_id    uuid not null,
  plan           jsonb not null,
  approved_plan  jsonb,
  status         public.plan_status not null default 'pending_review',
  project_id     uuid references public.projects (id) on delete set null,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (document_id, workspace_id) references public.documents (id, workspace_id) on delete cascade
);
create index generated_plans_workspace_idx on public.generated_plans (workspace_id, created_at desc);

create trigger generated_plans_set_updated_at
  before update on public.generated_plans
  for each row execute function public.set_updated_at();

-- Members can read jobs and plans; all writes go through the Edge Function
-- (service role) or the security-definer functions below.
select public.apply_workspace_rls('ai_jobs');
select public.apply_workspace_rls('generated_plans');
revoke insert, update, delete on public.ai_jobs from authenticated;
revoke insert, update, delete on public.generated_plans from authenticated;

-- ---------------------------------------------------------------------------
-- Approve: create project, milestones, tasks and dependencies atomically.
-- A plan can be approved once; a failure anywhere rolls everything back,
-- so AI errors never leave partial or duplicate records.
--
-- p_plan shape (the user's reviewed version):
-- {
--   "project":    { "name", "description", "start_date", "end_date" },
--   "milestones": [ { "title", "description", "due_date" } ],
--   "tasks":      [ { "key", "title", "description", "priority",
--                     "start_date", "due_date", "depends_on": ["key", ...] } ]
-- }
-- ---------------------------------------------------------------------------
create or replace function public.approve_generated_plan(
  p_plan_id uuid,
  p_plan jsonb,
  p_project_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan        public.generated_plans%rowtype;
  v_project_id  uuid;
  v_category_id uuid;
  v_item        jsonb;
  v_dep         text;
  v_key         text;
  v_task_ids    jsonb := '{}'::jsonb;
  v_new_id      uuid;
  v_position    integer := 0;
begin
  select * into v_plan from public.generated_plans where id = p_plan_id for update;
  if not found or not public.is_workspace_member(v_plan.workspace_id) then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;
  if v_plan.status <> 'pending_review' then
    raise exception 'This plan has already been %', v_plan.status using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_plan -> 'tasks') is distinct from 'array'
     or jsonb_array_length(p_plan -> 'tasks') = 0 then
    raise exception 'The plan must contain at least one task' using errcode = '22023';
  end if;
  if jsonb_array_length(p_plan -> 'tasks') > 200 then
    raise exception 'A plan can contain at most 200 tasks' using errcode = '22023';
  end if;

  -- Project: attach to an existing one, or create a new one.
  if p_project_id is not null then
    select id into v_project_id
      from public.projects
     where id = p_project_id and workspace_id = v_plan.workspace_id;
    if not found then
      raise exception 'Project not found' using errcode = 'P0002';
    end if;
  else
    insert into public.projects (workspace_id, name, description, start_date, end_date, status)
    values (
      v_plan.workspace_id,
      left(btrim(coalesce(p_plan -> 'project' ->> 'name', '')), 120),
      left(nullif(btrim(p_plan -> 'project' ->> 'description'), ''), 5000),
      nullif(p_plan -> 'project' ->> 'start_date', '')::date,
      nullif(p_plan -> 'project' ->> 'end_date', '')::date,
      'active'
    )
    returning id into v_project_id;
  end if;

  -- Milestones
  if jsonb_typeof(p_plan -> 'milestones') = 'array' then
    for v_item in select value from jsonb_array_elements(p_plan -> 'milestones') loop
      v_position := v_position + 1;
      insert into public.milestones (workspace_id, project_id, title, description, due_date, position)
      values (
        v_plan.workspace_id,
        v_project_id,
        left(btrim(coalesce(v_item ->> 'title', '')), 200),
        left(nullif(btrim(v_item ->> 'description'), ''), 2000),
        nullif(v_item ->> 'due_date', '')::date,
        v_position
      );
    end loop;
  end if;

  -- Tasks
  select id into v_category_id
    from public.task_categories
   where workspace_id = v_plan.workspace_id and name = 'Projects';

  for v_item in select value from jsonb_array_elements(p_plan -> 'tasks') loop
    insert into public.tasks (
      workspace_id, project_id, category_id, title, description, priority, start_date, due_date
    )
    values (
      v_plan.workspace_id,
      v_project_id,
      v_category_id,
      left(btrim(coalesce(v_item ->> 'title', '')), 200),
      left(nullif(btrim(v_item ->> 'description'), ''), 5000),
      coalesce(nullif(v_item ->> 'priority', '')::public.task_priority, 'medium'),
      nullif(v_item ->> 'start_date', '')::date,
      nullif(v_item ->> 'due_date', '')::date
    )
    returning id into v_new_id;

    v_key := nullif(v_item ->> 'key', '');
    if v_key is not null then
      v_task_ids := v_task_ids || jsonb_build_object(v_key, v_new_id);
    end if;
  end loop;

  -- Dependencies between the newly created tasks
  for v_item in select value from jsonb_array_elements(p_plan -> 'tasks') loop
    v_key := nullif(v_item ->> 'key', '');
    if v_key is not null and jsonb_typeof(v_item -> 'depends_on') = 'array' then
      for v_dep in select jsonb_array_elements_text(v_item -> 'depends_on') loop
        if v_task_ids ? v_dep and v_dep <> v_key then
          insert into public.task_dependencies (workspace_id, task_id, depends_on_task_id)
          values (
            v_plan.workspace_id,
            (v_task_ids ->> v_key)::uuid,
            (v_task_ids ->> v_dep)::uuid
          )
          on conflict do nothing;
        end if;
      end loop;
    end if;
  end loop;

  update public.documents
     set project_id = coalesce(project_id, v_project_id)
   where id = v_plan.document_id;

  update public.generated_plans
     set status = 'approved',
         approved_plan = p_plan,
         project_id = v_project_id,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_plan_id;

  return v_project_id;
end;
$$;

create or replace function public.reject_generated_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.generated_plans%rowtype;
begin
  select * into v_plan from public.generated_plans where id = p_plan_id for update;
  if not found or not public.is_workspace_member(v_plan.workspace_id) then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;
  if v_plan.status <> 'pending_review' then
    raise exception 'This plan has already been %', v_plan.status using errcode = 'P0001';
  end if;
  update public.generated_plans
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_plan_id;
end;
$$;

revoke all on function public.approve_generated_plan(uuid, jsonb, uuid) from public, anon;
revoke all on function public.reject_generated_plan(uuid) from public, anon;
grant execute on function public.approve_generated_plan(uuid, jsonb, uuid) to authenticated;
grant execute on function public.reject_generated_plan(uuid) to authenticated;

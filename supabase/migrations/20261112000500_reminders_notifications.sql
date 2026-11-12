-- =============================================================================
-- Planora · Sprint 6 · Reminders, notifications, user preferences
-- =============================================================================

create type public.reminder_status as enum ('scheduled', 'sent', 'dismissed');
create type public.notification_type as enum
  ('reminder', 'task_overdue', 'task_due_soon', 'plan_ready', 'plan_failed', 'system');
create type public.email_delivery_status as enum ('not_required', 'pending', 'sent', 'failed');

-- ---------------------------------------------------------------------------
-- Timezone validation for profiles (used by scheduled processing)
-- ---------------------------------------------------------------------------
create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();

-- ---------------------------------------------------------------------------
-- User preferences (one row per user)
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id                   uuid primary key references public.profiles (id) on delete cascade,
  in_app_enabled            boolean not null default true,
  email_enabled             boolean not null default false,
  browser_enabled           boolean not null default false,
  overdue_alerts            boolean not null default true,
  due_soon_alerts           boolean not null default true,
  default_reminder_minutes  integer not null default 60
                            check (default_reminder_minutes between 0 and 10080),
  week_starts_on            smallint not null default 1 check (week_starts_on in (0, 1)),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_profile() from public, anon, authenticated;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

insert into public.user_preferences (user_id)
select id from public.profiles
on conflict do nothing;

alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from anon;
revoke insert, delete on public.user_preferences from authenticated;

create policy "Users can view their preferences"
  on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can update their preferences"
  on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Reminders (personal: visible only to the user who set them)
-- ---------------------------------------------------------------------------
create table public.reminders (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  task_id       uuid,
  event_id      uuid,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  note          text check (note is null or char_length(note) <= 1000),
  remind_at     timestamptz not null,
  status        public.reminder_status not null default 'scheduled',
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (task_id is null or event_id is null),
  foreign key (task_id, workspace_id)
    references public.tasks (id, workspace_id) on delete cascade,
  foreign key (event_id, workspace_id)
    references public.planner_events (id, workspace_id) on delete cascade
);

create index reminders_due_idx on public.reminders (remind_at) where status = 'scheduled';
create index reminders_user_idx on public.reminders (user_id, remind_at);

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- Editing a reminder's time re-schedules it.
create or replace function public.reschedule_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.remind_at is distinct from old.remind_at and new.remind_at > now() then
    new.status := 'scheduled';
    new.sent_at := null;
  end if;
  return new;
end;
$$;

create trigger reminders_reschedule
  before update of remind_at on public.reminders
  for each row execute function public.reschedule_reminder();

alter table public.reminders enable row level security;
revoke all on public.reminders from anon;

create policy "Users can view their reminders"
  on public.reminders for select to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

create policy "Users can create their reminders"
  on public.reminders for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

create policy "Users can update their reminders"
  on public.reminders for update to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

create policy "Users can delete their reminders"
  on public.reminders for delete to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Notifications (created by the backend; users can read, mark read, delete)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          public.notification_type not null,
  title         text not null check (char_length(title) between 1 and 200),
  body          text check (body is null or char_length(body) <= 1000),
  link          text check (link is null or (link like '/%' and char_length(link) <= 500)),
  reminder_id   uuid references public.reminders (id) on delete set null,
  task_id       uuid references public.tasks (id) on delete set null,
  event_id      uuid references public.planner_events (id) on delete set null,
  dedupe_key    text not null,
  read_at       timestamptz,
  email_status  public.email_delivery_status not null default 'not_required',
  created_at    timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_email_pending_idx on public.notifications (created_at)
  where email_status = 'pending';

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
revoke insert, update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users can view their notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can mark their notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their notifications"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Scheduled processing: reminders, overdue tasks, tasks due soon.
-- Idempotent: dedupe keys guarantee each event notifies a user once.
-- ---------------------------------------------------------------------------
create or replace function public.process_due_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  v_rows  integer;
begin
  -- 1. Reminders whose time has come.
  with due as (
    select r.id
      from public.reminders r
     where r.status = 'scheduled' and r.remind_at <= now()
     for update skip locked
  ),
  inserted as (
    insert into public.notifications
      (workspace_id, user_id, type, title, body, link, reminder_id, task_id, event_id, dedupe_key, email_status)
    select
      r.workspace_id,
      r.user_id,
      'reminder',
      left(r.title, 200),
      left(coalesce(r.note,
        case
          when t.id is not null then 'Task: ' || t.title ||
            coalesce(' (due ' || to_char(t.due_date, 'DD Mon YYYY') || ')', '')
          when e.id is not null then 'Event on ' || to_char(e.event_date, 'DD Mon YYYY') ||
            coalesce(' at ' || to_char(e.start_time, 'HH24:MI'), '')
        end), 1000),
      case
        when t.id is not null then '/tasks/' || t.id
        when e.id is not null then '/planner?date=' || e.event_date
        else '/notifications'
      end,
      r.id,
      r.task_id,
      r.event_id,
      'reminder:' || r.id || ':' || extract(epoch from r.remind_at)::bigint,
      case when coalesce(p.email_enabled, false) then 'pending' else 'not_required' end::public.email_delivery_status
    from public.reminders r
    join due on due.id = r.id
    left join public.tasks t on t.id = r.task_id
    left join public.planner_events e on e.id = r.event_id
    left join public.user_preferences p on p.user_id = r.user_id
    on conflict (user_id, dedupe_key) do nothing
    returning 1
  )
  update public.reminders
     set status = 'sent', sent_at = now()
   where id in (select id from due);
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  -- 2. Overdue tasks (due in the last 30 days, judged in each user's timezone).
  insert into public.notifications
    (workspace_id, user_id, type, title, body, link, task_id, dedupe_key, email_status)
  select
    t.workspace_id,
    wm.user_id,
    'task_overdue',
    left('Overdue: ' || t.title, 200),
    'This task was due on ' || to_char(t.due_date, 'DD Mon YYYY') || '.',
    '/tasks/' || t.id,
    t.id,
    'overdue:' || t.id || ':' || t.due_date,
    case when coalesce(p.email_enabled, false) then 'pending' else 'not_required' end::public.email_delivery_status
  from public.tasks t
  join public.workspace_members wm on wm.workspace_id = t.workspace_id
  join public.profiles pr on pr.id = wm.user_id
  left join public.user_preferences p on p.user_id = wm.user_id
  where t.status <> 'completed'
    and t.due_date is not null
    and t.due_date < (now() at time zone pr.timezone)::date
    and t.due_date >= (now() at time zone pr.timezone)::date - 30
    and coalesce(p.overdue_alerts, true)
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  -- 3. Tasks due today or tomorrow.
  insert into public.notifications
    (workspace_id, user_id, type, title, body, link, task_id, dedupe_key, email_status)
  select
    t.workspace_id,
    wm.user_id,
    'task_due_soon',
    left(case when t.due_date = (now() at time zone pr.timezone)::date
              then 'Due today: ' else 'Due tomorrow: ' end || t.title, 200),
    'Due on ' || to_char(t.due_date, 'DD Mon YYYY') || '.',
    '/tasks/' || t.id,
    t.id,
    'due_soon:' || t.id || ':' || t.due_date,
    'not_required'
  from public.tasks t
  join public.workspace_members wm on wm.workspace_id = t.workspace_id
  join public.profiles pr on pr.id = wm.user_id
  left join public.user_preferences p on p.user_id = wm.user_id
  where t.status <> 'completed'
    and t.due_date between (now() at time zone pr.timezone)::date
                       and (now() at time zone pr.timezone)::date + 1
    and coalesce(p.due_soon_alerts, true)
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  return v_total;
end;
$$;
revoke all on function public.process_due_reminders() from public, anon, authenticated;

-- Run every minute with pg_cron where available (Supabase hosted and local).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'planora-process-reminders',
    '* * * * *',
    'select public.process_due_reminders()'
  );
exception when others then
  raise notice 'pg_cron not available (%); schedule public.process_due_reminders() manually.', sqlerrm;
end;
$$;

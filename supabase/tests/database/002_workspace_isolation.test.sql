-- Planora · Sprint 7 · Cross-user security tests for every user-owned table (pgTAP)
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser). Alice = A, Bob = B, each with a fixed workspace.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@example.test', '{"full_name":"Alice"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bob@example.test',   '{"full_name":"Bob"}',   'authenticated', 'authenticated');

insert into public.workspaces (id, name, owner_id) values
  ('aaaaaaaa-0000-0000-0000-0000000000a0', 'Alice team', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'Bob team',   'bbbbbbbb-0000-0000-0000-000000000001');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000a0', 'aaaaaaaa-0000-0000-0000-000000000001', 'owner'),
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000001', 'owner');

-- Bob's data
insert into public.projects (id, workspace_id, name) values
  ('bbbbbbbb-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000b0', 'Bob project');
insert into public.tasks (id, workspace_id, title, project_id) values
  ('bbbbbbbb-0000-0000-0000-0000000000c2', 'bbbbbbbb-0000-0000-0000-0000000000b0', 'Bob task', 'bbbbbbbb-0000-0000-0000-0000000000c1'),
  ('bbbbbbbb-0000-0000-0000-0000000000c3', 'bbbbbbbb-0000-0000-0000-0000000000b0', 'Bob task 2', null);
insert into public.subtasks (workspace_id, task_id, title) values
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-0000000000c2', 'Bob subtask');
insert into public.task_dependencies (workspace_id, task_id, depends_on_task_id) values
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-0000000000c3', 'bbbbbbbb-0000-0000-0000-0000000000c2');
insert into public.milestones (workspace_id, project_id, title) values
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-0000000000c1', 'Bob milestone');
insert into public.planner_events (id, workspace_id, title, event_date) values
  ('bbbbbbbb-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-0000000000b0', 'Bob event', current_date);
insert into public.daily_checklists (workspace_id, user_id, item_date, title) values
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000001', current_date, 'Bob item');
insert into public.documents (id, workspace_id, file_name, file_type, mime_type, file_size, storage_path) values
  ('bbbbbbbb-0000-0000-0000-0000000000d1', 'bbbbbbbb-0000-0000-0000-0000000000b0', 'bob.pdf', 'pdf', 'application/pdf', 100,
   'bbbbbbbb-0000-0000-0000-0000000000b0/bob.pdf');
insert into public.ai_jobs (id, workspace_id, document_id, requested_by, status) values
  ('bbbbbbbb-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-0000000000d1',
   'bbbbbbbb-0000-0000-0000-000000000001', 'completed');
insert into public.generated_plans (id, workspace_id, ai_job_id, document_id, plan) values
  ('bbbbbbbb-0000-0000-0000-0000000000f2', 'bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-0000000000f1',
   'bbbbbbbb-0000-0000-0000-0000000000d1', '{}');
insert into public.reminders (workspace_id, user_id, title, remind_at) values
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000001', 'Bob reminder', now() + interval '1 day');
insert into public.notifications (workspace_id, user_id, type, title, dedupe_key) values
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000001', 'system', 'Bob note', 'test:bob');
insert into storage.objects (bucket_id, name, owner) values
  ('documents', 'bbbbbbbb-0000-0000-0000-0000000000b0/bob.pdf', 'bbbbbbbb-0000-0000-0000-000000000001');

-- Alice's AI plan (for approval tests)
insert into public.documents (id, workspace_id, file_name, file_type, mime_type, file_size, storage_path) values
  ('aaaaaaaa-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-0000000000a0', 'brief.pdf', 'pdf', 'application/pdf', 100,
   'aaaaaaaa-0000-0000-0000-0000000000a0/brief.pdf');
insert into public.ai_jobs (id, workspace_id, document_id, requested_by, status) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000a0', 'aaaaaaaa-0000-0000-0000-0000000000d1',
   'aaaaaaaa-0000-0000-0000-000000000001', 'completed');
insert into public.generated_plans (id, workspace_id, ai_job_id, document_id, plan) values
  ('aaaaaaaa-0000-0000-0000-0000000000f2', 'aaaaaaaa-0000-0000-0000-0000000000a0', 'aaaaaaaa-0000-0000-0000-0000000000f1',
   'aaaaaaaa-0000-0000-0000-0000000000d1', '{}');

-- Seeding and onboarding
select is(
  (select count(*)::int from public.task_categories where workspace_id = 'aaaaaaaa-0000-0000-0000-0000000000a0'),
  6, 'New workspaces receive the six default task categories');
select is(
  (select count(*)::int from public.user_preferences where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1, 'New users receive default notification preferences');

-- Every user-owned table has RLS enabled
select is(
  (select array_agg(c.relname::text order by c.relname) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'Row Level Security is enabled on every table in the public schema');

-- ---------------------------------------------------------------------------
-- Act as Alice
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Reads: nothing of Bob's is visible
select is_empty($$ select 1 from public.tasks             where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'tasks: cannot read another workspace');
select is_empty($$ select 1 from public.subtasks          where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'subtasks: cannot read another workspace');
select is_empty($$ select 1 from public.task_categories   where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'task_categories: cannot read another workspace');
select is_empty($$ select 1 from public.task_dependencies where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'task_dependencies: cannot read another workspace');
select is_empty($$ select 1 from public.projects          where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'projects: cannot read another workspace');
select is_empty($$ select 1 from public.milestones        where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'milestones: cannot read another workspace');
select is_empty($$ select 1 from public.planner_events    where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'planner_events: cannot read another workspace');
select is_empty($$ select 1 from public.daily_checklists  where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'daily_checklists: cannot read another workspace');
select is_empty($$ select 1 from public.documents         where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'documents: cannot read another workspace');
select is_empty($$ select 1 from public.ai_jobs           where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'ai_jobs: cannot read another workspace');
select is_empty($$ select 1 from public.generated_plans   where workspace_id = 'bbbbbbbb-0000-0000-0000-0000000000b0' $$, 'generated_plans: cannot read another workspace');
select is_empty($$ select 1 from public.reminders         where user_id = 'bbbbbbbb-0000-0000-0000-000000000001' $$, 'reminders: cannot read another user');
select is_empty($$ select 1 from public.notifications     where user_id = 'bbbbbbbb-0000-0000-0000-000000000001' $$, 'notifications: cannot read another user');
select is_empty($$ select 1 from public.user_preferences  where user_id = 'bbbbbbbb-0000-0000-0000-000000000001' $$, 'user_preferences: cannot read another user');
select is_empty($$ select 1 from storage.objects where name like 'bbbbbbbb-0000-0000-0000-0000000000b0/%' $$, 'storage: cannot list another workspace''s files');

-- Writes into Bob's workspace are rejected
select throws_ok(
  $$ insert into public.tasks (workspace_id, title) values ('bbbbbbbb-0000-0000-0000-0000000000b0', 'Injected') $$,
  '42501', null, 'tasks: cannot insert into another workspace');
select throws_ok(
  $$ insert into public.projects (workspace_id, name) values ('bbbbbbbb-0000-0000-0000-0000000000b0', 'Injected') $$,
  '42501', null, 'projects: cannot insert into another workspace');
select throws_ok(
  $$ insert into public.documents (workspace_id, file_name, file_type, mime_type, file_size, storage_path)
     values ('bbbbbbbb-0000-0000-0000-0000000000b0', 'x.pdf', 'pdf', 'application/pdf', 1, 'bbbbbbbb-0000-0000-0000-0000000000b0/x.pdf') $$,
  '42501', null, 'documents: cannot insert into another workspace');
select throws_ok(
  $$ insert into public.reminders (workspace_id, user_id, title, remind_at)
     values ('aaaaaaaa-0000-0000-0000-0000000000a0', 'bbbbbbbb-0000-0000-0000-000000000001', 'For Bob', now()) $$,
  '42501', null, 'reminders: cannot create reminders for another user');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('documents', 'bbbbbbbb-0000-0000-0000-0000000000b0/evil.pdf') $$,
  '42501', null, 'storage: cannot upload into another workspace''s folder');

select is_empty($$ update public.tasks set title = 'hacked' where id = 'bbbbbbbb-0000-0000-0000-0000000000c2' returning 1 $$,
  'tasks: cannot update another workspace''s task');
select is_empty($$ delete from public.tasks where id = 'bbbbbbbb-0000-0000-0000-0000000000c2' returning 1 $$,
  'tasks: cannot delete another workspace''s task');
select is_empty($$ delete from public.planner_events where id = 'bbbbbbbb-0000-0000-0000-0000000000e1' returning 1 $$,
  'planner_events: cannot delete another workspace''s event');

-- Cross-workspace links are impossible even with a valid workspace of your own
select throws_ok(
  $$ insert into public.subtasks (workspace_id, task_id, title)
     values ('aaaaaaaa-0000-0000-0000-0000000000a0', 'bbbbbbbb-0000-0000-0000-0000000000c2', 'Sneaky') $$,
  '23503', null, 'subtasks: cannot attach to a task in another workspace');
select throws_ok(
  $$ insert into public.tasks (workspace_id, title, project_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000a0', 'Sneaky', 'bbbbbbbb-0000-0000-0000-0000000000c1') $$,
  '23503', null, 'tasks: cannot link to a project in another workspace');

-- Backend-only columns and tables
select throws_ok(
  $$ update public.documents set processing_status = 'processed' where id = 'aaaaaaaa-0000-0000-0000-0000000000d1' $$,
  '42501', null, 'documents: processing status is not client-writable');
select throws_ok(
  $$ insert into public.ai_jobs (workspace_id, document_id) values ('aaaaaaaa-0000-0000-0000-0000000000a0', 'aaaaaaaa-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'ai_jobs: cannot be created by the client');
select throws_ok(
  $$ update public.generated_plans set status = 'approved' where id = 'aaaaaaaa-0000-0000-0000-0000000000f2' $$,
  '42501', null, 'generated_plans: status can only change through the review functions');
select throws_ok(
  $$ insert into public.notifications (workspace_id, user_id, type, title, dedupe_key)
     values ('aaaaaaaa-0000-0000-0000-0000000000a0', 'aaaaaaaa-0000-0000-0000-000000000001', 'system', 'x', 'x') $$,
  '42501', null, 'notifications: cannot be created by the client');

-- AI plan approval
select throws_ok(
  $$ select public.approve_generated_plan('bbbbbbbb-0000-0000-0000-0000000000f2', '{"project":{"name":"x"},"tasks":[{"title":"x"}]}') $$,
  'P0002', null, 'approve: cannot approve another workspace''s plan');
select throws_ok(
  $$ select public.reject_generated_plan('bbbbbbbb-0000-0000-0000-0000000000f2') $$,
  'P0002', null, 'reject: cannot reject another workspace''s plan');
select throws_ok(
  $$ select public.approve_generated_plan('aaaaaaaa-0000-0000-0000-0000000000f2', '{"project":{"name":"Empty"},"tasks":[]}') $$,
  '22023', null, 'approve: a plan needs at least one task');
select throws_ok(
  $$ select public.approve_generated_plan('aaaaaaaa-0000-0000-0000-0000000000f2',
       '{"project":{"name":"Broken"},"tasks":[{"key":"t1","title":"OK"},{"key":"t2","title":"Bad","priority":"extreme"}]}') $$,
  '22P02', null, 'approve: invalid data fails the whole approval');
select is((select count(*)::int from public.projects where name = 'Broken'), 0,
  'approve: a failed approval leaves no partial project');
select is((select count(*)::int from public.tasks where title = 'OK'), 0,
  'approve: a failed approval leaves no partial tasks');

select isnt(
  public.approve_generated_plan(
    'aaaaaaaa-0000-0000-0000-0000000000f2',
    '{"project":{"name":"Website","start_date":"2026-11-16","end_date":"2026-12-18"},
      "milestones":[{"title":"Launch","due_date":"2026-12-18"}],
      "tasks":[{"key":"t1","title":"Requirements","priority":"high","due_date":"2026-11-20"},
               {"key":"t2","title":"Design","depends_on":["t1"],"due_date":"2026-11-27"}]}'::jsonb),
  null, 'approve: a valid plan is approved');
select is((select count(*)::int from public.tasks t join public.projects p on p.id = t.project_id where p.name = 'Website'), 2,
  'approve: approved tasks are created in the new project');
select is((select count(*)::int from public.milestones m join public.projects p on p.id = m.project_id where p.name = 'Website'), 1,
  'approve: approved milestones are created');
select is((select count(*)::int from public.task_dependencies d join public.tasks t on t.id = d.task_id where t.title = 'Design'), 1,
  'approve: dependencies between tasks are created');
select is((select status::text from public.generated_plans where id = 'aaaaaaaa-0000-0000-0000-0000000000f2'), 'approved',
  'approve: the plan is marked approved');
select throws_ok(
  $$ select public.approve_generated_plan('aaaaaaaa-0000-0000-0000-0000000000f2', '{"project":{"name":"Again"},"tasks":[{"title":"x"}]}') $$,
  'P0001', null, 'approve: a plan cannot be approved twice (no duplicate records)');

-- Users can mark their own notifications read but not other columns
reset role;
insert into public.notifications (workspace_id, user_id, type, title, dedupe_key) values
  ('aaaaaaaa-0000-0000-0000-0000000000a0', 'aaaaaaaa-0000-0000-0000-000000000001', 'system', 'Alice note', 'test:alice');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select isnt_empty($$ update public.notifications set read_at = now() where dedupe_key = 'test:alice' returning 1 $$,
  'notifications: users can mark their own as read');
select throws_ok($$ update public.notifications set title = 'changed' where dedupe_key = 'test:alice' $$,
  '42501', null, 'notifications: other columns are read-only');

-- ---------------------------------------------------------------------------
-- Scheduled reminder processing (as the scheduler / superuser)
-- ---------------------------------------------------------------------------
reset role;
insert into public.reminders (id, workspace_id, user_id, title, remind_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000f3', 'aaaaaaaa-0000-0000-0000-0000000000a0', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Submit essay', now() - interval '1 minute');
insert into public.tasks (workspace_id, title, due_date) values
  ('aaaaaaaa-0000-0000-0000-0000000000a0', 'Late task', (now() at time zone 'Africa/Johannesburg')::date - 2);

select public.process_due_reminders();
select is((select status::text from public.reminders where id = 'aaaaaaaa-0000-0000-0000-0000000000f3'), 'sent',
  'reminders: due reminders are marked sent');
select is((select count(*)::int from public.notifications where reminder_id = 'aaaaaaaa-0000-0000-0000-0000000000f3'), 1,
  'reminders: a notification is created for a due reminder');
select is((select count(*)::int from public.notifications where type = 'task_overdue' and title = 'Overdue: Late task'), 1,
  'reminders: overdue tasks create a notification');
create temp table notification_count as select count(*)::int as n from public.notifications;
select public.process_due_reminders();
select is((select count(*)::int from public.notifications), (select n from notification_count),
  'reminders: processing again does not create duplicates');
select throws_ok($$ update public.profiles set timezone = 'Mars/Olympus' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '22023', null, 'profiles: unknown timezones are rejected');

select * from finish();
rollback;

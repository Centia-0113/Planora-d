-- Planora · Sprint 1 · Database security tests (pgTAP)
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- ---------------------------------------------------------------------------
-- Fixtures: two independent users (inserted as superuser, firing the trigger)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test', '{"full_name":"Alice Mokoena"}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test',   '{}',                            'authenticated', 'authenticated');

-- ---------------------------------------------------------------------------
-- Onboarding trigger
-- ---------------------------------------------------------------------------
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Alice Mokoena',
  'A profile is created for every new user'
);

select is(
  (select name from public.workspaces
    where owner_id = '11111111-1111-1111-1111-111111111111' and is_personal),
  'Alice''s workspace',
  'Every new user receives a personal workspace named after them'
);

select is(
  (select name from public.workspaces
    where owner_id = '22222222-2222-2222-2222-222222222222' and is_personal),
  'My workspace',
  'Users without a name get a default workspace name'
);

select is(
  (select role::text from public.workspace_members wm
     join public.workspaces w on w.id = wm.workspace_id
    where wm.user_id = '11111111-1111-1111-1111-111111111111' and w.is_personal),
  'owner',
  'The new user is the owner of their personal workspace'
);

select ok(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.profiles'::regclass, 'public.workspaces'::regclass, 'public.workspace_members'::regclass)),
  'RLS is enabled on every Sprint 1 table'
);

-- ---------------------------------------------------------------------------
-- Act as Alice
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1,
  'Alice can see exactly one profile (her own)');

select is((select count(*)::int from public.workspaces), 1,
  'Alice can see exactly one workspace (her own)');

select is_empty(
  $$ select 1 from public.workspaces where owner_id = '22222222-2222-2222-2222-222222222222' $$,
  'Alice cannot see Bob''s workspace'
);

select is_empty(
  $$ select 1 from public.workspace_members where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'Alice cannot see Bob''s memberships'
);

select is_empty(
  $$ update public.workspaces set name = 'hacked'
       where owner_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'Alice cannot rename Bob''s workspace'
);

select is_empty(
  $$ update public.profiles set full_name = 'hacked'
       where id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'Alice cannot edit Bob''s profile'
);

select isnt_empty(
  $$ update public.workspaces set name = 'Alice HQ'
       where owner_id = '11111111-1111-1111-1111-111111111111' returning id $$,
  'Alice can rename her own workspace'
);

select throws_ok(
  $$ insert into public.workspace_members (workspace_id, user_id, role)
     select id, '11111111-1111-1111-1111-111111111111', 'owner' from public.workspaces limit 1 $$,
  '42501', null,
  'Alice cannot add memberships directly (no insert privilege)'
);

select throws_ok(
  $$ update public.workspaces set owner_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null,
  'Workspace ownership cannot be changed from the client'
);

select is_empty(
  $$ delete from public.workspaces where is_personal returning id $$,
  'The personal workspace cannot be deleted'
);

-- ---------------------------------------------------------------------------
-- Anonymous visitors
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ select * from public.workspaces $$,
  '42501', null,
  'Anonymous visitors cannot read workspaces at all'
);

select * from finish();
rollback;

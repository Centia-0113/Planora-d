// Runs the Supabase migrations and pgTAP test files against PGlite (Postgres compiled to
// WebAssembly), so database security tests run without Docker. Usage: npm run test:db:local
// Supabase-specific pieces (roles, default grants, auth.uid(), storage tables) are stubbed below;
// `npm run test:db` (Supabase CLI + Docker) remains the authoritative run.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] ?? process.cwd()
const db = new PGlite()

const SUPABASE_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key, email text, raw_user_meta_data jsonb default '{}', aud text, role text
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid
);
alter table storage.objects enable row level security;
grant all on storage.objects to authenticated, service_role;
grant select on storage.buckets to authenticated;
`

// Tiny pgTAP stand-in (SECURITY INVOKER so RLS applies exactly as in the real tests).
const TAP_SHIM = `
create schema tap; grant usage on schema tap to public;
create table tap.results (n serial primary key, ok boolean, descr text, detail text);
grant all on tap.results to public;
grant all on sequence tap.results_n_seq to public;
create function public.plan(int) returns text language sql as $$ select 'plan'::text $$;
create function public.no_plan() returns text language sql as $$ select 'no_plan'::text $$;
create function public._rec(ok boolean, descr text, detail text default null) returns text language plpgsql as $$
begin insert into tap.results (ok, descr, detail) values (ok, descr, detail); return descr; end $$;
create function public."is"(have anyelement, want anyelement, descr text) returns text language plpgsql as $$
begin return public._rec(have is not distinct from want, descr, format('have %s, want %s', have, want)); end $$;
create function public.isnt(have anyelement, want anyelement, descr text) returns text language plpgsql as $$
begin return public._rec(have is distinct from want, descr, format('have %s', have)); end $$;
create function public.ok(cond boolean, descr text) returns text language plpgsql as $$
begin return public._rec(coalesce(cond, false), descr); end $$;
create function public.is_empty(q text, descr text) returns text language plpgsql as $$
declare r record; found_row boolean := false;
begin for r in execute q loop found_row := true; end loop; return public._rec(not found_row, descr); end $$;
create function public.isnt_empty(q text, descr text) returns text language plpgsql as $$
declare r record; found_row boolean := false;
begin for r in execute q loop found_row := true; end loop; return public._rec(found_row, descr); end $$;
create function public.throws_ok(q text, code text, msg text, descr text) returns text language plpgsql as $$
begin
  execute q;
  return public._rec(false, descr, 'no exception raised');
exception when others then
  return public._rec(sqlstate = code, descr, format('got %s: %s', sqlstate, sqlerrm));
end $$;
create function public.finish() returns setof text language sql as $$ select 'done'::text $$;
`

async function run(label, sql) {
  try {
    await db.exec(sql)
    console.log(`  ok   ${label}`)
  } catch (err) {
    console.log(`  FAIL ${label}: ${err.message}`)
    process.exitCode = 1
    throw err
  }
}

await run('supabase stubs', SUPABASE_STUBS)
const migrationsDir = join(root, 'supabase/migrations')
for (const file of readdirSync(migrationsDir).sort()) {
  await run(`migration ${file}`, readFileSync(join(migrationsDir, file), 'utf8'))
}
await run('pgTAP shim', TAP_SHIM)

const testsDir = join(root, 'supabase/tests/database')
for (const file of readdirSync(testsDir).sort()) {
  await db.exec('truncate tap.results restart identity')
  const sql = readFileSync(join(testsDir, file), 'utf8')
    .replace(/create extension if not exists pgtap[^;]*;/i, '')
    // Keep results: replace the final rollback with a commit of nothing but _tap reads happen before it.
    .replace(/rollback;\s*$/i, '')
  try {
    await db.exec(sql)
    const { rows } = await db.query('select n, ok, descr, detail from tap.results order by n')
    await db.exec('rollback')
    const failed = rows.filter((r) => !r.ok)
    console.log(`\n${file}: ${rows.length - failed.length}/${rows.length} passed`)
    for (const r of failed) console.log(`  not ok ${r.n} - ${r.descr}  [${r.detail ?? ''}]`)
    if (failed.length) process.exitCode = 1
  } catch (err) {
    console.log(`\n${file}: ERROR ${err.message}`)
    await db.exec('rollback').catch(() => {})
    process.exitCode = 1
  }
}

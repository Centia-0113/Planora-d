-- =============================================================================
-- Planora · Sprint 4 · Document management
-- documents table + private storage bucket + storage access policies
-- =============================================================================

create type public.document_status as enum ('uploaded', 'processing', 'processed', 'failed');

create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  project_id         uuid,
  uploaded_by        uuid default auth.uid() references public.profiles (id) on delete set null,
  file_name          text not null check (char_length(btrim(file_name)) between 1 and 255),
  file_type          text not null check (file_type in ('pdf', 'docx', 'doc', 'txt', 'csv', 'xlsx')),
  mime_type          text not null,
  file_size          bigint not null check (file_size > 0 and file_size <= 20971520),
  storage_path       text not null unique,
  category           text not null default 'other'
                     check (category in ('brief', 'requirements', 'report', 'reference', 'assignment', 'other')),
  description        text check (description is null or char_length(description) <= 2000),
  processing_status  public.document_status not null default 'uploaded',
  extracted_text     text check (extracted_text is null or char_length(extracted_text) <= 400000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, workspace_id),
  -- Files must live under their workspace's folder: <workspace_id>/<file>
  check (storage_path like workspace_id::text || '/%'),
  foreign key (project_id, workspace_id)
    references public.projects (id, workspace_id) on delete set null (project_id)
);

create index documents_workspace_idx on public.documents (workspace_id, created_at desc);
create index documents_project_idx on public.documents (project_id);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

select public.apply_workspace_rls('documents');

-- processing_status / extracted_text are written by the backend only.
revoke update on public.documents from authenticated;
grant update (file_name, project_id, category, description) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, 20 MB limit, supported types only
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Parse the leading folder of an object path as a workspace id (null if not a uuid).
create or replace function public.storage_workspace_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create policy "Members can read workspace documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_workspace_member(public.storage_workspace_id(name)));

create policy "Members can upload workspace documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_workspace_member(public.storage_workspace_id(name)));

create policy "Members can update workspace documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.is_workspace_member(public.storage_workspace_id(name)))
  with check (bucket_id = 'documents' and public.is_workspace_member(public.storage_workspace_id(name)));

create policy "Members can delete workspace documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_workspace_member(public.storage_workspace_id(name)));

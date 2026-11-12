# Architecture

## Overview

```
Browser (React SPA on Vercel)
   │  anon key + user JWT
   ▼
Supabase
 ├─ Auth ............ email/password, verification, password reset (PKCE)
 ├─ PostgREST ....... CRUD on tables, protected by Row Level Security
 ├─ RPC ............. approve_generated_plan / reject_generated_plan (atomic)
 ├─ Storage ......... private "documents" bucket, folder per workspace
 ├─ Edge Functions .. generate-plan, delete-account, send-email-notifications
 └─ pg_cron ......... process_due_reminders() every minute
                        │
                        ▼
                    Anthropic API (Claude), called only from generate-plan
```

The browser only ever holds the public anon key and the signed-in user's JWT. The service-role
key, the Anthropic API key and the email provider key exist only as Edge Function secrets.

## Frontend structure

```
src/
  app/                 providers, route table (pages are lazy-loaded)
  components/ui/       design system: Button, Input, Select, Modal, Card, Badge, ProgressBar, states
  components/layout/   AppLayout (sidebar, header, mobile drawer), navigation, PageContainer
  features/<module>/   api.ts (TanStack Query hooks), logic.ts (pure, tested), components/
  pages/               route components
  lib/                 supabase client, dates (timezone-aware), validation, errors
  types/database.ts    table row types + typed Supabase Database
supabase/functions/_shared/plan.ts   plan model + conflict analysis, shared by browser and Edge Function
```

Business rules live in pure modules (`features/*/logic.ts`, `lib/dates.ts`, `_shared/plan.ts`),
so they're unit-tested without a browser or database.

Every query key starts with `['ws', workspaceId]`. A write invalidates that prefix, so tasks,
the dashboard, the planner, analytics and projects stay consistent. Signing out clears the cache.

**Time:** dates (due dates, events, checklist days) are timezone-free `date` values. "Today",
completion days in analytics, and reminder times are computed in the user's profile timezone
(default `Africa/Johannesburg`). The scheduler also uses each user's timezone in SQL.

## Database

All tables use UUID keys, `timestamptz` timestamps and check constraints for lengths and date
order.

```
auth.users ─1:1─ profiles ─1:1─ user_preferences
                    │
                    ├─< workspace_members >─ workspaces ─┬─< task_categories
                    │                                      ├─< projects ─┬─< milestones
                    │                                      │             └─< tasks (project_id)
                    │                                      ├─< tasks ─┬─< subtasks
                    │                                      │          ├─< task_dependencies
                    │                                      │          └─< reminders (task_id)
                    │                                      ├─< planner_events ─< reminders (event_id)
                    │                                      ├─< daily_checklists
                    │                                      ├─< documents ─< ai_jobs ─1:1─ generated_plans
                    ├─< reminders (user_id)                │
                    └─< notifications (user_id)            └─ (every row carries workspace_id)
```

| Table                                                  | Introduced | Notes                                                             |
| ------------------------------------------------------ | ---------- | ----------------------------------------------------------------- |
| profiles, workspaces, workspace_members                | 1          | Created by the `handle_new_user` trigger at registration          |
| tasks, subtasks, task_categories                       | 2          | Six default categories seeded per workspace                       |
| projects, milestones, planner_events, daily_checklists | 3          | `tasks.project_id` links tasks to projects                        |
| documents                                              | 4          | Metadata; files live in Storage at `<workspace_id>/<uuid>-<name>` |
| ai_jobs, generated_plans, task_dependencies            | 5          | Jobs and plans are written only by the backend                    |
| reminders, notifications, user_preferences             | 6          | Reminders and notifications are personal (`user_id`)              |

**Consistency:** child tables use composite foreign keys such as
`(task_id, workspace_id) → tasks(id, workspace_id)`, so a row can never point at a parent in a
different workspace, even if RLS were misconfigured.

**Triggers:** `updated_at` maintenance, `completed_at` sync, seeding default categories and
preferences, timezone validation, and rescheduling a reminder when its time changes.

## Security model

- **RLS on every table.** `apply_workspace_rls(table)` adds select, insert, update and delete
  policies based on `is_workspace_member(workspace_id)`, which is security-definer to avoid policy
  recursion. Personal tables (reminders, notifications, preferences) also require
  `user_id = auth.uid()`.
- **Column privileges.** Ownership fields, document processing status and notification content
  can't be written by clients. Only `notifications.read_at` is client-writable.
- **Backend-only writes.** `ai_jobs` and `generated_plans` are written by the Edge Function with
  the service role. Plan status changes only through the review functions.
- **Storage.** The bucket is private. Policies derive the workspace from the object path's first
  folder. Downloads use 60-second signed URLs, and type and size limits are enforced by the
  bucket.
- **Anonymous visitors** have no table privileges.
- Tested by `supabase/tests/database/*.test.sql` (67 assertions).

## Edge Functions

| Function                   | Auth                       | Responsibility                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-plan`            | User JWT                   | Checks document access with RLS and enforces limits (one active job per document, `AI_DAILY_LIMIT` per user per day). Creates an `ai_jobs` row and returns 202. In the background it extracts text (PDF, DOCX, TXT, CSV, XLSX) and calls Claude with a strict JSON schema. It validates the result with zod, normalises dates, detects conflicts, stores a `generated_plans` row and notifies the user. |
| `delete-account`           | User JWT                   | Removes the user's stored files, then deletes the auth user. Database rows cascade.                                                                                                                                                                                                                                                                                                                     |
| `send-email-notifications` | `CRON_SECRET` bearer token | Sends pending email notifications through Resend, re-checking each user's current preference.                                                                                                                                                                                                                                                                                                           |

**AI safeguards:**

- The document is treated as data, not instructions.
- A date is labelled `document` only when it's backed by a quote from the text; otherwise it's a
  suggestion.
- Conflict detection is deterministic code, not the model.
- Nothing reaches the user's tasks until they approve. Approval runs in one transaction: it
  creates the project, milestones, tasks and dependencies and marks the plan approved. A plan can't
  be approved twice, and a failure rolls everything back.

## Reminders pipeline

`pg_cron` runs `process_due_reminders()` every minute. It creates idempotent notifications (each
has a unique `dedupe_key`) for three cases:

1. Reminders that are due.
2. Overdue tasks in the last 30 days, judged in each user's timezone.
3. Tasks due today or tomorrow.

If a user has email enabled, the notification is queued with `email_status = 'pending'`. The app
polls notifications every minute and shows a browser notification when Planora is open in a
background tab and the user has allowed it.

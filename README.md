# Planora

**Your Life. Your Goals. Your Progress.**

Planora is a multi-user productivity platform. Each user gets a private workspace for tasks,
projects, a monthly planner, a daily checklist, documents, AI-generated project plans, analytics
and reminders.

| Layer        | Technology                                                           |
| ------------ | -------------------------------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts                |
| Routing/data | React Router, TanStack Query                                         |
| Backend      | Supabase: PostgreSQL + RLS, Auth, Storage, Edge Functions, pg_cron   |
| AI           | Claude (`claude-opus-5-5`) through the `generate-plan` Edge Function |
| Testing      | Vitest, React Testing Library, Playwright, pgTAP                     |

## Features by sprint

| Sprint | Module                       | What you can do                                                                                                                                 |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | Foundation                   | Register, verify email, sign in/out, reset password. Each user gets a private workspace.                                                        |
| 2      | Tasks                        | Create, edit, delete and complete tasks. Set priorities, categories and dates. Add subtasks, filter, search and sort.                           |
| 3      | Projects, planner, checklist | Projects with milestones and progress. Monthly calendar of events, deadlines and milestones. Daily checklist.                                   |
| 4      | Documents                    | Drag-and-drop uploads with progress and cancel. Search, filter, project links, signed downloads.                                                |
| 5      | AI planning                  | Document to proposed plan. Edit, remove and approve tasks. Approval creates the project, tasks, milestones and dependencies in one transaction. |
| 6      | Analytics, reminders         | Charts built from real data. Reminders, notification centre, email and browser notifications, settings.                                         |
| 7      | Integration, QA, deployment  | Code-split pages, cross-user security tests, journey tests, legal pages, account deletion, deployment docs.                                     |

## Quick start

```bash
npm install
cp .env.example .env.local     # add your Supabase URL + anon key
npm run dev                    # http://localhost:5173
```

Without Supabase credentials, the app still renders, and the auth pages explain what to configure.
For full setup (database, storage, Edge Functions, AI key, email, scheduling), see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Scripts

| Command                   | Purpose                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`             | Dev server                                                                     |
| `npm run build`           | Typecheck + production build                                                   |
| `npm run lint`            | ESLint                                                                         |
| `npm run format`          | Prettier (`format:check` to verify)                                            |
| `npm test`                | Unit, component and page integration tests (Vitest)                            |
| `npm run test:db:local`   | Migrations + pgTAP security tests on PGlite (no Docker needed)                 |
| `npm run test:db`         | The same tests on a real local Supabase stack (`supabase start`, needs Docker) |
| `npm run check:functions` | Type-check the Deno Edge Functions                                             |
| `npm run test:e2e`        | Playwright smoke tests, plus full journeys when `PLANORA_E2E_*` is set         |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system design, database relationships, Edge Function responsibilities, security model
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): environment setup, production deployment, backups and recovery
- [docs/TESTING.md](docs/TESTING.md): testing strategy and how to run each level
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md): known limitations and future improvements
- [CONTRIBUTING.md](CONTRIBUTING.md): branching, commits, pull requests, definition of done

# Testing

| Level                 | Tool                           | Where                                                                       | Command                                                       |
| --------------------- | ------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Unit (business logic) | Vitest                         | `src/**/logic.test.ts`, `src/lib/*.test.ts`, `src/features/ai/plan.test.ts` | `npm test`                                                    |
| Component             | React Testing Library          | `src/components/ui/ui.test.tsx`, `src/features/auth/*.test.tsx`             | `npm test`                                                    |
| Page integration      | RTL + in-memory Supabase fake  | `src/pages/**/*.test.tsx`                                                   | `npm test`                                                    |
| Database security     | pgTAP                          | `supabase/tests/database/*.test.sql`                                        | `npm run test:db:local` (PGlite) / `npm run test:db` (Docker) |
| End-to-end            | Playwright, desktop and mobile | `e2e/`                                                                      | `npm run test:e2e`                                            |
| Manual                | Browsers                       | Checklist below                                                             |                                                               |

## What is covered

- **Logic:**
  - Filtering, sorting and summaries.
  - Subtask and project progress, with the documented calculation.
  - Timezone-correct "today", reminder conversion (including daylight saving) and the calendar grid.
  - Analytics bucketing, with completion days in the user's timezone.
  - File validation and safe storage paths.
  - AI plan normalisation: invented "document" dates are downgraded, and unknown dependencies
    are removed.
  - Conflict detection: date order, dependency order, project range, milestones and cycles.
  - The approval payload.
- **Pages:**
  - The Tasks page loads only the workspace's tasks, and search, filters, completing a task and
    creating one (with validation) all work.
  - Dashboard numbers match the records.
  - Plan review labels document dates against AI suggestions, and approval sends only the kept
    tasks in one RPC call.
  - Rejecting a plan creates nothing.
- **Database:**
  - Every table has RLS.
  - Users can't read, write, update or delete across workspaces.
  - Rows can't be linked to another workspace's parents.
  - Backend-only columns and tables are protected.
  - Storage folders are isolated per workspace.
  - Plan approval is atomic and runs once.
  - Reminder processing is idempotent.
  - Unknown timezones are rejected.
- **E2E:**
  - Public smoke tests run everywhere: landing, auth navigation, validation, 404, no horizontal
    scroll, protected-route redirects.
  - Journeys 1–6 need a test Supabase project:
    ```bash
    PLANORA_E2E_EMAIL=test@example.com PLANORA_E2E_PASSWORD=... npm run test:e2e
    # add PLANORA_E2E_AI=1 once generate-plan is deployed with an API key
    ```
    Build the app against the same test project (`.env.local`).

## Manual checks before a release

- [ ] Register a new account, verify the email link, then sign in on desktop and on a phone.
- [ ] Use the password reset email link.
- [ ] Upload each supported file type; confirm unsupported types and files over 20 MB are rejected.
- [ ] Generate a plan from a real brief and check that the dates match the document.
- [ ] Set a reminder 2 minutes ahead and confirm the notification arrives (and the email, if enabled).
- [ ] Turn on browser notifications and receive one while Planora is open in a background tab.
- [ ] Navigate every page with the keyboard only; focus is visible and modals trap focus.
- [ ] Test in Chrome, Firefox, Safari and Edge.
- [ ] Run the Supabase Security and Performance advisors.

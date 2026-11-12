# Contributing to Planora

## Branching

- `main` is always deployable and protected. Nobody pushes to it directly.
- Create a short-lived branch from `main` for each piece of work:

| Prefix     | Use for                       | Example                      |
| ---------- | ----------------------------- | ---------------------------- |
| `feature/` | New functionality             | `feature/s2-task-crud`       |
| `fix/`     | Bug fixes                     | `fix/login-redirect-loop`    |
| `chore/`   | Tooling, dependencies, config | `chore/upgrade-supabase-cli` |
| `docs/`    | Documentation only            | `docs/deployment-guide`      |
| `test/`    | Tests only                    | `test/rls-tasks`             |

Include the sprint number (`s2-`, `s3-`, …) in feature branches so they map to the roadmap.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tasks): add priority selector to task form
fix(auth): keep redirect target after email verification
test(db): cover cross-workspace task access
```

## Pull requests

1. Keep PRs focused, one story or task where possible.
2. Fill in the PR template, including how you tested and any database changes.
3. CI must pass: lint, format check, typecheck, unit tests, build and e2e.
4. At least one approving review before merging. Use **squash merge**.

## Database changes

- Never edit an applied migration. Add a new one with `npx supabase migration new <name>`.
- Every user-owned table needs `workspace_id`, RLS enabled, and policies for select, insert,
  update and delete.
- Add pgTAP tests in `supabase/tests/database/` proving another user cannot read or change the
  data.
- Regenerate `src/types/database.ts` after schema changes.

## Definition of done

- Acceptance criteria met
- Tests added and passing
- Security and permissions verified
- Responsive behaviour checked
- Loading and error states handled
- Migrations committed
- Documentation updated
- Reviewed and approved

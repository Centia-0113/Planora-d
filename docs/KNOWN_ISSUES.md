# Known issues and future improvements

## Known limitations

| Area          | Limitation                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verification  | Edge Functions are type-checked (`npm run check:functions`) but have not been executed against live Supabase/Anthropic/Resend services. Run `npx supabase functions serve` and exercise them before production.     |
| Documents     | Scanned PDFs (images only) can't be analysed, because OCR isn't implemented; the job fails with a clear message. Legacy `.doc` files can be stored but not analysed.                                                |
| Documents     | If a storage delete succeeds but the row delete fails, the row remains and the delete can be retried. If a metadata insert fails after upload, the file is removed. A periodic orphan sweep is not yet implemented. |
| AI            | Documents longer than `AI_MAX_INPUT_CHARS` (default 400,000 characters) are truncated, and the user is told. Chunked analysis would remove this limit.                                                              |
| AI            | Plans are generated in the background with `EdgeRuntime.waitUntil`. Very long generations can hit the Edge Function wall-clock limit on lower plans, and the job is then marked failed.                             |
| Browser push  | Browser notifications work only while Planora is open in some tab. True closed-browser Web Push would need a service worker, VAPID keys and a push sender.                                                          |
| Notifications | The app polls every 60 seconds. Supabase Realtime would make this instant.                                                                                                                                          |
| Collaboration | The schema supports shared workspaces and roles, but there is no UI for invitations; every user has one personal workspace.                                                                                         |
| Data volume   | Task lists load up to 2,000 tasks and analytics run in the browser. Server-side pagination and aggregation views are needed for very large workspaces.                                                              |
| Monitoring    | No front-end error tracker is integrated yet.                                                                                                                                                                       |
| Legal         | The privacy policy and terms are templates and need legal review.                                                                                                                                                   |

## Future improvements

1. Team workspaces: invitations, member roles, assigning tasks to people.
2. Google sign-in (OAuth) alongside email and password.
3. Kanban board and Gantt timeline views for projects.
4. Goals module (personal objectives linked to projects).
5. Recurring tasks and recurring checklist templates.
6. OCR for scanned PDFs, and chunked analysis for long documents.
7. AI usage tiers and billing.
8. Supabase Realtime for live updates across tabs and devices.
9. Web Push with a service worker; installable PWA.
10. Sentry (or similar) for front-end and Edge Function errors.
11. Calendar export and sync (ICS, Google Calendar).

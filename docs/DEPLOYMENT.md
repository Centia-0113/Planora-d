# Environment setup and deployment

Use separate Supabase projects for **development** and **production**. Never share keys between
them.

## 1. Local development

```bash
npm install
cp .env.example .env.local
```

**Option A: hosted development project (no Docker)**

```bash
npx supabase login
npx supabase link --project-ref <dev-project-ref>
npx supabase db push                        # applies supabase/migrations
```

Then put the project URL and **anon** key in `.env.local`.

**Option B: local stack (Docker Desktop)**

```bash
npx supabase start                          # prints the local URL + anon key for .env.local
npx supabase functions serve --env-file supabase/functions/.env
```

`supabase/config.toml` is preconfigured for the Vite dev server: redirect URLs, 8-character
passwords with letters and digits, and required email confirmation. Local emails appear in the
mail viewer, Inbucket.

## 2. Production checklist

### Supabase project

1. Create the production project in your users' region.
2. Link it and apply the migrations:
   ```bash
   npx supabase link --project-ref <prod-ref>
   npx supabase db push
   ```
   The migrations create the private `documents` bucket and its policies, and schedule
   `process_due_reminders` with pg_cron. Under **Integrations → Cron**, confirm the job
   `planora-process-reminders` exists. If pg_cron was unavailable, enable the extension and re-run
   that block from `20261112000500_reminders_notifications.sql`.
3. **Authentication → URL configuration**:
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/auth/callback` and `https://<your-domain>/reset-password`
4. **Authentication → Providers → Email**: confirm email on, minimum password length 8,
   letters and digits required.
5. **Authentication → SMTP**: configure a real email sender (the built-in sender is heavily rate
   limited).

### Edge Functions and secrets

```bash
npx supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  AI_DAILY_LIMIT=10 \
  AI_MAX_INPUT_CHARS=400000 \
  ALLOWED_ORIGIN=https://<your-domain> \
  CRON_SECRET=$(openssl rand -hex 32) \
  RESEND_API_KEY=re_... \
  EMAIL_FROM="Planora <reminders@<your-domain>>" \
  APP_URL=https://<your-domain>

npx supabase functions deploy generate-plan
npx supabase functions deploy delete-account
npx supabase functions deploy send-email-notifications
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions
automatically.

### Email delivery schedule (optional)

To send emails every 5 minutes, enable `pg_net`, store the cron secret in Vault, and schedule the
call:

```sql
select vault.create_secret('<CRON_SECRET>', 'planora_cron_secret');

select cron.schedule(
  'planora-send-emails',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<prod-ref>.supabase.co/functions/v1/send-email-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'planora_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Frontend on Vercel

1. Import the GitHub repository in Vercel. `vercel.json` sets the build, SPA rewrites, security
   headers and long-term caching for hashed assets.
2. Add environment variables for the production project: `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`. Never add the service-role key to Vercel.
3. Add your domain. Vercel issues and renews the HTTPS certificate.
4. Update the Supabase Site URL and redirect URLs to the final domain.

### Monitoring and error reporting

- **Supabase:** Logs Explorer covers API, Auth, Postgres and Edge Function logs. `generate-plan`
  logs failures with the job ID.
- **Supabase advisors:** run the Security and Performance advisors after each migration.
- **Vercel:** deployment logs and analytics.
- **Recommended addition:** a front-end error tracker such as Sentry (see KNOWN_ISSUES).

## 3. Backup and recovery

| Asset               | Backup                                                                                                                             | Recovery                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Database            | Supabase daily backups (Pro plan and above); enable point-in-time recovery for production.                                         | Dashboard → Database → Backups → restore, or PITR to a timestamp. |
| Schema              | `supabase/migrations` in Git                                                                                                       | `npx supabase db push` to a fresh project.                        |
| Logical export      | `npx supabase db dump --data-only -f backup.sql` (scheduled weekly from CI or a secure machine)                                    | `psql "$DATABASE_URL" -f backup.sql`                              |
| Storage (documents) | Not covered by database backups. Sync the `documents` bucket with the S3-compatible API (for example `rclone sync`) on a schedule. | Re-upload with the same object paths.                             |
| Secrets             | Kept in a password manager, not in Git                                                                                             | `npx supabase secrets set ...`                                    |

**Recovery drill (quarterly):** restore the latest backup into a staging project, run
`npx supabase test db`, sign in with a test account and spot-check documents.

## 4. Account deletion and data retention

- Users delete their account in **Settings → Account**. The `delete-account` function removes
  stored files and then the auth user, and every database row cascades.
- Deleting a document removes the stored file first, then the metadata row.
- Notifications and completed reminders are kept until the user deletes them. To prune old
  notifications, schedule
  `delete from notifications where read_at < now() - interval '180 days'` with pg_cron.
- Supabase backups expire according to your plan's retention window. State this in the privacy
  policy.
- The privacy policy (`/privacy`) and terms of service (`/terms`) are templates. Have them
  reviewed for POPIA or GDPR before launch.

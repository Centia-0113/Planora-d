/**
 * send-email-notifications: deliver pending email notifications.
 *
 * Called on a schedule (pg_cron + pg_net, see docs/DEPLOYMENT.md) with
 *   Authorization: Bearer <CRON_SECRET>
 * Secrets: CRON_SECRET, RESEND_API_KEY, EMAIL_FROM (e.g. "Planora <reminders@yourdomain.com>"),
 *          APP_URL (e.g. https://planora.app)
 */
import { adminClient, errorResponse, json } from '../_shared/http.ts'

const BATCH_SIZE = 50

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return errorResponse('Unauthorized', 401)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
  if (!resendKey || !from) return errorResponse('Email delivery is not configured', 503)

  const admin = adminClient()
  const { data: pending, error } = await admin
    .from('notifications')
    .select('id, user_id, title, body, link')
    .eq('email_status', 'pending')
    .order('created_at')
    .limit(BATCH_SIZE)
  if (error) return errorResponse('Could not load notifications', 500)

  let sent = 0
  let failed = 0
  const emailCache = new Map<string, string | null>()

  for (const n of pending ?? []) {
    // Respect the user's current preference, even if it changed after queueing.
    const { data: prefs } = await admin
      .from('user_preferences')
      .select('email_enabled')
      .eq('user_id', n.user_id)
      .maybeSingle()
    if (!prefs?.email_enabled) {
      await admin.from('notifications').update({ email_status: 'not_required' }).eq('id', n.id)
      continue
    }

    if (!emailCache.has(n.user_id)) {
      const { data } = await admin.auth.admin.getUserById(n.user_id)
      emailCache.set(n.user_id, data.user?.email ?? null)
    }
    const to = emailCache.get(n.user_id)
    if (!to) {
      await admin.from('notifications').update({ email_status: 'failed' }).eq('id', n.id)
      failed++
      continue
    }

    const link = appUrl && n.link ? `${appUrl}${n.link}` : appUrl
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: n.title,
        text: [n.title, n.body, link && `Open in Planora: ${link}`].filter(Boolean).join('\n\n'),
      }),
    })

    await admin
      .from('notifications')
      .update({ email_status: res.ok ? 'sent' : 'failed' })
      .eq('id', n.id)
    if (res.ok) sent++
    else failed++
  }

  return json({ processed: pending?.length ?? 0, sent, failed })
})

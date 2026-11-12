/**
 * delete-account: permanently delete the caller's account and data.
 *
 * POST { confirm: "DELETE" }
 * Removes stored files in workspaces the user owns, then deletes the auth user.
 * Database rows cascade from auth.users -> profiles -> workspaces -> everything else.
 */
import { adminClient, corsHeaders, errorResponse, json, requireUser } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireUser(req)
  if (!auth.ok) return auth.response
  const { user } = auth

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== 'DELETE') return errorResponse('Confirmation required', 400)

  const admin = adminClient()

  const { data: workspaces, error: wsError } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
  if (wsError) return errorResponse('Could not load your workspaces', 500)

  const workspaceIds = (workspaces ?? []).map((w) => w.id)
  if (workspaceIds.length) {
    const { data: docs, error: docError } = await admin
      .from('documents')
      .select('storage_path')
      .in('workspace_id', workspaceIds)
    if (docError) return errorResponse('Could not load your documents', 500)

    const paths = (docs ?? []).map((d) => d.storage_path)
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from('documents').remove(paths.slice(i, i + 100))
      if (error) return errorResponse('Could not delete your stored files', 500)
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) return errorResponse('Could not delete your account', 500)

  return json({ deleted: true })
})

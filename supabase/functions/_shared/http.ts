import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.119.0'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status)
}

/** Client that acts as the calling user, so Row Level Security applies. */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
}

/** Service-role client. Only for writes the user is not allowed to make directly. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

/** Resolve the authenticated user, or return a 401 response. */
export async function requireUser(
  req: Request,
): Promise<{ ok: false; response: Response } | { ok: true; user: User; client: SupabaseClient }> {
  const client = userClient(req)
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return { ok: false, response: errorResponse('Not signed in', 401) }
  return { ok: true, user: data.user, client }
}

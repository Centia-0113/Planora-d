import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env, isSupabaseConfigured } from './env'

/**
 * Browser Supabase client. Uses only the public anon key; every table is
 * protected by Row Level Security, so this key cannot read another user's data.
 *
 * When credentials are missing we still create a client against a placeholder
 * URL so the UI renders and can explain what to configure.
 */
export const supabase = createClient<Database>(
  isSupabaseConfigured ? env.supabaseUrl : 'http://localhost:54321',
  isSupabaseConfigured ? env.supabaseAnonKey : 'public-anon-key-not-configured',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

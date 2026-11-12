const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
}

/** False until .env.local holds real Supabase credentials. */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project-ref'))

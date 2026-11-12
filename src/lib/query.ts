import type { PostgrestError } from '@supabase/supabase-js'

/** Throw Supabase errors so TanStack Query treats them as failures. */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw result.error
  return result.data as T
}

/** Convert database / network errors into short messages for the UI. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  const e = error as { message?: string; code?: string }
  switch (e.code) {
    case '23514':
      return 'Some values are not valid. Check the dates and lengths and try again.'
    case '23505':
      return 'That already exists.'
    case '42501':
      return 'You do not have permission to do that.'
    case 'PGRST116':
      return 'We could not find that item. It may have been deleted.'
  }
  if (e.message?.toLowerCase().includes('failed to fetch')) {
    return 'We could not reach the server. Check your connection.'
  }
  return e.message || fallback
}

/** Empty strings from forms become null in the database. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

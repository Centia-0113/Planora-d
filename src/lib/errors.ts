/** Turn Supabase / network errors into messages that are safe and useful to show. */
export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials'))
    return 'That email and password do not match an account.'
  if (lower.includes('email not confirmed'))
    return 'Please verify your email first. Check your inbox for the confirmation link.'
  if (lower.includes('user already registered'))
    return 'An account with this email already exists. Try signing in.'
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'Too many attempts. Please wait a minute and try again.'
  if (lower.includes('failed to fetch') || lower.includes('network'))
    return 'We could not reach the server. Check your connection and try again.'
  if (lower.includes('same password'))
    return 'Your new password must be different from your current password.'
  return message || 'Something went wrong. Please try again.'
}

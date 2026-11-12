import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Alert, FullPageLoader } from '@/components/ui'
import { useAuth } from '@/features/auth/auth-context'
import { AuthLayout, authLinkClass } from './AuthLayout'

/**
 * Landing route for email-verification links. The Supabase client exchanges
 * the ?code= parameter for a session automatically (detectSessionInUrl).
 */
export function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const linkError = params.get('error_description') ?? hash.get('error_description')

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 8000)
    return () => window.clearTimeout(t)
  }, [])

  if (user) return <Navigate to="/dashboard" replace />

  if (linkError || (timedOut && !loading)) {
    return (
      <AuthLayout
        title="We couldn’t verify that link"
        footer={
          <Link to="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        }
      >
        <Alert>
          {linkError ??
            'This verification link is invalid or has expired. Sign in to request a new one.'}
        </Alert>
      </AuthLayout>
    )
  }

  return <FullPageLoader label="Verifying your email" />
}

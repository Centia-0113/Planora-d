import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, FullPageLoader, Input } from '@/components/ui'
import { useAuth } from '@/features/auth/auth-context'
import { friendlyAuthError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/validation'
import { AuthLayout, authLinkClass } from './AuthLayout'

/**
 * Reached from the password-reset email. The Supabase client turns the link
 * into a short-lived recovery session, which lets us call updateUser().
 */
export function ResetPasswordPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [waited, setWaited] = useState(false)

  // Give the client a moment to exchange the link's code for a session.
  useEffect(() => {
    const t = window.setTimeout(() => setWaited(true), 2500)
    return () => window.clearTimeout(t)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = {
      password: validatePassword(password),
      confirm: confirm === password ? undefined : 'Passwords do not match.',
    }
    setErrors(next)
    setFormError(undefined)
    if (next.password || next.confirm) return

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      navigate('/dashboard', { replace: true, state: { passwordUpdated: true } })
    } catch (err) {
      setFormError(friendlyAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!user && (loading || !waited)) return <FullPageLoader label="Opening your reset link" />

  if (!user) {
    return (
      <AuthLayout
        title="Reset link expired"
        footer={
          <Link to="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        }
      >
        <Alert>
          This password reset link is invalid or has expired.{' '}
          <Link to="/forgot-password" className="font-semibold underline">
            Request a new link
          </Link>
          .
        </Alert>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" subtitle={`For ${user.email}`}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {formError && <Alert>{formError}</Alert>}
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  )
}

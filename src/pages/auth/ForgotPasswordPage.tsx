import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Input } from '@/components/ui'
import { friendlyAuthError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { validateEmail } from '@/lib/validation'
import { AuthLayout, authLinkClass } from './AuthLayout'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const emailError = validateEmail(email)
    setError(emailError)
    setFormError(undefined)
    if (emailError) return

    setSubmitting(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err) {
      setFormError(friendlyAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we’ll send you a reset link."
      footer={
        <Link to="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        // Same message whether or not the account exists, so the form can't be used to probe emails.
        <Alert tone="success">
          If an account exists for <strong>{email.trim()}</strong>, a password reset link is on its
          way. Open it on this device to choose a new password.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {formError && <Alert>{formError}</Alert>}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}

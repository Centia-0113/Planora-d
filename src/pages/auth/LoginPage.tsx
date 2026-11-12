import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Input } from '@/components/ui'
import { friendlyAuthError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { validateEmail } from '@/lib/validation'
import { AuthLayout, authLinkClass } from './AuthLayout'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = {
      email: validateEmail(email),
      password: password ? undefined : 'Password is required.',
    }
    setErrors(next)
    setFormError(undefined)
    if (next.email || next.password) return

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(friendlyAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue planning."
      footer={
        <>
          New to Planora?{' '}
          <Link to="/register" className={authLinkClass}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {formError && <Alert>{formError}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Link to="/forgot-password" className={`self-end text-sm ${authLinkClass}`}>
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}

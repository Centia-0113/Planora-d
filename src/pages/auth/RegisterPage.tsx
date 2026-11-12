import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Input } from '@/components/ui'
import { friendlyAuthError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import {
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateFullName,
  validatePassword,
} from '@/lib/validation'
import { AuthLayout, authLinkClass } from './AuthLayout'

type Field = 'fullName' | 'email' | 'password' | 'confirm'

export function RegisterPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<Field, string>>({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Partial<Record<Field, string>> = {
      fullName: validateFullName(values.fullName),
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirm: values.confirm === values.password ? undefined : 'Passwords do not match.',
    }
    setErrors(next)
    setFormError(undefined)
    if (Object.values(next).some(Boolean)) return

    setSubmitting(true)
    try {
      const email = values.email.trim()
      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: { full_name: values.fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      // With email confirmation on (the recommended setting) there is no session yet.
      if (data.session) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true })
      }
    } catch (err) {
      setFormError(friendlyAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get a private workspace for your tasks, projects and goals."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {formError && <Alert>{formError}</Alert>}
        <Input
          label="Full name"
          autoComplete="name"
          value={values.fullName}
          onChange={set('fullName')}
          error={errors.fullName}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}

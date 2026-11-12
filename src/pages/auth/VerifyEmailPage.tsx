import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { Alert, Button } from '@/components/ui'
import { friendlyAuthError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { AuthLayout, authLinkClass } from './AuthLayout'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string }>()
  const [sending, setSending] = useState(false)

  async function resend() {
    if (!email) return
    setSending(true)
    setStatus(undefined)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      setStatus({ tone: 'success', text: 'A new verification email is on its way.' })
    } catch (err) {
      setStatus({ tone: 'error', text: friendlyAuthError(err) })
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthLayout
      title="Check your email"
      footer={
        <Link to="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
          <MailCheck className="size-7" aria-hidden />
        </div>
        <p className="text-navy-700">
          We sent a verification link to{' '}
          {email ? <strong className="text-navy-900">{email}</strong> : 'your email address'}. Open
          it to activate your account and your private workspace.
        </p>
        <p className="text-sm text-navy-500">
          The link expires after a while. If you can’t find the email, check your spam folder.
        </p>
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        {email && (
          <Button variant="secondary" onClick={resend} loading={sending}>
            Resend verification email
          </Button>
        )}
      </div>
    </AuthLayout>
  )
}

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Alert, Logo } from '@/components/ui'
import { isSupabaseConfigured } from '@/lib/env'

const highlights = [
  'Tasks, projects and deadlines in one place',
  'A monthly planner and daily checklist',
  'Your workspace stays private to you',
]

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-900 p-12 text-cream-50 lg:flex lg:flex-col">
        <Link to="/" aria-label="Planora home">
          <Logo light />
        </Link>
        <div className="my-auto max-w-md">
          <p className="font-heading text-4xl leading-tight font-extrabold text-cream-50">
            Your Life. Your Goals. <span className="text-sage-300">Your Progress.</span>
          </p>
          <ul className="mt-10 space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-navy-100">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sage-300" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-sage-400/10"
        />
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link to="/" className="mb-10 lg:hidden" aria-label="Planora home">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-md">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 text-navy-500">{subtitle}</p>}
          {!isSupabaseConfigured && (
            <div className="mt-6">
              <Alert tone="info">
                Supabase is not configured yet. Copy <code>.env.example</code> to{' '}
                <code>.env.local</code> and add your project URL and anon key to enable sign-in.
              </Alert>
            </div>
          )}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-navy-600">{footer}</div>}
        </div>
      </main>
    </div>
  )
}

export const authLinkClass = 'font-semibold text-sage-700 underline-offset-4 hover:underline'

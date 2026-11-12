import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-cream-400 bg-cream-50 px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-sage-100 text-sage-700">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-navy-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-card border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <AlertTriangle className="mb-3 size-8 text-red-700" aria-hidden />
      <h3 className="text-base font-bold text-red-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-red-800">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

const alertTones = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-sage-200 bg-sage-50 text-sage-800',
  info: 'border-navy-200 bg-navy-50 text-navy-800',
}

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: keyof typeof alertTones
  children: ReactNode
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-4 py-3 text-sm', alertTones[tone])}
    >
      {children}
    </div>
  )
}

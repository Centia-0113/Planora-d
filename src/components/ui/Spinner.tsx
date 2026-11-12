import { cn } from '@/lib/cn'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** Accessible label. Pass an empty string when the spinner is decorative. */
  label?: string
  className?: string
}

const sizes = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-10 border-[3px]' }

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-r-transparent',
        sizes[size],
        className,
      )}
    />
  )
}

export function FullPageLoader({ label = 'Loading Planora' }: { label?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-navy-700">
      <Spinner size="lg" label={label} />
      <p className="text-sm text-navy-500">{label}…</p>
    </div>
  )
}

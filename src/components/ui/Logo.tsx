import { cn } from '@/lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill="#1a2740" />
      <path
        d="M10 23V9h6.5a4.5 4.5 0 0 1 0 9H10"
        fill="none"
        stroke="#f9f5ec"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="22.5" r="2.5" fill="#87a37f" />
    </svg>
  )
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={light ? 'rounded-lg ring-1 ring-white/20' : undefined} />
      <span
        className={cn(
          'font-heading text-xl font-extrabold tracking-tight',
          light ? 'text-cream-50' : 'text-navy-900',
        )}
      >
        Planora
      </span>
    </span>
  )
}

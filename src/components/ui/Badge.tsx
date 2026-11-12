import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'navy' | 'sage' | 'cream' | 'red' | 'amber'

const tones: Record<Tone, string> = {
  navy: 'bg-navy-50 text-navy-700 ring-navy-200',
  sage: 'bg-sage-50 text-sage-700 ring-sage-200',
  cream: 'bg-cream-200 text-navy-700 ring-cream-400',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
}

export function Badge({
  tone = 'navy',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

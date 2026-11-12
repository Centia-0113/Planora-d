import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'sage'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-navy-800 text-cream-50 hover:bg-navy-700 active:bg-navy-900',
  secondary: 'border border-navy-200 bg-white text-navy-800 hover:border-navy-300 hover:bg-navy-50',
  ghost: 'text-navy-700 hover:bg-navy-50',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  sage: 'bg-sage-600 text-white hover:bg-sage-700',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

/** Button styling, also usable on links (<Link className={buttonClasses(...)} />). */
export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
) =>
  cn(
    'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    extra,
  )

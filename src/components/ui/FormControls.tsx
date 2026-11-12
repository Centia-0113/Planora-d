import {
  forwardRef,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const fieldClass =
  'w-full rounded-xl border bg-white px-3.5 text-sm text-navy-900 transition-colors focus:border-sage-500 focus:ring-2 focus:ring-sage-200 focus:outline-none disabled:bg-cream-50'

function FieldShell({
  id,
  label,
  error,
  hint,
  children,
  hideLabel,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
  hideLabel?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn('text-sm font-medium text-navy-800', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-navy-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
  hideLabel?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, hideLabel, options, placeholder, id, className, ...props },
  ref,
) {
  const generated = useId()
  const selectId = id ?? generated
  return (
    <FieldShell id={selectId} label={label} error={error} hint={hint} hideLabel={hideLabel}>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={cn(
          fieldClass,
          'h-11 pr-8',
          error ? 'border-red-600' : 'border-navy-200',
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className, rows = 3, ...props },
  ref,
) {
  const generated = useId()
  const areaId = id ?? generated
  return (
    <FieldShell id={areaId} label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${areaId}-error` : hint ? `${areaId}-hint` : undefined}
        className={cn(
          fieldClass,
          'py-2.5',
          error ? 'border-red-600' : 'border-navy-200',
          className,
        )}
        {...props}
      />
    </FieldShell>
  )
})

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      className={cn(
        'size-5 shrink-0 cursor-pointer rounded-md border-2 border-navy-300 accent-sage-600 disabled:cursor-not-allowed',
        className,
      )}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-navy-900">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-navy-500">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-sage-600' : 'bg-navy-200',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function ProgressBar({
  value,
  label,
  className,
  tone = 'sage',
}: {
  /** 0–100 */
  value: number
  label: string
  className?: string
  tone?: 'sage' | 'navy' | 'amber'
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const fill = { sage: 'bg-sage-500', navy: 'bg-navy-700', amber: 'bg-amber-500' }[tone]
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-cream-200', className)}
    >
      <div
        className={cn('h-full rounded-full transition-all', fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

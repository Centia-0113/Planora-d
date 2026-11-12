import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Consistent max-width, heading and spacing for every in-app page. */
export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl', className)}>
      {(title || actions) && (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title && <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>}
            {description && <p className="mt-1 text-sm text-navy-500">{description}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
}

/**
 * Accessible modal built on the native dialog element.
 * The browser provides the focus trap and closes it on Escape.
 */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card bg-white p-0 text-navy-900 shadow-xl backdrop:bg-navy-950/40"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-navy-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            <X className="size-5" />
          </button>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-cream-300 bg-cream-50 px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  )
}

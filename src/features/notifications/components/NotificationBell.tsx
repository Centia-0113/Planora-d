import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { useMarkNotificationsRead, useNotifications } from '../api'
import { useBrowserNotifications } from '../useBrowserNotifications'

export function NotificationBell() {
  const { preferences } = useWorkspace()
  const notifications = useNotifications()
  const markRead = useMarkNotificationsRead()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useBrowserNotifications(notifications.data, preferences?.browser_enabled ?? false)

  const unread = (notifications.data ?? []).filter((n) => !n.read_at)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
        className="relative rounded-full p-2 text-navy-700 hover:bg-navy-50"
      >
        <Bell className="size-5" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-cream-300 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => markRead.mutate(undefined)}
                className="text-xs font-semibold text-sage-700 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {(notifications.data ?? []).slice(0, 8).map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read_at) markRead.mutate([n.id])
                    setOpen(false)
                    if (n.link) navigate(n.link)
                  }}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 text-left hover:bg-cream-50',
                    !n.read_at && 'bg-sage-50/60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.read_at ? 'bg-transparent' : 'bg-sage-500',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    {n.body && (
                      <span className="line-clamp-2 block text-xs text-navy-500">{n.body}</span>
                    )}
                    <span className="text-[11px] text-navy-400">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
            {(notifications.data?.length ?? 0) === 0 && (
              <li className="px-4 py-6 text-center text-sm text-navy-500">You’re all caught up.</li>
            )}
          </ul>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-cream-200 px-4 py-2.5 text-center text-sm font-semibold text-sage-700 hover:bg-cream-50"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  )
}

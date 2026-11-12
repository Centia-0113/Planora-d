import { useEffect, useRef } from 'react'
import type { AppNotification } from '@/types/database'

export function browserNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Show a system notification for newly arrived notifications while Planora is
 * open in a background tab. Requires the user's preference and browser permission.
 * (Closed-browser Web Push would need a service worker + push server; see docs.)
 */
export function useBrowserNotifications(
  notifications: AppNotification[] | undefined,
  enabled: boolean,
) {
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!notifications) return
    // First load: remember what already exists, don't notify for it.
    if (seen.current === null) {
      seen.current = new Set(notifications.map((n) => n.id))
      return
    }
    const fresh = notifications.filter((n) => !seen.current!.has(n.id) && !n.read_at)
    for (const n of notifications) seen.current.add(n.id)

    if (
      !enabled ||
      !fresh.length ||
      !browserNotificationsSupported() ||
      Notification.permission !== 'granted' ||
      document.visibilityState === 'visible'
    ) {
      return
    }
    for (const n of fresh.slice(0, 3)) {
      const notification = new Notification(n.title, {
        body: n.body ?? undefined,
        tag: n.id,
        icon: '/favicon.svg',
      })
      notification.onclick = () => {
        window.focus()
        if (n.link) window.location.assign(n.link)
      }
    }
  }, [notifications, enabled])
}

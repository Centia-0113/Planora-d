import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  Clock,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Badge, Button, Card, EmptyState, ErrorState, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDateTime, timeAgo } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import {
  useDeleteNotification,
  useDeleteReminder,
  useMarkNotificationsRead,
  useNotifications,
  useReminders,
  useUpdateReminderStatus,
} from '@/features/notifications/api'
import { ReminderFormModal } from '@/features/notifications/components/ReminderFormModal'
import { useTasks } from '@/features/tasks/api'
import { useWorkspace } from '@/features/workspace/workspace-context'
import type { NotificationType, Reminder } from '@/types/database'

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  reminder: BellRing,
  task_overdue: AlertTriangle,
  task_due_soon: CalendarClock,
  plan_ready: Sparkles,
  plan_failed: XCircle,
  system: Bell,
}

export function NotificationsPage() {
  const [tab, setTab] = useState<'notifications' | 'reminders'>('notifications')
  return (
    <PageContainer title="Notifications" description="Deadline alerts, reminders and updates.">
      <div role="tablist" aria-label="Notifications" className="mb-5 flex gap-1">
        {(['notifications', 'reminders'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold capitalize',
              tab === t ? 'bg-navy-800 text-cream-50' : 'text-navy-600 hover:bg-navy-50',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'notifications' ? <NotificationList /> : <ReminderManager />}
    </PageContainer>
  )
}

function NotificationList() {
  const notifications = useNotifications()
  const markRead = useMarkNotificationsRead()
  const remove = useDeleteNotification()
  const navigate = useNavigate()
  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length

  if (notifications.isPending) return <Spinner label="Loading notifications" />
  if (notifications.isError)
    return (
      <ErrorState
        message={errorMessage(notifications.error)}
        onRetry={() => void notifications.refetch()}
      />
    )
  if (!notifications.data.length) {
    return (
      <EmptyState
        icon={<Bell className="size-6" aria-hidden />}
        title="You’re all caught up"
        description="Reminders, overdue alerts and AI plan updates will appear here."
      />
    )
  }

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3">
        <p className="text-sm text-navy-600">{unread} unread</p>
        <Button
          variant="ghost"
          size="sm"
          disabled={!unread}
          loading={markRead.isPending}
          leftIcon={<CheckCheck className="size-4" aria-hidden />}
          onClick={() => markRead.mutate(undefined)}
        >
          Mark all as read
        </Button>
      </div>
      <ul className="divide-y divide-cream-200">
        {notifications.data.map((n) => {
          const Icon = TYPE_ICON[n.type]
          return (
            <li
              key={n.id}
              className={cn(
                'group flex items-start gap-3 px-5 py-4',
                !n.read_at && 'bg-sage-50/50',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full',
                  n.type === 'task_overdue' || n.type === 'plan_failed'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-sage-100 text-sage-700',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  if (!n.read_at) markRead.mutate([n.id])
                  if (n.link) navigate(n.link)
                }}
              >
                <span
                  className={cn('block text-sm', n.read_at ? 'text-navy-700' : 'font-semibold')}
                >
                  {n.title}
                </span>
                {n.body && <span className="mt-0.5 block text-sm text-navy-500">{n.body}</span>}
                <span className="mt-1 block text-xs text-navy-400">
                  {timeAgo(n.created_at)}
                  {n.email_status === 'sent' && ' · emailed'}
                </span>
              </button>
              {!n.read_at && (
                <button
                  type="button"
                  onClick={() => markRead.mutate([n.id])}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-sage-700 hover:bg-white"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => remove.mutate(n.id)}
                className="rounded-lg p-1.5 text-navy-300 hover:text-red-700"
                aria-label={`Delete notification ${n.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function ReminderManager() {
  const { timezone } = useWorkspace()
  const reminders = useReminders()
  const tasks = useTasks()
  const remove = useDeleteReminder()
  const setStatus = useUpdateReminderStatus()
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null)
  const taskTitle = new Map((tasks.data ?? []).map((t) => [t.id, t.title]))
  const upcoming = (reminders.data ?? []).filter((r) => r.status === 'scheduled')
  const past = (reminders.data ?? []).filter((r) => r.status !== 'scheduled').reverse()

  if (reminders.isPending) return <Spinner label="Loading reminders" />
  if (reminders.isError)
    return (
      <ErrorState
        message={errorMessage(reminders.error)}
        onRetry={() => void reminders.refetch()}
      />
    )

  const row = (r: Reminder) => (
    <li key={r.id} className="flex items-start gap-3 px-5 py-4">
      <Clock
        className={cn(
          'mt-0.5 size-5 shrink-0',
          r.status === 'scheduled' ? 'text-sage-600' : 'text-navy-300',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{r.title}</p>
        <p className="text-xs text-navy-500">
          {formatDateTime(r.remind_at, timezone)}
          {r.task_id && taskTitle.get(r.task_id) && ` · Task: ${taskTitle.get(r.task_id)}`}
        </p>
        {r.note && <p className="mt-1 text-xs text-navy-500">{r.note}</p>}
      </div>
      {r.status !== 'scheduled' && (
        <Badge tone={r.status === 'sent' ? 'sage' : 'cream'}>
          {r.status === 'sent' ? 'Sent' : 'Dismissed'}
        </Badge>
      )}
      {r.status === 'scheduled' && (
        <>
          <button
            type="button"
            onClick={() => setEditing(r)}
            className="rounded-lg p-1.5 text-navy-400 hover:text-navy-700"
            aria-label={`Edit ${r.title}`}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setStatus.mutate({ id: r.id, status: 'dismissed' })}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-navy-500 hover:bg-cream-50"
          >
            Dismiss
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => remove.mutate(r.id)}
        className="rounded-lg p-1.5 text-navy-300 hover:text-red-700"
        aria-label={`Delete ${r.title}`}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button
          leftIcon={<Plus className="size-4" aria-hidden />}
          onClick={() => setEditing('new')}
        >
          New reminder
        </Button>
      </div>
      <Card className="p-0">
        <p className="border-b border-cream-200 px-5 py-3 text-sm font-semibold">
          Upcoming ({upcoming.length})
        </p>
        {upcoming.length ? (
          <ul className="divide-y divide-cream-200">{upcoming.map(row)}</ul>
        ) : (
          <p className="px-5 py-6 text-sm text-navy-500">
            No upcoming reminders. Add one here or from a task.
          </p>
        )}
      </Card>
      {past.length > 0 && (
        <Card className="p-0">
          <p className="border-b border-cream-200 px-5 py-3 text-sm font-semibold">Past</p>
          <ul className="divide-y divide-cream-200">{past.slice(0, 30).map(row)}</ul>
        </Card>
      )}
      {editing && (
        <ReminderFormModal
          onClose={() => setEditing(null)}
          reminder={editing === 'new' ? undefined : editing}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { BellRing, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { formatDateTime } from '@/lib/dates'
import type { Reminder } from '@/types/database'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { useDeleteReminder, useReminders } from '../api'
import { ReminderFormModal } from './ReminderFormModal'

/** Reminders attached to a task or event, with add / edit / delete. */
export function ReminderList({
  taskId,
  eventId,
  defaultTitle,
  anchorDate,
}: {
  taskId?: string
  eventId?: string
  defaultTitle: string
  anchorDate?: string | null
}) {
  const { timezone } = useWorkspace()
  const reminders = useReminders()
  const remove = useDeleteReminder()
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null)

  const list = (reminders.data ?? []).filter((r) =>
    taskId ? r.task_id === taskId : eventId ? r.event_id === eventId : false,
  )

  return (
    <div>
      {list.length === 0 ? (
        <p className="text-sm text-navy-500">No reminders set.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl bg-cream-50 px-3 py-2">
              <BellRing className="size-4 shrink-0 text-sage-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-navy-500">{formatDateTime(r.remind_at, timezone)}</p>
              </div>
              {r.status !== 'scheduled' && (
                <Badge tone={r.status === 'sent' ? 'sage' : 'cream'}>{r.status}</Badge>
              )}
              <button
                type="button"
                onClick={() => setEditing(r)}
                className="rounded-lg p-1.5 text-navy-400 hover:bg-white hover:text-navy-700"
                aria-label={`Edit reminder ${r.title}`}
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => remove.mutate(r.id)}
                className="rounded-lg p-1.5 text-navy-400 hover:bg-white hover:text-red-700"
                aria-label={`Delete reminder ${r.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2"
        leftIcon={<Plus className="size-4" aria-hidden />}
        onClick={() => setEditing('new')}
      >
        Add reminder
      </Button>
      {editing && (
        <ReminderFormModal
          onClose={() => setEditing(null)}
          reminder={editing === 'new' ? undefined : editing}
          taskId={taskId ?? null}
          eventId={eventId ?? null}
          defaultTitle={defaultTitle}
          anchorDate={anchorDate}
        />
      )}
    </div>
  )
}

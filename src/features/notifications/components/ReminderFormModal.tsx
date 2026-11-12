import { useState, type FormEvent } from 'react'
import { Alert, Button, Input, Modal, Textarea } from '@/components/ui'
import { addDays, utcToZoned, zonedToUtc } from '@/lib/dates'
import { emptyToNull, errorMessage } from '@/lib/query'
import type { Reminder } from '@/types/database'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { useSaveReminder } from '../api'

interface ReminderFormModalProps {
  onClose: () => void
  reminder?: Reminder
  /** Link a new reminder to a task or event. */
  taskId?: string | null
  eventId?: string | null
  defaultTitle?: string
  /** Suggested date for a new reminder (e.g. the task's due date). */
  anchorDate?: string | null
}

export function ReminderFormModal({
  onClose,
  reminder,
  taskId = null,
  eventId = null,
  defaultTitle = '',
  anchorDate,
}: ReminderFormModalProps) {
  const { timezone, today, preferences } = useWorkspace()
  const save = useSaveReminder()

  const [initial] = useState(() => {
    if (reminder) return utcToZoned(reminder.remind_at, timezone)
    // Default: the configured lead time before 09:00 on the anchor date, or tomorrow at 09:00.
    const base = anchorDate && anchorDate >= today ? anchorDate : addDays(today, 1)
    const leadMinutes = preferences?.default_reminder_minutes ?? 60
    const at = new Date(
      new Date(zonedToUtc(base, '09:00', timezone)).getTime() - leadMinutes * 60_000,
    )
    const zoned = utcToZoned(at.toISOString(), timezone)
    return at.getTime() > Date.now() ? zoned : { date: base, time: '09:00' }
  })

  const [title, setTitle] = useState(reminder?.title ?? defaultTitle)
  const [note, setNote] = useState(reminder?.note ?? '')
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [errors, setErrors] = useState<{ title?: string; when?: string }>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!title.trim()) next.title = 'Give the reminder a title.'
    if (!date || !time) next.when = 'Choose a date and time.'
    const remindAt = date && time ? zonedToUtc(date, time, timezone) : ''
    if (remindAt && new Date(remindAt).getTime() < Date.now() - 60_000) {
      next.when = 'Choose a time in the future.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    await save.mutateAsync({
      id: reminder?.id,
      input: {
        title: title.trim(),
        note: emptyToNull(note),
        remind_at: remindAt,
        task_id: reminder ? reminder.task_id : taskId,
        event_id: reminder ? reminder.event_id : eventId,
      },
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={reminder ? 'Edit reminder' : 'New reminder'}
      description={`Times are in ${timezone}.`}
    >
      <form
        onSubmit={(e) => void handleSubmit(e).catch(() => undefined)}
        noValidate
        className="flex flex-col gap-4"
      >
        {save.error && <Alert>{errorMessage(save.error)}</Alert>}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          maxLength={200}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            error={errors.when}
          />
        </div>
        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {reminder ? 'Save reminder' : 'Set reminder'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

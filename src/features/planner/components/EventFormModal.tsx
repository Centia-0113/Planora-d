import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Alert, Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { emptyToNull, errorMessage } from '@/lib/query'
import type { EventCategory, PlannerEvent } from '@/types/database'
import { ReminderList } from '@/features/notifications/components/ReminderList'
import { EVENT_CATEGORY_LABELS, useDeleteEvent, useSaveEvent } from '../api'

export function EventFormModal({
  event,
  defaultDate,
  onClose,
}: {
  event?: PlannerEvent
  defaultDate: string
  onClose: () => void
}) {
  const save = useSaveEvent()
  const remove = useDeleteEvent()
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [date, setDate] = useState(event?.event_date ?? defaultDate)
  const [start, setStart] = useState(event?.start_time?.slice(0, 5) ?? '')
  const [end, setEnd] = useState(event?.end_time?.slice(0, 5) ?? '')
  const [category, setCategory] = useState<EventCategory>(event?.category ?? 'personal')
  const [errors, setErrors] = useState<{ title?: string; date?: string; end?: string }>({})
  const busy = save.isPending || remove.isPending

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!title.trim()) next.title = 'Give the event a title.'
    if (!date) next.date = 'Choose a date.'
    if (start && end && end < start) next.end = 'The end time must be after the start time.'
    setErrors(next)
    if (Object.keys(next).length) return
    await save.mutateAsync({
      id: event?.id,
      input: {
        title: title.trim().slice(0, 200),
        description: emptyToNull(description),
        event_date: date,
        start_time: emptyToNull(start),
        end_time: emptyToNull(end),
        category,
      },
    })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={event ? 'Edit event' : 'New event'}>
      <form
        onSubmit={(e) => void handleSubmit(e).catch(() => undefined)}
        noValidate
        className="flex flex-col gap-4"
      >
        {(save.error || remove.error) && <Alert>{errorMessage(save.error ?? remove.error)}</Alert>}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          autoFocus
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            options={Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Input
            label="Start time (optional)"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            label="End time (optional)"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            error={errors.end}
          />
        </div>
        <Textarea
          label="Notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        {event && (
          <div className="rounded-xl border border-cream-300 p-3">
            <p className="mb-2 text-sm font-semibold">Reminders</p>
            <ReminderList
              eventId={event.id}
              defaultTitle={event.title}
              anchorDate={event.event_date}
            />
          </div>
        )}
        <div className="flex justify-between gap-2">
          {event ? (
            <Button
              variant="ghost"
              disabled={busy}
              leftIcon={<Trash2 className="size-4" aria-hidden />}
              onClick={() => remove.mutate(event.id, { onSuccess: onClose })}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {event ? 'Save' : 'Add event'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

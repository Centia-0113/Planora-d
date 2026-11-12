import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CornerDownRight, ListChecks, Plus, Trash2 } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  ProgressBar,
  Spinner,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { addDays, formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import {
  useAddChecklistItem,
  useCarryOverChecklist,
  useChecklist,
  useDeleteChecklistItem,
  useUpdateChecklistItem,
} from '@/features/planner/api'
import { checklistCompletion } from '@/features/planner/calendar'
import { useWorkspace } from '@/features/workspace/workspace-context'

export function ChecklistPage() {
  const { today } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') ? params.get('date')! : today
  const previous = addDays(date, -1)

  const items = useChecklist(date)
  const previousItems = useChecklist(previous)
  const add = useAddChecklistItem()
  const update = useUpdateChecklistItem()
  const remove = useDeleteChecklistItem()
  const carryOver = useCarryOverChecklist()

  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const list = items.data ?? []
  const completion = checklistCompletion(list)
  const unfinishedYesterday = (previousItems.data ?? []).filter(
    (p) => !p.is_completed && !list.some((i) => i.title === p.title),
  )
  const go = (d: string) => setParams(d === today ? {} : { date: d }, { replace: true })
  const mutationError = add.error ?? update.error ?? remove.error ?? carryOver.error

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = title.trim()
    if (!value) return
    add.mutate(
      { date, title: value.slice(0, 200), position: list.length },
      { onSuccess: () => setTitle('') },
    )
  }

  function saveEdit(id: string) {
    const value = editTitle.trim()
    if (value) update.mutate({ id, patch: { title: value.slice(0, 200) } })
    setEditingId(null)
  }

  const label =
    date === today
      ? 'Today'
      : date === addDays(today, -1)
        ? 'Yesterday'
        : date === addDays(today, 1)
          ? 'Tomorrow'
          : null

  return (
    <PageContainer
      title="Daily Checklist"
      description="The activities that need your attention each day."
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go(addDays(date, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-44 text-center">
              <p className="font-heading text-lg font-bold">
                {label ?? formatDate(date, { weekday: 'long' })}
              </p>
              <p className="text-xs text-navy-500">
                {formatDate(date, {
                  weekday: label ? 'long' : undefined,
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go(addDays(date, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {date !== today && (
              <Button variant="secondary" size="sm" onClick={() => go(today)}>
                Today
              </Button>
            )}
            <label htmlFor="checklist-date" className="sr-only">
              Go to date
            </label>
            <input
              id="checklist-date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && go(e.target.value)}
              className="h-9 rounded-xl border border-navy-200 bg-white px-2 text-sm"
            />
          </div>
        </div>

        <Card>
          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-sm font-semibold">
                {completion.done} of {completion.total} done
              </p>
              <p className="font-heading text-2xl font-extrabold text-sage-700">
                {completion.percent}%
              </p>
            </div>
            <ProgressBar value={completion.percent} label="Daily completion" />
          </div>

          {mutationError && (
            <div className="mb-4">
              <Alert>{errorMessage(mutationError)}</Alert>
            </div>
          )}

          <form onSubmit={submit} className="mb-4 flex gap-2">
            <label htmlFor="new-activity" className="sr-only">
              New activity
            </label>
            <input
              id="new-activity"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add an activity…"
              maxLength={200}
              className="h-11 flex-1 rounded-xl border border-navy-200 px-3.5 text-sm focus:border-sage-500 focus:ring-2 focus:ring-sage-200 focus:outline-none"
            />
            <Button
              type="submit"
              loading={add.isPending}
              leftIcon={<Plus className="size-4" aria-hidden />}
            >
              Add
            </Button>
          </form>

          {items.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner label="Loading checklist" />
            </div>
          ) : items.isError ? (
            <ErrorState message={errorMessage(items.error)} onRetry={() => void items.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="size-6" aria-hidden />}
              title="Nothing on the list"
              description="Add the activities you want to get done on this day."
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {list.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream-50"
                >
                  <Checkbox
                    checked={item.is_completed}
                    onChange={(checked) =>
                      update.mutate({ id: item.id, patch: { is_completed: checked } })
                    }
                    label={`Mark "${item.title}" ${item.is_completed ? 'not done' : 'done'}`}
                  />
                  {editingId === item.id ? (
                    <input
                      autoFocus
                      aria-label="Activity title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveEdit(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(item.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="h-9 flex-1 rounded-lg border border-navy-200 px-2 text-sm focus:border-sage-500 focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id)
                        setEditTitle(item.title)
                      }}
                      className={cn(
                        'flex-1 text-left text-sm',
                        item.is_completed && 'text-navy-400 line-through',
                      )}
                      aria-label={`Edit ${item.title}`}
                    >
                      {item.title}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove.mutate(item.id)}
                    className="rounded-lg p-1.5 text-navy-300 hover:text-red-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    aria-label={`Remove ${item.title}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {unfinishedYesterday.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl bg-cream-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-navy-700">
                {unfinishedYesterday.length} unfinished{' '}
                {unfinishedYesterday.length === 1 ? 'activity' : 'activities'} from{' '}
                {formatDate(previous, { day: 'numeric', month: 'short' })}.
              </p>
              <Button
                variant="secondary"
                size="sm"
                loading={carryOver.isPending}
                leftIcon={<CornerDownRight className="size-4" aria-hidden />}
                onClick={() =>
                  carryOver.mutate({
                    items: unfinishedYesterday,
                    toDate: date,
                    startPosition: list.length,
                  })
                }
              >
                Carry them over
              </Button>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}

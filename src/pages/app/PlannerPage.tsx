import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Flag,
  Plus,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button, ErrorState, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import {
  addMonths,
  formatDate,
  formatMonth,
  monthGrid,
  startOfMonth,
  weekdayLabels,
} from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import { EVENT_CATEGORY_LABELS, useEvents } from '@/features/planner/api'
import { buildCalendarEntries, type CalendarEntry } from '@/features/planner/calendar'
import { EventFormModal } from '@/features/planner/components/EventFormModal'
import { useMilestones, useProjects } from '@/features/projects/api'
import { useTasks } from '@/features/tasks/api'
import { useWorkspace } from '@/features/workspace/workspace-context'
import type { EventCategory, PlannerEvent } from '@/types/database'

const EVENT_COLORS: Record<EventCategory, string> = {
  personal: 'bg-sage-100 text-sage-800',
  academic: 'bg-blue-100 text-blue-800',
  work: 'bg-navy-100 text-navy-800',
  meeting: 'bg-amber-100 text-amber-900',
  deadline: 'bg-red-100 text-red-800',
  other: 'bg-slate-100 text-slate-700',
}

const DOT_COLORS = {
  event: 'bg-sage-500',
  task: 'bg-navy-600',
  milestone: 'bg-purple-600',
  project_end: 'bg-red-600',
}

export function PlannerPage() {
  const { today, weekStartsOn } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const selected =
    params.get('date') && /^\d{4}-\d{2}-\d{2}$/.test(params.get('date')!)
      ? params.get('date')!
      : today
  const month = startOfMonth(selected)
  const weeks = useMemo(() => monthGrid(month, weekStartsOn), [month, weekStartsOn])
  const range = { from: weeks[0][0], to: weeks.at(-1)!.at(-1)! }

  const events = useEvents(range.from, range.to)
  const tasks = useTasks()
  const milestones = useMilestones()
  const projects = useProjects()
  const [eventForm, setEventForm] = useState<{ event?: PlannerEvent; date: string } | null>(null)

  const entries = useMemo(
    () =>
      buildCalendarEntries(
        {
          events: events.data ?? [],
          tasks: tasks.data ?? [],
          milestones: milestones.data ?? [],
          projects: projects.data ?? [],
        },
        range,
        today,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events.data, tasks.data, milestones.data, projects.data, range.from, range.to, today],
  )

  const select = (date: string) => setParams({ date }, { replace: true })
  const selectedEntries = entries.get(selected) ?? []

  return (
    <PageContainer
      title="Monthly Planner"
      description="Events, task deadlines and project milestones in one calendar."
      actions={
        <Button
          leftIcon={<Plus className="size-4" aria-hidden />}
          onClick={() => setEventForm({ date: selected })}
        >
          New event
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="rounded-card border border-cream-300 bg-white p-3 shadow-card sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold" aria-live="polite">
              {formatMonth(month)}
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => select(addMonths(month, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => select(today)}>
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => select(addMonths(month, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {events.isError ? (
            <ErrorState
              message={errorMessage(events.error)}
              onRetry={() => void events.refetch()}
            />
          ) : (
            <div role="grid" aria-label={formatMonth(month)} className="relative">
              {events.isPending && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                  <Spinner label="Loading calendar" />
                </div>
              )}
              <div role="row" className="grid grid-cols-7 border-b border-cream-200 pb-2">
                {weekdayLabels(weekStartsOn).map((d) => (
                  <div
                    key={d}
                    role="columnheader"
                    className="text-center text-xs font-semibold text-navy-500 uppercase"
                  >
                    {d}
                  </div>
                ))}
              </div>
              {weeks.map((week) => (
                <div role="row" key={week[0]} className="grid grid-cols-7">
                  {week.map((date) => {
                    const dayEntries = entries.get(date) ?? []
                    const inMonth = date.slice(0, 7) === month.slice(0, 7)
                    const isToday = date === today
                    const isSelected = date === selected
                    return (
                      <button
                        key={date}
                        role="gridcell"
                        aria-selected={isSelected}
                        aria-label={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${dayEntries.length} items`}
                        onClick={() => select(date)}
                        className={cn(
                          'flex min-h-16 flex-col items-stretch gap-1 border-b border-cream-100 p-1 text-left transition-colors sm:min-h-24 sm:p-1.5',
                          isSelected
                            ? 'bg-sage-50 ring-2 ring-sage-400 ring-inset'
                            : 'hover:bg-cream-50',
                          !inMonth && 'opacity-45',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-6 items-center justify-center self-start rounded-full text-xs font-semibold sm:size-7 sm:text-sm',
                            isToday ? 'bg-navy-800 text-cream-50' : 'text-navy-700',
                          )}
                        >
                          {Number(date.slice(8))}
                        </span>
                        {/* Mobile: dots. Desktop: labels. */}
                        <span className="flex flex-wrap gap-0.5 sm:hidden">
                          {dayEntries.slice(0, 4).map((e) => (
                            <span
                              key={`${e.kind}-${e.id}`}
                              className={cn('size-1.5 rounded-full', DOT_COLORS[e.kind])}
                            />
                          ))}
                        </span>
                        <span className="hidden flex-col gap-0.5 sm:flex">
                          {dayEntries.slice(0, 3).map((e) => (
                            <EntryChip key={`${e.kind}-${e.id}`} entry={e} />
                          ))}
                          {dayEntries.length > 3 && (
                            <span className="px-1 text-[11px] font-medium text-navy-500">
                              +{dayEntries.length - 3} more
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-navy-600">
            <Legend color={DOT_COLORS.event} label="Event" />
            <Legend color={DOT_COLORS.task} label="Task deadline" />
            <Legend color={DOT_COLORS.milestone} label="Milestone" />
            <Legend color={DOT_COLORS.project_end} label="Project end" />
          </div>
        </div>

        <aside
          className="rounded-card border border-cream-300 bg-white p-5 shadow-card"
          aria-label="Selected day"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-bold">
              {formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEventForm({ date: selected })}
              aria-label="Add event on this day"
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-navy-500">
              Nothing planned. Add an event or a task with this due date.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedEntries.map((e) => (
                <li key={`${e.kind}-${e.id}`}>
                  <DayEntry
                    entry={e}
                    onEditEvent={(event) => setEventForm({ event, date: event.event_date })}
                  />
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/checklist?date=${selected}`}
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sage-700 hover:underline"
          >
            <CheckSquare className="size-4" aria-hidden /> Open this day’s checklist
          </Link>
        </aside>
      </div>

      {eventForm && (
        <EventFormModal
          event={eventForm.event}
          defaultDate={eventForm.date}
          onClose={() => setEventForm(null)}
        />
      )}
    </PageContainer>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', color)} /> {label}
    </span>
  )
}

function EntryChip({ entry }: { entry: CalendarEntry }) {
  const base = 'truncate rounded px-1 py-0.5 text-[11px] leading-tight font-medium'
  switch (entry.kind) {
    case 'event':
      return (
        <span className={cn(base, EVENT_COLORS[entry.event.category])}>
          {entry.time && `${entry.time} `}
          {entry.title}
        </span>
      )
    case 'task':
      return (
        <span
          className={cn(
            base,
            entry.completed
              ? 'text-navy-400 line-through'
              : entry.overdue
                ? 'bg-red-50 text-red-700'
                : 'bg-navy-50 text-navy-800',
          )}
        >
          {entry.title}
        </span>
      )
    case 'milestone':
      return (
        <span
          className={cn(
            base,
            'bg-purple-50 text-purple-800',
            entry.completed && 'line-through opacity-60',
          )}
        >
          ◆ {entry.title}
        </span>
      )
    case 'project_end':
      return <span className={cn(base, 'bg-red-50 text-red-800')}>⚑ {entry.title}</span>
  }
}

function DayEntry({
  entry,
  onEditEvent,
}: {
  entry: CalendarEntry
  onEditEvent: (e: PlannerEvent) => void
}) {
  const row =
    'flex w-full items-start gap-3 rounded-xl border border-cream-200 p-3 text-left text-sm hover:border-sage-300 hover:bg-cream-50'
  switch (entry.kind) {
    case 'event':
      return (
        <button type="button" className={row} onClick={() => onEditEvent(entry.event)}>
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-sage-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{entry.title}</span>
            <span className="text-xs text-navy-500">
              {EVENT_CATEGORY_LABELS[entry.event.category]}
              {entry.time &&
                ` · ${entry.time}${entry.event.end_time ? `–${entry.event.end_time.slice(0, 5)}` : ''}`}
            </span>
          </span>
        </button>
      )
    case 'task':
      return (
        <Link to={`/tasks/${entry.id}`} className={row}>
          <CheckSquare
            className={cn(
              'mt-0.5 size-4 shrink-0',
              entry.overdue ? 'text-red-600' : 'text-navy-600',
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span
              className={cn('block font-medium', entry.completed && 'text-navy-400 line-through')}
            >
              {entry.title}
            </span>
            <span className={cn('text-xs', entry.overdue ? 'text-red-700' : 'text-navy-500')}>
              Task deadline{entry.overdue && ' · overdue'}
            </span>
          </span>
        </Link>
      )
    case 'milestone':
      return (
        <Link to={`/projects/${entry.projectId}`} className={row}>
          <Diamond className="mt-0.5 size-4 shrink-0 text-purple-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span
              className={cn('block font-medium', entry.completed && 'text-navy-400 line-through')}
            >
              {entry.title}
            </span>
            <span className="text-xs text-navy-500">Milestone · {entry.projectName}</span>
          </span>
        </Link>
      )
    case 'project_end':
      return (
        <Link to={`/projects/${entry.projectId}`} className={row}>
          <Flag className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{entry.title}</span>
            <span className="text-xs text-navy-500">Project deadline</span>
          </span>
        </Link>
      )
  }
}

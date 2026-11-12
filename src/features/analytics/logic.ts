import {
  addDays,
  daysBetween,
  formatDate,
  startOfWeek,
  todayInTz,
  weekdayLabels,
} from '@/lib/dates'
import type { Task } from '@/types/database'

export type RangeKey = '7d' | '30d' | '90d' | '365d'

export const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '365d': 'Last 12 months',
}

export function rangeFor(key: RangeKey, today: string): { from: string; to: string } {
  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[key]
  return { from: addDays(today, -(days - 1)), to: today }
}

/** The calendar date (in the user's timezone) on which a task was completed. */
export function completionDate(task: Pick<Task, 'completed_at'>, timeZone: string): string | null {
  return task.completed_at ? todayInTz(timeZone, new Date(task.completed_at)) : null
}

export interface TrendPoint {
  label: string
  start: string
  completed: number
  created: number
}

/** Completed vs created tasks, bucketed by day (≤31 days) or by week. */
export function completionTrend(
  tasks: Task[],
  range: { from: string; to: string },
  timeZone: string,
  weekStartsOn: 0 | 1 = 1,
): TrendPoint[] {
  const span = daysBetween(range.from, range.to) + 1
  const byWeek = span > 31
  const bucketOf = (date: string) => (byWeek ? startOfWeek(date, weekStartsOn) : date)

  const points = new Map<string, TrendPoint>()
  let cursor = bucketOf(range.from)
  while (cursor <= range.to) {
    points.set(cursor, {
      start: cursor,
      label: formatDate(
        cursor,
        byWeek ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' },
      ),
      completed: 0,
      created: 0,
    })
    cursor = addDays(cursor, byWeek ? 7 : 1)
  }

  for (const t of tasks) {
    const done = completionDate(t, timeZone)
    if (done && done >= range.from && done <= range.to) {
      const p = points.get(bucketOf(done))
      if (p) p.completed++
    }
    const created = todayInTz(timeZone, new Date(t.created_at))
    if (created >= range.from && created <= range.to) {
      const p = points.get(bucketOf(created))
      if (p) p.created++
    }
  }
  return [...points.values()]
}

export interface StatusSlice {
  key: 'completed' | 'in_progress' | 'todo' | 'overdue'
  label: string
  value: number
}

export function statusDistribution(tasks: Task[], today: string): StatusSlice[] {
  const counts = { completed: 0, in_progress: 0, todo: 0, overdue: 0 }
  for (const t of tasks) {
    if (t.status === 'completed') counts.completed++
    else if (t.due_date && t.due_date < today) counts.overdue++
    else if (t.status === 'in_progress') counts.in_progress++
    else counts.todo++
  }
  return [
    { key: 'completed', label: 'Completed', value: counts.completed },
    { key: 'in_progress', label: 'In progress', value: counts.in_progress },
    { key: 'todo', label: 'To do', value: counts.todo },
    { key: 'overdue', label: 'Overdue', value: counts.overdue },
  ]
}

/** Tasks completed on each day of the current week. */
export function weeklyProductivity(
  tasks: Task[],
  today: string,
  timeZone: string,
  weekStartsOn: 0 | 1 = 1,
) {
  const start = startOfWeek(today, weekStartsOn)
  const labels = weekdayLabels(weekStartsOn)
  const days = labels.map((label, i) => ({
    label,
    date: addDays(start, i),
    completed: 0,
    isFuture: false,
  }))
  for (const d of days) d.isFuture = d.date > today
  for (const t of tasks) {
    const done = completionDate(t, timeZone)
    const day = done ? days.find((d) => d.date === done) : undefined
    if (day) day.completed++
  }
  return days
}

/** Daily completion counts for a contribution-style heatmap. */
export function activityHeatmap(
  tasks: Task[],
  today: string,
  timeZone: string,
  weeks = 12,
  weekStartsOn: 0 | 1 = 1,
) {
  const end = today
  const start = startOfWeek(addDays(today, -(weeks * 7 - 1)), weekStartsOn)
  const counts = new Map<string, number>()
  for (const t of tasks) {
    const done = completionDate(t, timeZone)
    if (done && done >= start && done <= end) counts.set(done, (counts.get(done) ?? 0) + 1)
  }
  const columns: { date: string; count: number; future: boolean }[][] = []
  let cursor = start
  while (cursor <= end) {
    const col = []
    for (let i = 0; i < 7; i++) {
      col.push({ date: cursor, count: counts.get(cursor) ?? 0, future: cursor > end })
      cursor = addDays(cursor, 1)
    }
    columns.push(col)
  }
  const activeDays = [...counts.values()].filter((c) => c > 0).length

  // Current streak: consecutive days up to today (or yesterday) with a completion.
  let streak = 0
  let day = counts.get(today) ? today : addDays(today, -1)
  while (counts.get(day)) {
    streak++
    day = addDays(day, -1)
  }
  return { columns, activeDays, streak, max: Math.max(0, ...counts.values()) }
}

/** Share of tasks due within the range that were completed. */
export function completionRateInRange(tasks: Task[], range: { from: string; to: string }) {
  const due = tasks.filter((t) => t.due_date && t.due_date >= range.from && t.due_date <= range.to)
  const done = due.filter((t) => t.status === 'completed').length
  return { due: due.length, done, percent: due.length ? Math.round((done / due.length) * 100) : 0 }
}

export function completedInRange(
  tasks: Task[],
  range: { from: string; to: string },
  timeZone: string,
) {
  return tasks.filter((t) => {
    const d = completionDate(t, timeZone)
    return d !== null && d >= range.from && d <= range.to
  }).length
}

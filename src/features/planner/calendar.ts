import type { Milestone, PlannerEvent, Project, Task } from '@/types/database'

export type CalendarEntry =
  | {
      kind: 'event'
      id: string
      date: string
      title: string
      time: string | null
      event: PlannerEvent
    }
  | {
      kind: 'task'
      id: string
      date: string
      title: string
      completed: boolean
      overdue: boolean
      task: Task
    }
  | {
      kind: 'milestone'
      id: string
      date: string
      title: string
      completed: boolean
      projectId: string
      projectName: string
    }
  | { kind: 'project_end'; id: string; date: string; title: string; projectId: string }

/** Merge events, task deadlines, milestones and project end dates into one date-keyed map. */
export function buildCalendarEntries(
  {
    events,
    tasks,
    milestones,
    projects,
  }: { events: PlannerEvent[]; tasks: Task[]; milestones: Milestone[]; projects: Project[] },
  range: { from: string; to: string },
  today: string,
): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>()
  const inRange = (d: string | null): d is string => d !== null && d >= range.from && d <= range.to
  const push = (entry: CalendarEntry) => {
    const list = map.get(entry.date)
    if (list) list.push(entry)
    else map.set(entry.date, [entry])
  }
  const projectNames = new Map(projects.map((p) => [p.id, p.name]))

  for (const e of events) {
    if (inRange(e.event_date)) {
      push({
        kind: 'event',
        id: e.id,
        date: e.event_date,
        title: e.title,
        time: e.start_time?.slice(0, 5) ?? null,
        event: e,
      })
    }
  }
  for (const t of tasks) {
    if (inRange(t.due_date)) {
      push({
        kind: 'task',
        id: t.id,
        date: t.due_date,
        title: t.title,
        completed: t.status === 'completed',
        overdue: t.status !== 'completed' && t.due_date < today,
        task: t,
      })
    }
  }
  for (const m of milestones) {
    if (inRange(m.due_date)) {
      push({
        kind: 'milestone',
        id: m.id,
        date: m.due_date,
        title: m.title,
        completed: m.is_completed,
        projectId: m.project_id,
        projectName: projectNames.get(m.project_id) ?? 'Project',
      })
    }
  }
  for (const p of projects) {
    if (inRange(p.end_date) && p.status !== 'completed') {
      push({
        kind: 'project_end',
        id: p.id,
        date: p.end_date,
        title: `${p.name} ends`,
        projectId: p.id,
      })
    }
  }

  const order = { event: 0, project_end: 1, milestone: 2, task: 3 }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.kind !== b.kind) return order[a.kind] - order[b.kind]
      if (a.kind === 'event' && b.kind === 'event')
        return (a.time ?? '').localeCompare(b.time ?? '')
      return a.title.localeCompare(b.title)
    })
  }
  return map
}

export function checklistCompletion(items: { is_completed: boolean }[]) {
  const done = items.filter((i) => i.is_completed).length
  return {
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
  }
}

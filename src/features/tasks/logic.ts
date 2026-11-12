import { addDays } from '@/lib/dates'
import type { Subtask, Task, TaskPriority, TaskStatus } from '@/types/database'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Completed',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export type DueFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'no_date'
export type TaskSort = 'due_asc' | 'due_desc' | 'priority' | 'newest' | 'title'

export interface TaskFilters {
  search: string
  status: TaskStatus | 'all' | 'open'
  priority: TaskPriority | 'all'
  categoryId: string | 'all'
  projectId: string | 'all' | 'none'
  due: DueFilter
}

export const defaultFilters: TaskFilters = {
  search: '',
  status: 'open',
  priority: 'all',
  categoryId: 'all',
  projectId: 'all',
  due: 'all',
}

export function isOverdue(task: Pick<Task, 'status' | 'due_date'>, today: string): boolean {
  return task.status !== 'completed' && task.due_date !== null && task.due_date < today
}

export function filterTasks(tasks: Task[], f: TaskFilters, today: string): Task[] {
  const q = f.search.trim().toLowerCase()
  const weekAhead = addDays(today, 7)
  return tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q)) return false
    if (f.status === 'open' && t.status === 'completed') return false
    if (f.status !== 'all' && f.status !== 'open' && t.status !== f.status) return false
    if (f.priority !== 'all' && t.priority !== f.priority) return false
    if (f.categoryId !== 'all' && t.category_id !== f.categoryId) return false
    if (f.projectId === 'none' && t.project_id !== null) return false
    if (f.projectId !== 'all' && f.projectId !== 'none' && t.project_id !== f.projectId)
      return false
    switch (f.due) {
      case 'overdue':
        return isOverdue(t, today)
      case 'today':
        return t.due_date === today
      case 'upcoming':
        return t.due_date !== null && t.due_date > today && t.due_date <= weekAhead
      case 'no_date':
        return t.due_date === null
      default:
        return true
    }
  })
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const byDue = (a: Task, b: Task, dir: 1 | -1) => {
    if (a.due_date === b.due_date) return 0
    if (a.due_date === null) return 1 // undated last in both directions
    if (b.due_date === null) return -1
    return a.due_date < b.due_date ? -dir : dir
  }
  const sorted = [...tasks]
  sorted.sort((a, b) => {
    switch (sort) {
      case 'due_asc':
        return byDue(a, b, 1) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      case 'due_desc':
        return byDue(a, b, -1)
      case 'priority':
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b, 1)
      case 'title':
        return a.title.localeCompare(b.title)
      case 'newest':
      default:
        return b.created_at.localeCompare(a.created_at)
    }
  })
  return sorted
}

export interface TaskSummary {
  total: number
  completed: number
  pending: number
  overdue: number
  dueToday: number
  upcoming: number
  completionRate: number
}

export function summarizeTasks(tasks: Task[], today: string): TaskSummary {
  const weekAhead = addDays(today, 7)
  let completed = 0
  let overdue = 0
  let dueToday = 0
  let upcoming = 0
  for (const t of tasks) {
    if (t.status === 'completed') {
      completed++
      continue
    }
    if (!t.due_date) continue
    if (t.due_date < today) overdue++
    else if (t.due_date === today) dueToday++
    else if (t.due_date <= weekAhead) upcoming++
  }
  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    overdue,
    dueToday,
    upcoming,
    completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  }
}

export interface Progress {
  done: number
  total: number
  percent: number
}

export function subtaskProgress(subtasks: Pick<Subtask, 'is_completed'>[]): Progress {
  const total = subtasks.length
  const done = subtasks.filter((s) => s.is_completed).length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

/**
 * Parent task progress: completed tasks are 100%; otherwise the share of
 * completed subtasks (0% when there are none).
 */
export function taskProgress(
  task: Pick<Task, 'status'>,
  subtasks: Pick<Subtask, 'is_completed'>[],
): number {
  if (task.status === 'completed') return 100
  return subtaskProgress(subtasks).percent
}

export function groupSubtasksByTask(subtasks: Subtask[]): Map<string, Subtask[]> {
  const map = new Map<string, Subtask[]>()
  for (const s of subtasks) {
    const list = map.get(s.task_id)
    if (list) list.push(s)
    else map.set(s.task_id, [s])
  }
  return map
}

export interface TaskFormValues {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  category_id: string
  project_id: string
  start_date: string
  due_date: string
}

export function validateTaskForm(v: TaskFormValues): Partial<Record<keyof TaskFormValues, string>> {
  const errors: Partial<Record<keyof TaskFormValues, string>> = {}
  if (!v.title.trim()) errors.title = 'Give the task a title.'
  else if (v.title.trim().length > 200) errors.title = 'Titles can be up to 200 characters.'
  if (v.description.length > 5000) errors.description = 'Descriptions can be up to 5000 characters.'
  if (v.start_date && v.due_date && v.start_date > v.due_date) {
    errors.due_date = 'The due date cannot be before the start date.'
  }
  return errors
}

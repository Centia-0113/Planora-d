import { describe, expect, it } from 'vitest'
import type { Task } from '@/types/database'
import {
  defaultFilters,
  filterTasks,
  isOverdue,
  sortTasks,
  subtaskProgress,
  summarizeTasks,
  taskProgress,
  validateTaskForm,
} from './logic'

const TODAY = '2026-11-12'

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    workspace_id: 'ws',
    category_id: null,
    project_id: null,
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'medium',
    start_date: null,
    due_date: null,
    completed_at: null,
    assigned_to: null,
    created_by: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

const tasks = [
  task({ id: 'overdue', title: 'Submit report', due_date: '2026-11-10', priority: 'high' }),
  task({ id: 'today', title: 'Call supervisor', due_date: TODAY, priority: 'urgent' }),
  task({ id: 'soon', title: 'Draft slides', due_date: '2026-11-15', category_id: 'cat-a' }),
  task({ id: 'later', title: 'Plan holiday', due_date: '2026-12-20', priority: 'low' }),
  task({ id: 'nodate', title: 'Read book', project_id: 'p1' }),
  task({ id: 'done', title: 'Pay rent', status: 'completed', due_date: '2026-11-01' }),
]

describe('isOverdue', () => {
  it('is true only for unfinished tasks past their due date', () => {
    expect(isOverdue(tasks[0], TODAY)).toBe(true)
    expect(isOverdue(tasks[1], TODAY)).toBe(false)
    expect(isOverdue(tasks[5], TODAY)).toBe(false)
    expect(isOverdue(tasks[4], TODAY)).toBe(false)
  })
})

describe('summarizeTasks', () => {
  it('counts each bucket from the records', () => {
    expect(summarizeTasks(tasks, TODAY)).toEqual({
      total: 6,
      completed: 1,
      pending: 5,
      overdue: 1,
      dueToday: 1,
      upcoming: 1,
      completionRate: 17,
    })
  })

  it('handles an empty list', () => {
    expect(summarizeTasks([], TODAY).completionRate).toBe(0)
  })
})

describe('filterTasks', () => {
  const ids = (list: Task[]) => list.map((t) => t.id)

  it('hides completed tasks by default', () => {
    expect(ids(filterTasks(tasks, defaultFilters, TODAY))).not.toContain('done')
  })

  it('searches titles case-insensitively', () => {
    expect(ids(filterTasks(tasks, { ...defaultFilters, search: 'DRAFT' }, TODAY))).toEqual(['soon'])
  })

  it('filters by status, priority, category, project and due bucket', () => {
    expect(ids(filterTasks(tasks, { ...defaultFilters, status: 'completed' }, TODAY))).toEqual([
      'done',
    ])
    expect(ids(filterTasks(tasks, { ...defaultFilters, priority: 'urgent' }, TODAY))).toEqual([
      'today',
    ])
    expect(ids(filterTasks(tasks, { ...defaultFilters, categoryId: 'cat-a' }, TODAY))).toEqual([
      'soon',
    ])
    expect(ids(filterTasks(tasks, { ...defaultFilters, projectId: 'p1' }, TODAY))).toEqual([
      'nodate',
    ])
    expect(ids(filterTasks(tasks, { ...defaultFilters, due: 'overdue' }, TODAY))).toEqual([
      'overdue',
    ])
    expect(ids(filterTasks(tasks, { ...defaultFilters, due: 'upcoming' }, TODAY))).toEqual(['soon'])
    expect(ids(filterTasks(tasks, { ...defaultFilters, due: 'no_date' }, TODAY))).toEqual([
      'nodate',
    ])
  })
})

describe('sortTasks', () => {
  it('sorts by due date with undated tasks last', () => {
    expect(sortTasks(tasks, 'due_asc').map((t) => t.id)).toEqual([
      'done',
      'overdue',
      'today',
      'soon',
      'later',
      'nodate',
    ])
  })

  it('sorts by priority, urgent first', () => {
    expect(sortTasks(tasks, 'priority')[0].id).toBe('today')
    expect(sortTasks(tasks, 'priority').at(-1)!.id).toBe('later')
  })
})

describe('progress', () => {
  it('calculates subtask completion', () => {
    expect(
      subtaskProgress([{ is_completed: true }, { is_completed: false }, { is_completed: true }]),
    ).toEqual({ done: 2, total: 3, percent: 67 })
    expect(subtaskProgress([])).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('treats a completed parent as 100%', () => {
    expect(taskProgress({ status: 'completed' }, [{ is_completed: false }])).toBe(100)
    expect(
      taskProgress({ status: 'todo' }, [{ is_completed: true }, { is_completed: false }]),
    ).toBe(50)
  })
})

describe('validateTaskForm', () => {
  const base = {
    title: 'Write essay',
    description: '',
    status: 'todo' as const,
    priority: 'medium' as const,
    category_id: '',
    project_id: '',
    start_date: '',
    due_date: '',
  }

  it('requires a title', () => {
    expect(validateTaskForm({ ...base, title: '  ' }).title).toBeDefined()
  })

  it('rejects a due date before the start date', () => {
    expect(
      validateTaskForm({ ...base, start_date: '2026-11-20', due_date: '2026-11-10' }).due_date,
    ).toBeDefined()
  })

  it('accepts valid input', () => {
    expect(validateTaskForm({ ...base, start_date: '2026-11-10', due_date: '2026-11-20' })).toEqual(
      {},
    )
  })
})

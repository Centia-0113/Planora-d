import { describe, expect, it } from 'vitest'
import type { Task } from '@/types/database'
import {
  activityHeatmap,
  completedInRange,
  completionDate,
  completionRateInRange,
  completionTrend,
  rangeFor,
  statusDistribution,
  weeklyProductivity,
} from './logic'

const TZ = 'Africa/Johannesburg' // UTC+2
const TODAY = '2026-11-12' // a Thursday

function task(overrides: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
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
    created_at: '2026-11-01T08:00:00Z',
    updated_at: '2026-11-01T08:00:00Z',
    ...overrides,
  }
}

describe('completionDate', () => {
  it('uses the user timezone, not UTC', () => {
    // 23:30 UTC on the 10th is 01:30 on the 11th in Johannesburg.
    expect(completionDate({ completed_at: '2026-11-10T23:30:00Z' }, TZ)).toBe('2026-11-11')
    expect(completionDate({ completed_at: null }, TZ)).toBeNull()
  })
})

describe('rangeFor', () => {
  it('includes today', () => {
    expect(rangeFor('7d', TODAY)).toEqual({ from: '2026-11-06', to: TODAY })
  })
})

describe('completionTrend', () => {
  const tasks = [
    task({
      status: 'completed',
      completed_at: '2026-11-11T09:00:00Z',
      created_at: '2026-11-10T09:00:00Z',
    }),
    task({
      status: 'completed',
      completed_at: '2026-11-11T12:00:00Z',
      created_at: '2026-11-11T09:00:00Z',
    }),
    task({ status: 'completed', completed_at: '2026-10-01T12:00:00Z' }), // outside range
  ]

  it('buckets by day for short ranges', () => {
    const points = completionTrend(tasks, rangeFor('7d', TODAY), TZ)
    expect(points).toHaveLength(7)
    expect(points.find((p) => p.start === '2026-11-11')).toMatchObject({ completed: 2, created: 1 })
    expect(points.find((p) => p.start === '2026-11-10')).toMatchObject({ completed: 0, created: 1 })
    expect(points.reduce((s, p) => s + p.completed, 0)).toBe(2)
  })

  it('buckets by week for long ranges', () => {
    const points = completionTrend(tasks, rangeFor('90d', TODAY), TZ)
    expect(points.length).toBeGreaterThanOrEqual(13)
    expect(points.reduce((s, p) => s + p.completed, 0)).toBe(3)
  })
})

describe('statusDistribution', () => {
  it('separates overdue from other open tasks', () => {
    const slices = statusDistribution(
      [
        task({ status: 'completed' }),
        task({ status: 'in_progress', due_date: '2026-11-20' }),
        task({ status: 'in_progress', due_date: '2026-11-01' }),
        task({ status: 'todo' }),
      ],
      TODAY,
    )
    expect(Object.fromEntries(slices.map((s) => [s.key, s.value]))).toEqual({
      completed: 1,
      in_progress: 1,
      todo: 1,
      overdue: 1,
    })
  })
})

describe('weeklyProductivity', () => {
  it('counts completions for each day of the current week', () => {
    const days = weeklyProductivity(
      [
        task({ completed_at: '2026-11-09T10:00:00Z', status: 'completed' }), // Monday
        task({ completed_at: '2026-11-12T10:00:00Z', status: 'completed' }), // Thursday
        task({ completed_at: '2026-11-12T11:00:00Z', status: 'completed' }),
      ],
      TODAY,
      TZ,
      1,
    )
    expect(days.map((d) => d.completed)).toEqual([1, 0, 0, 2, 0, 0, 0])
    expect(days[0].date).toBe('2026-11-09')
    expect(days[4].isFuture).toBe(true)
  })
})

describe('activityHeatmap', () => {
  it('computes active days and the current streak', () => {
    const result = activityHeatmap(
      [
        task({ completed_at: '2026-11-12T08:00:00Z', status: 'completed' }),
        task({ completed_at: '2026-11-11T08:00:00Z', status: 'completed' }),
        task({ completed_at: '2026-11-09T08:00:00Z', status: 'completed' }),
      ],
      TODAY,
      TZ,
    )
    expect(result.activeDays).toBe(3)
    expect(result.streak).toBe(2)
    expect(result.columns.every((c) => c.length === 7)).toBe(true)
  })
})

describe('range metrics', () => {
  const tasks = [
    task({ due_date: '2026-11-10', status: 'completed', completed_at: '2026-11-10T08:00:00Z' }),
    task({ due_date: '2026-11-11' }),
    task({ due_date: '2026-09-01', status: 'completed', completed_at: '2026-09-01T08:00:00Z' }),
  ]

  it('calculates the completion rate of tasks due in the range', () => {
    expect(completionRateInRange(tasks, rangeFor('7d', TODAY))).toEqual({
      due: 2,
      done: 1,
      percent: 50,
    })
  })

  it('counts tasks completed in the range', () => {
    expect(completedInRange(tasks, rangeFor('7d', TODAY), TZ)).toBe(1)
  })
})

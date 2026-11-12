import { describe, expect, it } from 'vitest'
import { projectProgress } from './logic'

const TODAY = '2026-11-12'
const active = { status: 'active' as const, end_date: '2026-12-31' }

describe('projectProgress', () => {
  it('uses completed tasks over total tasks', () => {
    const p = projectProgress(
      active,
      [
        { status: 'completed', due_date: null },
        { status: 'todo', due_date: '2026-11-20' },
        { status: 'in_progress', due_date: null },
        { status: 'completed', due_date: null },
      ],
      [{ is_completed: false, due_date: '2026-11-18' }],
      TODAY,
    )
    expect(p).toMatchObject({
      percent: 50,
      completedTasks: 2,
      totalTasks: 4,
      outstandingTasks: 2,
      totalMilestones: 1,
      nextDeadline: '2026-11-18',
      health: 'on_track',
    })
  })

  it('falls back to milestones when there are no tasks', () => {
    const p = projectProgress(
      active,
      [],
      [
        { is_completed: true, due_date: null },
        { is_completed: false, due_date: null },
        { is_completed: false, due_date: null },
      ],
      TODAY,
    )
    expect(p.percent).toBe(33)
  })

  it('is 0% with no tasks or milestones and 100% when completed', () => {
    expect(projectProgress(active, [], [], TODAY).percent).toBe(0)
    expect(projectProgress({ status: 'completed', end_date: null }, [], [], TODAY)).toMatchObject({
      percent: 100,
      health: 'done',
    })
  })

  it('flags overdue tasks and late projects', () => {
    expect(
      projectProgress(active, [{ status: 'todo', due_date: '2026-11-01' }], [], TODAY),
    ).toMatchObject({ overdueTasks: 1, health: 'overdue' })
    expect(
      projectProgress({ status: 'active', end_date: '2026-11-01' }, [], [], TODAY).health,
    ).toBe('overdue')
  })

  it('marks projects ending within a week below 80% as at risk', () => {
    expect(
      projectProgress(
        { status: 'active', end_date: '2026-11-15' },
        [
          { status: 'completed', due_date: null },
          { status: 'todo', due_date: null },
        ],
        [],
        TODAY,
      ).health,
    ).toBe('at_risk')
  })
})

import { describe, expect, it } from 'vitest'
import {
  analysePlan,
  findDependencyCycle,
  normalizePlan,
  toApprovalPayload,
  type AiPlan,
  type PlanDate,
  type PlanTask,
} from '@shared/plan'

const none: PlanDate = { value: null, source: 'none', quote: null }
const doc = (value: string, quote = 'stated in brief'): PlanDate => ({
  value,
  source: 'document',
  quote,
})
const sug = (value: string): PlanDate => ({ value, source: 'suggested', quote: null })

function t(key: string, overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    key,
    title: `Task ${key}`,
    description: null,
    phase: null,
    priority: 'medium',
    estimated_days: null,
    start_date: none,
    due_date: none,
    depends_on: [],
    milestone_key: null,
    responsible: null,
    ...overrides,
  }
}

function plan(tasks: PlanTask[], overrides: Partial<AiPlan> = {}): AiPlan {
  return {
    project: {
      title: 'Website rebuild',
      summary: 'Rebuild the site',
      objectives: [],
      deliverables: [],
      start_date: doc('2026-11-16'),
      end_date: doc('2026-12-18'),
    },
    milestones: [],
    tasks,
    risks: [],
    questions: [],
    assumptions: [],
    ...overrides,
  }
}

describe('normalizePlan', () => {
  it('downgrades "document" dates without a supporting quote to suggestions', () => {
    const { plan: p } = normalizePlan(
      plan([t('t1', { due_date: { value: '2026-11-20', source: 'document', quote: null } })]),
    )
    expect(p.tasks[0].due_date.source).toBe('suggested')
  })

  it('clears unreadable dates and reports them', () => {
    const { plan: p, issues } = normalizePlan(plan([t('t1', { due_date: sug('next Friday') })]))
    expect(p.tasks[0].due_date).toEqual(none)
    expect(issues.map((i) => i.kind)).toContain('invalid_date')
  })

  it('removes unknown and self dependencies and de-duplicates keys', () => {
    const { plan: p, issues } = normalizePlan(
      plan([
        t('t1', { depends_on: ['t1', 'ghost'] }),
        t('t1'),
        t('t2', { depends_on: ['t1', 't1'] }),
      ]),
    )
    expect(p.tasks.map((x) => x.key)).toEqual(['t1', 't1_2', 't2'])
    expect(p.tasks[0].depends_on).toEqual([])
    expect(p.tasks[2].depends_on).toEqual(['t1'])
    expect(issues.some((i) => i.kind === 'unknown_dependency')).toBe(true)
  })
})

describe('analysePlan', () => {
  const kinds = (p: AiPlan) => analysePlan(p).map((i) => i.kind)

  it('flags tasks that start after their deadline', () => {
    expect(
      kinds(plan([t('t1', { start_date: sug('2026-11-25'), due_date: doc('2026-11-20') })])),
    ).toContain('date_order')
  })

  it('flags tasks scheduled before their dependencies finish', () => {
    const issues = analysePlan(
      plan([
        t('t1', { due_date: sug('2026-11-25') }),
        t('t2', { start_date: sug('2026-11-20'), due_date: sug('2026-11-30'), depends_on: ['t1'] }),
      ]),
    )
    expect(issues.find((i) => i.kind === 'dependency_order')?.task_keys).toEqual(['t2', 't1'])
  })

  it('flags tasks outside the project period', () => {
    expect(kinds(plan([t('t1', { due_date: sug('2027-01-10') })]))).toContain('outside_project')
  })

  it('distinguishes missing, suggested and document deadlines', () => {
    const issues = analysePlan(
      plan([
        t('a'),
        t('b', { due_date: sug('2026-11-20') }),
        t('c', { due_date: doc('2026-11-21') }),
      ]),
    )
    expect(issues.find((i) => i.kind === 'missing_deadline')?.task_keys).toEqual(['a'])
    expect(issues.find((i) => i.kind === 'suggested_deadline')?.task_keys).toEqual(['b'])
    expect(issues.some((i) => i.task_keys.includes('c'))).toBe(false)
  })

  it('flags milestones due before their tasks', () => {
    const p = plan([t('t1', { due_date: doc('2026-12-01'), milestone_key: 'm1' })], {
      milestones: [{ key: 'm1', title: 'Beta', description: null, due_date: doc('2026-11-28') }],
    })
    expect(kinds(p)).toContain('milestone_before_tasks')
  })

  it('detects dependency cycles', () => {
    expect(kinds(plan([t('a', { depends_on: ['b'] }), t('b', { depends_on: ['a'] })]))).toContain(
      'dependency_cycle',
    )
  })

  it('reports no conflicts for a consistent plan', () => {
    const issues = analysePlan(
      plan([
        t('t1', { start_date: sug('2026-11-16'), due_date: doc('2026-11-20') }),
        t('t2', { start_date: sug('2026-11-21'), due_date: doc('2026-11-27'), depends_on: ['t1'] }),
      ]),
    )
    expect(issues.filter((i) => i.severity === 'warning')).toEqual([])
  })
})

describe('findDependencyCycle', () => {
  it('returns the cycle path or null', () => {
    expect(
      findDependencyCycle([
        { key: 'a', depends_on: ['b'] },
        { key: 'b', depends_on: [] },
      ]),
    ).toBeNull()
    expect(
      findDependencyCycle([
        { key: 'a', depends_on: ['b'] },
        { key: 'b', depends_on: ['c'] },
        { key: 'c', depends_on: ['a'] },
      ]),
    ).toEqual(['a', 'b', 'c', 'a'])
  })
})

describe('toApprovalPayload', () => {
  it('produces the shape the database function expects', () => {
    const payload = toApprovalPayload(
      plan(
        [t('t1', { title: '  Design  ', due_date: doc('2026-11-20'), depends_on: ['removed'] })],
        {
          milestones: [
            { key: 'm1', title: 'Launch', description: null, due_date: sug('2026-12-18') },
          ],
        },
      ),
    )
    expect(payload).toEqual({
      project: {
        name: 'Website rebuild',
        description: 'Rebuild the site',
        start_date: '2026-11-16',
        end_date: '2026-12-18',
      },
      milestones: [{ title: 'Launch', description: null, due_date: '2026-12-18' }],
      tasks: [
        {
          key: 't1',
          title: 'Design',
          description: null,
          priority: 'medium',
          start_date: null,
          due_date: '2026-11-20',
          depends_on: [],
        },
      ],
    })
  })
})

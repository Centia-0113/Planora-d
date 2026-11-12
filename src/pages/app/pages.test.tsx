import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoredPlan } from '@shared/plan'
import { makeTask, renderAppPage, TODAY, WS } from '@/test/appUtils'
import { DashboardPage } from './DashboardPage'
import { PlanReviewPage } from './PlanReviewPage'
import { TasksPage } from './TasksPage'

const mock = vi.hoisted(() => ({
  current: null as ReturnType<typeof import('@/test/supabaseMock').createSupabaseMock> | null,
}))

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  mock.current = createSupabaseMock()
  return { supabase: mock.current.client }
})

const db = () => mock.current!

const seedTasks = () => {
  db().tables.tasks = [
    makeTask({ id: 't-overdue', title: 'Submit report', due_date: '2026-11-10', priority: 'high' }),
    makeTask({ id: 't-today', title: 'Call supervisor', due_date: TODAY, priority: 'urgent' }),
    makeTask({ id: 't-soon', title: 'Draft slides', due_date: '2026-11-15' }),
    makeTask({
      id: 't-done',
      title: 'Pay rent',
      status: 'completed',
      completed_at: '2026-11-11T08:00:00Z',
    }),
    // Another workspace's task must never appear (the mock filters by workspace_id like RLS + query would).
    makeTask({ id: 't-foreign', title: 'Someone else’s task', workspace_id: 'ws-other' }),
  ]
}

beforeEach(() => {
  db().reset()
  seedTasks()
})

describe('TasksPage', () => {
  it('lists open tasks from the database, soonest first, hiding completed and foreign tasks', async () => {
    renderAppPage(<TasksPage />)
    const list = await screen.findByRole('list')
    const titles = within(list)
      .getAllByRole('link')
      .map((a) => a.textContent)
    expect(titles).toEqual(['Submit report', 'Call supervisor', 'Draft slides'])
    expect(screen.queryByText('Pay rent')).not.toBeInTheDocument()
    expect(screen.queryByText('Someone else’s task')).not.toBeInTheDocument()
  })

  it('searches by title', async () => {
    renderAppPage(<TasksPage />)
    await screen.findByText('Draft slides')
    await userEvent.type(screen.getByLabelText('Search tasks'), 'slides')
    expect(screen.getByText('Draft slides')).toBeInTheDocument()
    expect(screen.queryByText('Submit report')).not.toBeInTheDocument()
  })

  it('filters to overdue tasks', async () => {
    renderAppPage(<TasksPage />)
    await screen.findByText('Draft slides')
    await userEvent.click(screen.getByRole('tab', { name: /overdue/i }))
    expect(screen.getByText('Submit report')).toBeInTheDocument()
    expect(screen.queryByText('Draft slides')).not.toBeInTheDocument()
  })

  it('marks a task complete', async () => {
    renderAppPage(<TasksPage />)
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Mark "Draft slides" as completed' }),
    )
    await waitFor(() =>
      expect(db().writes('tasks')).toContainEqual(
        expect.objectContaining({
          op: 'update',
          payload: { status: 'completed' },
          filters: [['eq', 'id', 't-soon']],
        }),
      ),
    )
  })

  it('creates a task in the current workspace with validation', async () => {
    renderAppPage(<TasksPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'New task' }))
    const dialog = within(screen.getByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: 'Create task' }))
    expect(dialog.getByText('Give the task a title.')).toBeInTheDocument()

    await userEvent.type(dialog.getByLabelText('Title'), 'Book venue')
    await userEvent.selectOptions(dialog.getByLabelText('Priority'), 'high')
    await userEvent.type(dialog.getByLabelText('Due date'), '2026-11-20')
    await userEvent.click(dialog.getByRole('button', { name: 'Create task' }))

    await waitFor(() =>
      expect(db().writes('tasks')[0]).toMatchObject({
        op: 'insert',
        payload: {
          title: 'Book venue',
          priority: 'high',
          due_date: '2026-11-20',
          status: 'todo',
          workspace_id: WS,
        },
      }),
    )
  })
})

describe('DashboardPage', () => {
  it('shows summary cards calculated from the actual records', async () => {
    renderAppPage(<DashboardPage />)
    const summary = await screen.findByRole('list', { name: 'Task summary' })
    await waitFor(() =>
      expect(within(summary).getByText('Total tasks').previousSibling).toHaveTextContent('4'),
    )
    const value = (label: string) => within(summary).getByText(label).previousSibling?.textContent
    expect(value('Completed')).toBe('1')
    expect(value('Pending')).toBe('3')
    expect(value('Overdue')).toBe('1')
    expect(value('Due today')).toBe('1')
    expect(value('Next 7 days')).toBe('1')
  })
})

describe('PlanReviewPage', () => {
  const date = (value: string | null, source: 'document' | 'suggested' | 'none' = 'suggested') => ({
    value,
    source: value ? source : ('none' as const),
    quote: source === 'document' ? 'by 20 November' : null,
  })
  const plan: StoredPlan = {
    project: {
      title: 'Website rebuild',
      summary: 'Rebuild the company site',
      objectives: ['Faster site'],
      deliverables: ['New site'],
      start_date: date('2026-11-16'),
      end_date: date('2026-12-18', 'document'),
    },
    milestones: [
      { key: 'm1', title: 'Design signed off', description: null, due_date: date('2026-11-27') },
    ],
    tasks: [
      {
        key: 't1',
        title: 'Gather requirements',
        description: null,
        phase: 'Discovery',
        priority: 'high',
        estimated_days: 2,
        start_date: date('2026-11-16'),
        due_date: date('2026-11-20', 'document'),
        depends_on: [],
        milestone_key: null,
        responsible: null,
      },
      {
        key: 't2',
        title: 'Design mock-ups',
        description: null,
        phase: 'Design',
        priority: 'medium',
        estimated_days: 5,
        start_date: date('2026-11-21'),
        due_date: date('2026-11-27'),
        depends_on: ['t1'],
        milestone_key: 'm1',
        responsible: null,
      },
      {
        key: 't3',
        title: 'Order team T-shirts',
        description: null,
        phase: null,
        priority: 'low',
        estimated_days: 1,
        start_date: date(null),
        due_date: date(null),
        depends_on: [],
        milestone_key: null,
        responsible: null,
      },
    ],
    risks: [
      {
        description: 'Content may arrive late',
        severity: 'medium',
        mitigation: 'Agree dates early',
      },
    ],
    questions: ['Who approves the design?'],
    assumptions: [],
    issues: [],
    meta: {
      model: 'claude-opus-5-5',
      document_name: 'brief.pdf',
      generated_at: '2026-11-12T08:00:00Z',
      truncated: false,
    },
  }

  beforeEach(() => {
    db().tables.generated_plans = [
      {
        id: 'plan-1',
        workspace_id: WS,
        ai_job_id: 'job-1',
        document_id: 'doc-1',
        plan,
        approved_plan: null,
        status: 'pending_review',
        project_id: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: '2026-11-12T08:00:00Z',
        updated_at: '2026-11-12T08:00:00Z',
      },
    ]
  })

  const renderReview = () =>
    renderAppPage(<PlanReviewPage />, {
      path: '/ai-planner/plans/:planId',
      initialPath: '/ai-planner/plans/plan-1',
      extraRoutes: [
        { path: '/projects/:id', element: <h1>Project page</h1> },
        { path: '/ai-planner', element: <h1>AI Planner</h1> },
      ],
    })

  it('labels document dates separately from AI suggestions and shows questions', async () => {
    renderReview()
    expect(await screen.findByText('Review proposed plan')).toBeInTheDocument()
    expect(screen.getAllByText('From document').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AI suggestion').length).toBeGreaterThan(0)
    expect(screen.getByText('Who approves the design?')).toBeInTheDocument()
    expect(screen.getByText(/"Order team T-shirts" has no deadline/)).toBeInTheDocument()
  })

  it('approves only the tasks the user kept, as one database call', async () => {
    const { router } = renderReview()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove task Order team T-shirts' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Approve and create 2 tasks' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/projects/project-1'))
    expect(db().client.rpc).toHaveBeenCalledTimes(1)
    const [fn, args] = db().client.rpc.mock.calls[0] as [
      string,
      { p_plan: { tasks: { key: string; depends_on: string[] }[] } },
    ]
    expect(fn).toBe('approve_generated_plan')
    expect(args.p_plan.tasks.map((t) => t.key)).toEqual(['t1', 't2'])
    expect(args.p_plan.tasks[1].depends_on).toEqual(['t1'])
    // No direct task inserts from the client: creation happens atomically in the database.
    expect(db().writes('tasks')).toEqual([])
  })

  it('creates nothing when the plan is rejected', async () => {
    const { router } = renderReview()
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reject plan' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/ai-planner'))
    expect(db().client.rpc).toHaveBeenCalledWith('reject_generated_plan', { p_plan_id: 'plan-1' })
    expect(db().writes('tasks')).toEqual([])
  })
})

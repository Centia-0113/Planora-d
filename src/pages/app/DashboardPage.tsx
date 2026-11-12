import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Diamond,
  ListChecks,
  ListTodo,
  Plus,
  Sparkles,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  ProgressBar,
  Spinner,
  buttonClasses,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { addDays, formatDate, relativeDue } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import { useChecklist } from '@/features/planner/api'
import { checklistCompletion } from '@/features/planner/calendar'
import { useMilestones, useProjects } from '@/features/projects/api'
import { projectProgress } from '@/features/projects/logic'
import { useAllSubtasks, useCategories, useTasks } from '@/features/tasks/api'
import { TaskFormModal } from '@/features/tasks/components/TaskFormModal'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import { groupSubtasksByTask, sortTasks, summarizeTasks } from '@/features/tasks/logic'
import { useToggleTask } from '@/features/tasks/useToggleTask'
import { useWorkspace } from '@/features/workspace/workspace-context'

function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const location = useLocation()
  const { profile, today } = useWorkspace()
  const tasks = useTasks()
  const categories = useCategories()
  const subtasks = useAllSubtasks()
  const projects = useProjects()
  const milestones = useMilestones()
  const checklist = useChecklist(today)
  const { toggle, pendingId } = useToggleTask()
  const [creating, setCreating] = useState(false)
  const passwordUpdated = (location.state as { passwordUpdated?: boolean } | null)?.passwordUpdated

  const firstName = profile.full_name?.split(' ')[0]
  const all = useMemo(() => tasks.data ?? [], [tasks.data])
  const summary = useMemo(() => summarizeTasks(all, today), [all, today])
  const focus = useMemo(
    () =>
      sortTasks(
        all.filter(
          (t) => t.status !== 'completed' && t.due_date !== null && t.due_date <= addDays(today, 7),
        ),
        'due_asc',
      ).slice(0, 6),
    [all, today],
  )
  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  )
  const subtasksByTask = useMemo(() => groupSubtasksByTask(subtasks.data ?? []), [subtasks.data])
  const checklistStats = checklistCompletion(checklist.data ?? [])
  const upcomingMilestones = (milestones.data ?? [])
    .filter((m) => !m.is_completed && m.due_date && m.due_date >= today)
    .slice(0, 4)
  const projectName = new Map((projects.data ?? []).map((p) => [p.id, p.name]))
  const activeProjects = (projects.data ?? [])
    .filter((p) => p.status === 'active')
    .slice(0, 3)
    .map((p) => ({
      project: p,
      progress: projectProgress(
        p,
        all.filter((t) => t.project_id === p.id),
        (milestones.data ?? []).filter((m) => m.project_id === p.id),
        today,
      ),
    }))

  const cards = [
    { label: 'Total tasks', value: summary.total, icon: ListTodo, tone: 'navy', to: '/tasks' },
    {
      label: 'Completed',
      value: summary.completed,
      icon: CheckCircle2,
      tone: 'sage',
      to: '/tasks',
    },
    { label: 'Pending', value: summary.pending, icon: Clock, tone: 'cream', to: '/tasks' },
    {
      label: 'Overdue',
      value: summary.overdue,
      icon: AlertTriangle,
      tone: summary.overdue ? 'red' : 'cream',
      to: '/tasks',
    },
    {
      label: 'Due today',
      value: summary.dueToday,
      icon: CalendarCheck,
      tone: 'amber',
      to: '/tasks',
    },
    {
      label: 'Next 7 days',
      value: summary.upcoming,
      icon: ArrowRight,
      tone: 'cream',
      to: '/tasks',
    },
  ] as const
  const toneClasses = {
    navy: 'bg-navy-800 text-cream-50',
    sage: 'bg-sage-100 text-sage-800',
    cream: 'bg-white text-navy-900',
    red: 'bg-red-50 text-red-800',
    amber: 'bg-amber-50 text-amber-900',
  }

  return (
    <PageContainer
      title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
      description={formatDate(today, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
      actions={
        <Button
          leftIcon={<Plus className="size-4" aria-hidden />}
          onClick={() => setCreating(true)}
        >
          New task
        </Button>
      }
    >
      {passwordUpdated && (
        <div className="mb-5">
          <Alert tone="success">Your password has been updated.</Alert>
        </div>
      )}

      {tasks.isError ? (
        <ErrorState message={errorMessage(tasks.error)} onRetry={() => void tasks.refetch()} />
      ) : (
        <>
          <ul
            className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
            aria-label="Task summary"
          >
            {cards.map(({ label, value, icon: Icon, tone, to }) => (
              <li key={label}>
                <Link
                  to={to}
                  className={cn(
                    'flex h-full flex-col rounded-card border border-cream-300 p-4 shadow-card transition-transform hover:-translate-y-0.5',
                    toneClasses[tone],
                  )}
                >
                  <Icon className="size-5 opacity-80" aria-hidden />
                  <span className="mt-3 font-heading text-3xl font-extrabold">
                    {tasks.isPending ? '–' : value}
                  </span>
                  <span className="text-sm opacity-80">{label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Focus: overdue and coming up"
                description="Unfinished tasks due in the next 7 days"
                action={
                  <Link to="/tasks" className="text-sm font-semibold text-sage-700 hover:underline">
                    All tasks
                  </Link>
                }
              />
              {tasks.isPending ? (
                <Spinner label="Loading tasks" />
              ) : all.length === 0 ? (
                <EmptyState
                  title="Welcome to Planora"
                  description="Create your first task, or upload a project document and let AI draft a plan."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button size="sm" onClick={() => setCreating(true)}>
                        Create a task
                      </Button>
                      <Link to="/ai-planner" className={buttonClasses('secondary', 'sm')}>
                        <Sparkles className="size-4" aria-hidden /> Plan from a document
                      </Link>
                    </div>
                  }
                />
              ) : focus.length === 0 ? (
                <p className="py-6 text-center text-sm text-navy-500">
                  Nothing due in the next week. 🎉
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {focus.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      today={today}
                      category={t.category_id ? categoryById.get(t.category_id) : undefined}
                      subtasks={subtasksByTask.get(t.id)}
                      onToggle={toggle}
                      toggling={pendingId === t.id}
                    />
                  ))}
                </ul>
              )}
            </Card>

            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader
                  title="Today’s checklist"
                  action={
                    <Link
                      to="/checklist"
                      className="text-sm font-semibold text-sage-700 hover:underline"
                    >
                      Open
                    </Link>
                  }
                />
                {checklistStats.total === 0 ? (
                  <p className="text-sm text-navy-500">
                    <ListChecks className="mr-1 inline size-4 text-sage-600" aria-hidden />
                    No activities planned for today yet.
                  </p>
                ) : (
                  <>
                    <div className="mb-2 flex items-baseline justify-between text-sm">
                      <span>
                        {checklistStats.done} of {checklistStats.total} done
                      </span>
                      <span className="font-heading text-xl font-extrabold text-sage-700">
                        {checklistStats.percent}%
                      </span>
                    </div>
                    <ProgressBar
                      value={checklistStats.percent}
                      label="Today's checklist completion"
                    />
                  </>
                )}
              </Card>

              <Card>
                <CardHeader title="Upcoming milestones" />
                {upcomingMilestones.length === 0 ? (
                  <p className="text-sm text-navy-500">No upcoming milestones.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {upcomingMilestones.map((m) => (
                      <li key={m.id}>
                        <Link
                          to={`/projects/${m.project_id}`}
                          className="flex items-start gap-2 text-sm hover:text-sage-700"
                        >
                          <Diamond className="mt-0.5 size-4 shrink-0 text-purple-600" aria-hidden />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{m.title}</span>
                            <span className="text-xs text-navy-500">
                              {projectName.get(m.project_id)} · {relativeDue(m.due_date!, today)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          {activeProjects.length > 0 && (
            <Card className="mt-5">
              <CardHeader
                title="Active projects"
                action={
                  <Link
                    to="/projects"
                    className="text-sm font-semibold text-sage-700 hover:underline"
                  >
                    All projects
                  </Link>
                }
              />
              <ul className="grid gap-5 md:grid-cols-3">
                {activeProjects.map(({ project, progress }) => (
                  <li key={project.id}>
                    <Link to={`/projects/${project.id}`} className="block hover:text-sage-700">
                      <div className="mb-1.5 flex justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{project.name}</span>
                        <span className="font-semibold">{progress.percent}%</span>
                      </div>
                      <ProgressBar value={progress.percent} label={`${project.name} progress`} />
                      <p className="mt-1 text-xs text-navy-500">
                        {progress.completedTasks}/{progress.totalTasks} tasks
                        {progress.nextDeadline &&
                          ` · next ${formatDate(progress.nextDeadline, { day: 'numeric', month: 'short' })}`}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {creating && <TaskFormModal open onClose={() => setCreating(false)} />}
    </PageContainer>
  )
}

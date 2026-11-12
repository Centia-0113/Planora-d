import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardHeader, EmptyState, ErrorState, ProgressBar, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDate, relativeDue } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import { AXIS, heatColor, SERIES, STATUS_COLORS } from '@/features/analytics/chartTheme'
import {
  activityHeatmap,
  completedInRange,
  completionRateInRange,
  completionTrend,
  RANGE_LABELS,
  rangeFor,
  statusDistribution,
  weeklyProductivity,
  type RangeKey,
} from '@/features/analytics/logic'
import { useMilestones, useProjects } from '@/features/projects/api'
import { projectProgress } from '@/features/projects/logic'
import { useTasks } from '@/features/tasks/api'
import { isOverdue, summarizeTasks } from '@/features/tasks/logic'
import { useWorkspace } from '@/features/workspace/workspace-context'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e9dec6',
  boxShadow: '0 4px 16px rgb(19 29 49 / 0.08)',
  fontSize: 13,
}

export function AnalyticsPage() {
  const { today, timezone, weekStartsOn } = useWorkspace()
  const tasks = useTasks()
  const projects = useProjects()
  const milestones = useMilestones()
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d')
  const range = rangeFor(rangeKey, today)

  const data = useMemo(() => {
    const all = tasks.data ?? []
    return {
      summary: summarizeTasks(all, today),
      trend: completionTrend(all, range, timezone, weekStartsOn),
      status: statusDistribution(all, today),
      week: weeklyProductivity(all, today, timezone, weekStartsOn),
      heat: activityHeatmap(all, today, timezone, 12, weekStartsOn),
      rate: completionRateInRange(all, range),
      completedInRange: completedInRange(all, range, timezone),
      overdue: all
        .filter((t) => isOverdue(t, today))
        .sort((a, b) => a.due_date!.localeCompare(b.due_date!)),
      projects: (projects.data ?? []).map((p) => ({
        project: p,
        progress: projectProgress(
          p,
          all.filter((t) => t.project_id === p.id),
          (milestones.data ?? []).filter((m) => m.project_id === p.id),
          today,
        ),
      })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tasks.data,
    projects.data,
    milestones.data,
    today,
    timezone,
    weekStartsOn,
    range.from,
    range.to,
  ])

  const activeProjects = data.projects.filter(
    (p) => p.project.status === 'active' || p.project.status === 'planning',
  )

  return (
    <PageContainer
      title="Analytics"
      description="Your productivity and project progress, calculated from your actual tasks."
      actions={
        <div
          role="radiogroup"
          aria-label="Date range"
          className="flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-card"
        >
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
            <button
              key={key}
              role="radio"
              aria-checked={rangeKey === key}
              onClick={() => setRangeKey(key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium',
                rangeKey === key ? 'bg-navy-800 text-cream-50' : 'text-navy-600 hover:bg-navy-50',
              )}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      }
    >
      {tasks.isPending ? (
        <div className="flex justify-center py-20">
          <Spinner label="Loading analytics" />
        </div>
      ) : tasks.isError ? (
        <ErrorState message={errorMessage(tasks.error)} onRetry={() => void tasks.refetch()} />
      ) : (tasks.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<BarChart3 className="size-6" aria-hidden />}
          title="No data yet"
          description="Analytics appear once you start creating and completing tasks."
          action={
            <Link to="/tasks" className="font-semibold text-sage-700 hover:underline">
              Go to tasks
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Total tasks"
              value={data.summary.total}
              sub={`${data.summary.pending} pending`}
            />
            <Stat
              label="Completion rate"
              value={`${data.summary.completionRate}%`}
              sub={`${data.summary.completed} of ${data.summary.total} completed`}
            />
            <Stat
              label={`Completed · ${RANGE_LABELS[rangeKey].toLowerCase()}`}
              value={data.completedInRange}
              sub={
                data.rate.due
                  ? `${data.rate.percent}% of tasks due in this period done`
                  : 'No tasks due in this period'
              }
            />
            <Stat
              label="Overdue"
              value={data.summary.overdue}
              sub={
                data.summary.overdue ? 'Unfinished tasks past their due date' : 'Nothing overdue'
              }
              alert={data.summary.overdue > 0}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {/* Completed vs created */}
            <Card className="xl:col-span-2">
              <CardHeader
                title="Tasks completed vs created"
                description={
                  data.trend.length > 31 || rangeKey === '90d' || rangeKey === '365d'
                    ? 'Per week'
                    : 'Per day'
                }
              />
              <div
                className="h-72"
                role="img"
                aria-label="Bar chart of tasks completed and created over time"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.trend}
                    barGap={2}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke={AXIS.grid} />
                    <XAxis
                      dataKey="label"
                      tick={AXIS.tick}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={12}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={AXIS.tick}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'rgb(19 29 49 / 0.04)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: '#2c3f62' }} />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      fill={SERIES.completed}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                    />
                    <Bar
                      dataKey="created"
                      name="Created"
                      fill={SERIES.created}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium text-sage-700">
                  View as table
                </summary>
                <div className="mt-2 max-h-60 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-navy-500">
                      <tr>
                        <th className="py-1 font-medium">Period</th>
                        <th className="py-1 font-medium">Completed</th>
                        <th className="py-1 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trend.map((p) => (
                        <tr key={p.start} className="border-t border-cream-200">
                          <td className="py-1">{formatDate(p.start)}</td>
                          <td className="py-1">{p.completed}</td>
                          <td className="py-1">{p.created}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Card>

            {/* Status distribution */}
            <Card>
              <CardHeader title="Task status" description="All tasks right now" />
              <StatusBar slices={data.status} />
              <ul className="mt-5 flex flex-col gap-3">
                {data.status.map((s) => (
                  <li key={s.key} className="flex items-center gap-3 text-sm">
                    <span
                      className="size-3 rounded-full"
                      style={{ background: STATUS_COLORS[s.key] }}
                      aria-hidden
                    />
                    <span className="flex-1 text-navy-700">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                    <span className="w-10 text-right text-navy-500">
                      {data.summary.total ? Math.round((s.value / data.summary.total) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {/* Weekly productivity */}
            <Card>
              <CardHeader title="This week" description="Tasks completed per day" />
              <div
                className="h-56"
                role="img"
                aria-label="Bar chart of tasks completed on each day this week"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.week} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={AXIS.grid} />
                    <XAxis dataKey="label" tick={AXIS.tick} tickLine={false} axisLine={false} />
                    <YAxis
                      allowDecimals={false}
                      tick={AXIS.tick}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'rgb(19 29 49 / 0.04)' }}
                    />
                    <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {data.week.map((d) => (
                        <Cell key={d.date} fill={d.date === today ? SERIES.completed : '#87a37f'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Activity heatmap */}
            <Card className="xl:col-span-2">
              <CardHeader
                title="Consistency"
                description={`${data.heat.activeDays} active days in the last 12 weeks · current streak ${data.heat.streak} ${data.heat.streak === 1 ? 'day' : 'days'}`}
              />
              <div className="overflow-x-auto">
                <div
                  className="flex gap-1"
                  role="img"
                  aria-label="Heatmap of tasks completed per day over the last 12 weeks"
                >
                  {data.heat.columns.map((col) => (
                    <div key={col[0].date} className="flex flex-col gap-1">
                      {col.map((cell) => (
                        <span
                          key={cell.date}
                          title={
                            cell.future ? '' : `${formatDate(cell.date)}: ${cell.count} completed`
                          }
                          className={cn(
                            'size-4 rounded-[4px] sm:size-5',
                            cell.future && 'opacity-0',
                          )}
                          style={{ background: heatColor(cell.count, data.heat.max) }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-navy-500">
                Less
                {[0, 1, 2, 3, 4].map((l) => (
                  <span
                    key={l}
                    className="size-3 rounded-[3px]"
                    style={{ background: heatColor(l, 4) }}
                  />
                ))}
                More
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {/* Project progress */}
            <Card className="xl:col-span-2">
              <CardHeader
                title="Project progress"
                description="Completed tasks out of all tasks per project"
              />
              {activeProjects.length === 0 ? (
                <p className="text-sm text-navy-500">No active projects.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {activeProjects.map(({ project, progress }) => (
                    <li key={project.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <Link
                          to={`/projects/${project.id}`}
                          className="truncate font-medium hover:text-sage-700 hover:underline"
                        >
                          {project.name}
                        </Link>
                        <span className="shrink-0 text-navy-500">
                          <span className="font-semibold text-navy-900">{progress.percent}%</span> ·{' '}
                          {progress.completedTasks}/{progress.totalTasks} tasks
                          {progress.overdueTasks > 0 && (
                            <span className="text-red-700"> · {progress.overdueTasks} overdue</span>
                          )}
                        </span>
                      </div>
                      <ProgressBar value={progress.percent} label={`${project.name} progress`} />
                      {progress.nextDeadline && (
                        <p className="mt-1 text-xs text-navy-500">
                          Next deadline: {relativeDue(progress.nextDeadline, today).toLowerCase()}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Overdue summary */}
            <Card>
              <CardHeader
                title="Overdue tasks"
                description={data.overdue.length ? 'Oldest first' : 'Nothing overdue. Nice work!'}
              />
              <ul className="flex flex-col gap-2">
                {data.overdue.slice(0, 8).map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
                    <Link
                      to={`/tasks/${t.id}`}
                      className="min-w-0 flex-1 truncate hover:text-sage-700 hover:underline"
                    >
                      {t.title}
                    </Link>
                    <span className="shrink-0 text-xs text-red-700">
                      {relativeDue(t.due_date!, today).replace(' overdue', '')}
                    </span>
                  </li>
                ))}
              </ul>
              {data.overdue.length > 8 && (
                <Link
                  to="/tasks"
                  className="mt-3 inline-block text-sm font-semibold text-sage-700 hover:underline"
                >
                  View all {data.overdue.length}
                </Link>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

function Stat({
  label,
  value,
  sub,
  alert,
}: {
  label: string
  value: number | string
  sub?: string
  alert?: boolean
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-navy-500">{label}</p>
      <p className={cn('mt-1 font-heading text-3xl font-extrabold', alert && 'text-red-700')}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-navy-500">{sub}</p>}
    </Card>
  )
}

function StatusBar({ slices }: { slices: ReturnType<typeof statusDistribution> }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (!total) return <div className="h-4 rounded-full bg-cream-200" />
  return (
    <div
      className="flex h-4 gap-[2px] overflow-hidden rounded-full"
      role="img"
      aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(', ')}
    >
      {slices
        .filter((s) => s.value > 0)
        .map((s) => (
          <span
            key={s.key}
            title={`${s.label}: ${s.value}`}
            style={{ width: `${(s.value / total) * 100}%`, background: STATUS_COLORS[s.key] }}
          />
        ))}
    </div>
  )
}

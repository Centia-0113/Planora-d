import { useMemo, useState } from 'react'
import { CheckSquare, Plus, Search, X } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Alert, Button, EmptyState, ErrorState, Select, Spinner } from '@/components/ui'
import { errorMessage } from '@/lib/query'
import { useProjects } from '@/features/projects/api'
import { useAllSubtasks, useCategories, useTasks } from '@/features/tasks/api'
import { TaskFormModal } from '@/features/tasks/components/TaskFormModal'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import {
  defaultFilters,
  filterTasks,
  groupSubtasksByTask,
  PRIORITY_LABELS,
  sortTasks,
  summarizeTasks,
  type DueFilter,
  type TaskFilters,
  type TaskSort,
} from '@/features/tasks/logic'
import { useToggleTask } from '@/features/tasks/useToggleTask'
import { useWorkspace } from '@/features/workspace/workspace-context'

const sortOptions: { value: TaskSort; label: string }[] = [
  { value: 'due_asc', label: 'Due date (soonest)' },
  { value: 'due_desc', label: 'Due date (latest)' },
  { value: 'priority', label: 'Priority' },
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title (A–Z)' },
]

const dueTabs: { value: DueFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Next 7 days' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'no_date', label: 'No date' },
]

export function TasksPage() {
  const { today } = useWorkspace()
  const tasks = useTasks()
  const categories = useCategories()
  const projects = useProjects()
  const subtasks = useAllSubtasks()
  const { toggle, pendingId, error: toggleError } = useToggleTask()

  const [filters, setFilters] = useState<TaskFilters>(defaultFilters)
  const [sort, setSort] = useState<TaskSort>('due_asc')
  const [creating, setCreating] = useState(false)

  const visible = useMemo(
    () => sortTasks(filterTasks(tasks.data ?? [], filters, today), sort),
    [tasks.data, filters, sort, today],
  )
  const summary = useMemo(() => summarizeTasks(tasks.data ?? [], today), [tasks.data, today])
  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  )
  const projectById = useMemo(
    () => new Map((projects.data ?? []).map((p) => [p.id, p])),
    [projects.data],
  )
  const subtasksByTask = useMemo(() => groupSubtasksByTask(subtasks.data ?? []), [subtasks.data])

  const set = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }))
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(defaultFilters)

  return (
    <PageContainer
      title="My Tasks"
      description={`${summary.pending} open · ${summary.overdue} overdue · ${summary.completed} completed`}
      actions={
        <Button
          leftIcon={<Plus className="size-4" aria-hidden />}
          onClick={() => setCreating(true)}
        >
          New task
        </Button>
      }
    >
      {/* Due-date tabs */}
      <div
        role="tablist"
        aria-label="Filter by due date"
        className="mb-4 flex gap-1 overflow-x-auto pb-1"
      >
        {dueTabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={filters.due === tab.value}
            onClick={() => set('due', tab.value)}
            className={
              filters.due === tab.value
                ? 'shrink-0 rounded-full bg-navy-800 px-3.5 py-1.5 text-sm font-semibold text-cream-50'
                : 'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium text-navy-600 hover:bg-navy-50'
            }
          >
            {tab.label}
            {tab.value === 'overdue' && summary.overdue > 0 && (
              <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs text-white">
                {summary.overdue}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 grid gap-3 rounded-card border border-cream-300 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <Search
            className="pointer-events-none absolute top-3.5 left-3 size-4 text-navy-400"
            aria-hidden
          />
          <input
            id="task-search"
            type="search"
            placeholder="Search by title…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            className="h-11 w-full rounded-xl border border-navy-200 bg-white pr-3 pl-9 text-sm focus:border-sage-500 focus:ring-2 focus:ring-sage-200 focus:outline-none"
          />
        </div>
        <Select
          label="Status"
          hideLabel
          value={filters.status}
          onChange={(e) => set('status', e.target.value as TaskFilters['status'])}
          options={[
            { value: 'open', label: 'Open tasks' },
            { value: 'all', label: 'All statuses' },
            { value: 'todo', label: 'To do' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
        <Select
          label="Priority"
          hideLabel
          value={filters.priority}
          onChange={(e) => set('priority', e.target.value as TaskFilters['priority'])}
          options={[
            { value: 'all', label: 'All priorities' },
            ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <Select
          label="Category"
          hideLabel
          value={filters.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
          options={[
            { value: 'all', label: 'All categories' },
            ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          label="Sort by"
          hideLabel
          value={sort}
          onChange={(e) => setSort(e.target.value as TaskSort)}
          options={sortOptions}
        />
        {(projects.data?.length ?? 0) > 0 && (
          <Select
            label="Project"
            hideLabel
            value={filters.projectId}
            onChange={(e) => set('projectId', e.target.value)}
            options={[
              { value: 'all', label: 'All projects' },
              { value: 'none', label: 'Not in a project' },
              ...(projects.data ?? []).map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        )}
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            className="self-center justify-self-start"
            leftIcon={<X className="size-4" aria-hidden />}
            onClick={() => setFilters(defaultFilters)}
          >
            Clear filters
          </Button>
        )}
      </div>

      {toggleError && (
        <div className="mb-4">
          <Alert>{errorMessage(toggleError)}</Alert>
        </div>
      )}

      {tasks.isPending ? (
        <div className="flex justify-center py-16 text-navy-500">
          <Spinner label="Loading tasks" />
        </div>
      ) : tasks.isError ? (
        <ErrorState message={errorMessage(tasks.error)} onRetry={() => void tasks.refetch()} />
      ) : (tasks.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<CheckSquare className="size-6" aria-hidden />}
          title="No tasks yet"
          description="Capture your first responsibility. You can add a due date, priority and category."
          action={<Button onClick={() => setCreating(true)}>Create your first task</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No tasks match these filters"
          description="Try a different search or clear the filters."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters(defaultFilters)}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-navy-500" aria-live="polite">
            Showing {visible.length} of {tasks.data!.length} tasks
          </p>
          <ul className="flex flex-col gap-2">
            {visible.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                category={task.category_id ? categoryById.get(task.category_id) : undefined}
                project={task.project_id ? projectById.get(task.project_id) : undefined}
                subtasks={subtasksByTask.get(task.id)}
                onToggle={toggle}
                toggling={pendingId === task.id}
              />
            ))}
          </ul>
        </>
      )}

      {creating && <TaskFormModal open onClose={() => setCreating(false)} />}
    </PageContainer>
  )
}

import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  ProgressBar,
  Select,
  Spinner,
} from '@/components/ui'
import { formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import { ReminderList } from '@/features/notifications/components/ReminderList'
import { useProjects } from '@/features/projects/api'
import {
  useAllSubtasks,
  useCategories,
  useCreateSubtask,
  useDeleteSubtask,
  useDeleteTask,
  useDependencies,
  useTask,
  useTasks,
  useUpdateSubtask,
  useUpdateTask,
} from '@/features/tasks/api'
import {
  CategoryBadge,
  DueBadge,
  PriorityBadge,
  StatusBadge,
} from '@/features/tasks/components/TaskBadges'
import { TaskFormModal } from '@/features/tasks/components/TaskFormModal'
import { STATUS_LABELS, subtaskProgress, taskProgress } from '@/features/tasks/logic'
import { useWorkspace } from '@/features/workspace/workspace-context'
import type { Subtask, TaskStatus } from '@/types/database'

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { today } = useWorkspace()
  const task = useTask(taskId)
  const allTasks = useTasks()
  const categories = useCategories()
  const projects = useProjects()
  const allSubtasks = useAllSubtasks()
  const dependencies = useDependencies()
  const update = useUpdateTask()
  const remove = useDeleteTask()

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const subtasks = useMemo(
    () => (allSubtasks.data ?? []).filter((s) => s.task_id === taskId),
    [allSubtasks.data, taskId],
  )
  const taskById = useMemo(
    () => new Map((allTasks.data ?? []).map((t) => [t.id, t])),
    [allTasks.data],
  )
  const blockedBy = (dependencies.data ?? []).filter((d) => d.task_id === taskId)
  const blocks = (dependencies.data ?? []).filter((d) => d.depends_on_task_id === taskId)

  if (task.isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading task" />
      </div>
    )
  }
  if (task.isError) {
    return (
      <PageContainer>
        <ErrorState title="Task not found" message={errorMessage(task.error)} />
        <Link to="/tasks" className="mt-4 inline-block text-sm font-semibold text-sage-700">
          ← Back to tasks
        </Link>
      </PageContainer>
    )
  }

  const t = task.data
  const completed = t.status === 'completed'
  const category = categories.data?.find((c) => c.id === t.category_id)
  const project = projects.data?.find((p) => p.id === t.project_id)
  const progress = taskProgress(t, subtasks)

  return (
    <PageContainer>
      <Link
        to="/tasks"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="size-4" aria-hidden /> All tasks
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2
            className={
              completed
                ? 'text-2xl font-extrabold text-navy-400 line-through sm:text-3xl'
                : 'text-2xl font-extrabold sm:text-3xl'
            }
          >
            {t.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            <CategoryBadge category={category} />
            <DueBadge due={t.due_date} today={today} completed={completed} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={completed ? 'secondary' : 'sage'}
            leftIcon={
              completed ? (
                <RotateCcw className="size-4" aria-hidden />
              ) : (
                <CheckCircle2 className="size-4" aria-hidden />
              )
            }
            loading={update.isPending}
            onClick={() =>
              update.mutate({ id: t.id, patch: { status: completed ? 'todo' : 'completed' } })
            }
          >
            {completed ? 'Reopen' : 'Mark complete'}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Pencil className="size-4" aria-hidden />}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            leftIcon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {(update.error || remove.error) && (
        <div className="mb-4">
          <Alert>{errorMessage(update.error ?? remove.error)}</Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            {t.description ? (
              <p className="text-sm whitespace-pre-wrap text-navy-700">{t.description}</p>
            ) : (
              <p className="text-sm text-navy-400">No description.</p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Subtasks"
              description={
                subtasks.length
                  ? `${subtaskProgress(subtasks).done} of ${subtasks.length} done`
                  : 'Break this task into smaller steps.'
              }
            />
            {subtasks.length > 0 && (
              <ProgressBar value={progress} label="Task progress" className="mb-4" />
            )}
            <SubtaskList taskId={t.id} subtasks={subtasks} />
          </Card>

          {(blockedBy.length > 0 || blocks.length > 0) && (
            <Card>
              <CardHeader title="Dependencies" />
              {blockedBy.length > 0 && (
                <>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-navy-500 uppercase">
                    Waits for
                  </p>
                  <DependencyList
                    ids={blockedBy.map((d) => d.depends_on_task_id)}
                    taskById={taskById}
                    today={today}
                  />
                </>
              )}
              {blocks.length > 0 && (
                <>
                  <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-navy-500 uppercase">
                    Blocks
                  </p>
                  <DependencyList
                    ids={blocks.map((d) => d.task_id)}
                    taskById={taskById}
                    today={today}
                  />
                </>
              )}
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Details" />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-navy-500">Status</dt>
              <dd>
                <Select
                  label="Status"
                  hideLabel
                  value={t.status}
                  onChange={(e) =>
                    update.mutate({ id: t.id, patch: { status: e.target.value as TaskStatus } })
                  }
                  options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  className="h-9"
                />
              </dd>
              <dt className="text-navy-500">Start</dt>
              <dd>{formatDate(t.start_date)}</dd>
              <dt className="text-navy-500">Due</dt>
              <dd>{formatDate(t.due_date)}</dd>
              {t.completed_at && (
                <>
                  <dt className="text-navy-500">Completed</dt>
                  <dd>
                    {new Date(t.completed_at).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </>
              )}
              <dt className="text-navy-500">Project</dt>
              <dd>
                {project ? (
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1 font-medium text-sage-700 hover:underline"
                  >
                    <FolderKanban className="size-3.5" aria-hidden /> {project.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
              <dt className="text-navy-500">Created</dt>
              <dd>
                {new Date(t.created_at).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Reminders" />
            <ReminderList
              taskId={t.id}
              defaultTitle={`Reminder: ${t.title}`.slice(0, 200)}
              anchorDate={t.due_date}
            />
          </Card>
        </div>
      </div>

      {editing && <TaskFormModal open task={t} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        description="The task, its subtasks and reminders will be permanently deleted."
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(t.id, {
            onSuccess: () => navigate('/tasks', { replace: true }),
            onSettled: () => setConfirmDelete(false),
          })
        }
      />
    </PageContainer>
  )
}

function DependencyList({
  ids,
  taskById,
  today,
}: {
  ids: string[]
  taskById: Map<string, import('@/types/database').Task>
  today: string
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {ids.map((id) => {
        const dep = taskById.get(id)
        if (!dep) return null
        return (
          <li key={id} className="flex items-center gap-2 text-sm">
            <GitBranch className="size-4 text-navy-400" aria-hidden />
            <Link
              to={`/tasks/${id}`}
              className={
                dep.status === 'completed'
                  ? 'text-navy-400 line-through'
                  : 'font-medium hover:text-sage-700'
              }
            >
              {dep.title}
            </Link>
            <DueBadge due={dep.due_date} today={today} completed={dep.status === 'completed'} />
          </li>
        )
      })}
    </ul>
  )
}

function SubtaskList({ taskId, subtasks }: { taskId: string; subtasks: Subtask[] }) {
  const create = useCreateSubtask()
  const update = useUpdateSubtask()
  const remove = useDeleteSubtask()
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  function add(e: FormEvent) {
    e.preventDefault()
    const value = title.trim()
    if (!value) return
    create.mutate(
      { taskId, title: value.slice(0, 200), position: subtasks.length },
      { onSuccess: () => setTitle('') },
    )
  }

  function saveEdit(id: string) {
    const value = editTitle.trim()
    if (value) update.mutate({ id, patch: { title: value.slice(0, 200) } })
    setEditingId(null)
  }

  return (
    <div>
      {(create.error || update.error || remove.error) && (
        <div className="mb-3">
          <Alert>{errorMessage(create.error ?? update.error ?? remove.error)}</Alert>
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {subtasks.map((s) => (
          <li
            key={s.id}
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-cream-50"
          >
            <Checkbox
              checked={s.is_completed}
              onChange={(checked) => update.mutate({ id: s.id, patch: { is_completed: checked } })}
              label={`Mark subtask "${s.title}" ${s.is_completed ? 'not done' : 'done'}`}
            />
            {editingId === s.id ? (
              <input
                autoFocus
                aria-label="Subtask title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => saveEdit(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(s.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="h-8 flex-1 rounded-lg border border-navy-200 px-2 text-sm focus:border-sage-500 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(s.id)
                  setEditTitle(s.title)
                }}
                className={
                  s.is_completed
                    ? 'flex-1 text-left text-sm text-navy-400 line-through'
                    : 'flex-1 text-left text-sm'
                }
                aria-label={`Edit subtask ${s.title}`}
              >
                {s.title}
              </button>
            )}
            <button
              type="button"
              onClick={() => remove.mutate(s.id)}
              className="rounded-lg p-1 text-navy-300 opacity-100 hover:text-red-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
              aria-label={`Delete subtask ${s.title}`}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <label htmlFor="new-subtask" className="sr-only">
          New subtask
        </label>
        <input
          id="new-subtask"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a subtask…"
          maxLength={200}
          className="h-10 flex-1 rounded-xl border border-navy-200 px-3 text-sm focus:border-sage-500 focus:ring-2 focus:ring-sage-200 focus:outline-none"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          className="h-10"
          loading={create.isPending}
          leftIcon={<Plus className="size-4" aria-hidden />}
        >
          Add
        </Button>
      </form>
    </div>
  )
}

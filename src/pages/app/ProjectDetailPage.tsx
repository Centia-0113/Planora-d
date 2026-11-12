import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Diamond, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  ProgressBar,
  Spinner,
  Textarea,
} from '@/components/ui'
import { formatDate, relativeDue } from '@/lib/dates'
import { emptyToNull, errorMessage } from '@/lib/query'
import { useDocuments } from '@/features/documents/api'
import {
  useCreateMilestone,
  useDeleteMilestone,
  useDeleteProject,
  useMilestones,
  useProject,
  useUpdateMilestone,
} from '@/features/projects/api'
import { HealthBadge, ProjectStatusBadge } from '@/features/projects/components/ProjectBadges'
import { ProjectFormModal } from '@/features/projects/components/ProjectFormModal'
import { projectProgress } from '@/features/projects/logic'
import { useAllSubtasks, useCategories, useTasks } from '@/features/tasks/api'
import { TaskFormModal } from '@/features/tasks/components/TaskFormModal'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import { groupSubtasksByTask, sortTasks } from '@/features/tasks/logic'
import { useToggleTask } from '@/features/tasks/useToggleTask'
import { useWorkspace } from '@/features/workspace/workspace-context'
import type { Milestone } from '@/types/database'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { today } = useWorkspace()
  const project = useProject(projectId)
  const tasks = useTasks()
  const milestones = useMilestones()
  const categories = useCategories()
  const subtasks = useAllSubtasks()
  const documents = useDocuments()
  const remove = useDeleteProject()
  const { toggle, pendingId } = useToggleTask()

  const [editing, setEditing] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState<Milestone | 'new' | null>(null)

  const projectTasks = useMemo(
    () =>
      sortTasks(
        (tasks.data ?? []).filter((t) => t.project_id === projectId),
        'due_asc',
      ),
    [tasks.data, projectId],
  )
  const projectMilestones = useMemo(
    () => (milestones.data ?? []).filter((m) => m.project_id === projectId),
    [milestones.data, projectId],
  )
  const projectDocs = (documents.data ?? []).filter((d) => d.project_id === projectId)
  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  )
  const subtasksByTask = useMemo(() => groupSubtasksByTask(subtasks.data ?? []), [subtasks.data])

  if (project.isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading project" />
      </div>
    )
  }
  if (project.isError) {
    return (
      <PageContainer>
        <ErrorState title="Project not found" message={errorMessage(project.error)} />
      </PageContainer>
    )
  }

  const p = project.data
  const progress = projectProgress(p, projectTasks, projectMilestones, today)
  const overdueTasks = projectTasks.filter(
    (t) => t.status !== 'completed' && t.due_date && t.due_date < today,
  )

  return (
    <PageContainer>
      <Link
        to="/projects"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="size-4" aria-hidden /> All projects
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold sm:text-3xl">{p.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-navy-500">
            <ProjectStatusBadge status={p.status} />
            <HealthBadge health={progress.health} />
            <span>
              {formatDate(p.start_date)} → {formatDate(p.end_date)}
            </span>
          </div>
          {p.description && (
            <p className="mt-3 max-w-2xl text-sm whitespace-pre-wrap text-navy-600">
              {p.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
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

      {/* Progress summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 sm:col-span-2">
          <p className="text-sm text-navy-500">Overall progress</p>
          <p className="mt-1 font-heading text-3xl font-extrabold">{progress.percent}%</p>
          <ProgressBar value={progress.percent} label="Project progress" className="mt-3" />
          <p className="mt-2 text-xs text-navy-500">
            Completed tasks out of all tasks in this project.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-navy-500">Tasks</p>
          <p className="mt-1 font-heading text-3xl font-extrabold">
            {progress.completedTasks}
            <span className="text-lg text-navy-400">/{progress.totalTasks}</span>
          </p>
          <p className="mt-1 text-xs text-navy-500">
            {progress.outstandingTasks} outstanding
            {progress.overdueTasks > 0 && (
              <span className="font-semibold text-red-700"> · {progress.overdueTasks} overdue</span>
            )}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-navy-500">Next deadline</p>
          <p className="mt-1 font-heading text-xl font-extrabold">
            {progress.nextDeadline ? formatDate(progress.nextDeadline) : '—'}
          </p>
          {progress.nextDeadline && (
            <p className="mt-1 text-xs text-navy-500">
              {relativeDue(progress.nextDeadline, today)}
            </p>
          )}
        </Card>
      </div>

      {overdueTasks.length > 0 && (
        <div className="mb-6">
          <Alert>
            {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'activity' : 'activities'}:{' '}
            {overdueTasks
              .slice(0, 3)
              .map((t) => t.title)
              .join(', ')}
            {overdueTasks.length > 3 && '…'}
          </Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Tasks"
              action={
                <Button
                  size="sm"
                  leftIcon={<Plus className="size-4" aria-hidden />}
                  onClick={() => setAddingTask(true)}
                >
                  Add task
                </Button>
              }
            />
            {projectTasks.length === 0 ? (
              <EmptyState
                title="No tasks in this project"
                description="Add tasks to start tracking progress."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {projectTasks.map((t) => (
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
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              title="Milestones"
              description={
                progress.totalMilestones
                  ? `${progress.completedMilestones} of ${progress.totalMilestones} reached`
                  : 'Key checkpoints for this project.'
              }
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMilestoneForm('new')}
                  aria-label="Add milestone"
                >
                  <Plus className="size-4" aria-hidden />
                </Button>
              }
            />
            {progress.totalMilestones > 0 && (
              <ProgressBar
                value={(progress.completedMilestones / progress.totalMilestones) * 100}
                label="Milestone progress"
                tone="navy"
                className="mb-3"
              />
            )}
            <MilestoneList
              milestones={projectMilestones}
              today={today}
              onEdit={(m) => setMilestoneForm(m)}
            />
          </Card>

          <Card>
            <CardHeader title="Documents" />
            {projectDocs.length === 0 ? (
              <p className="text-sm text-navy-500">
                No documents linked.{' '}
                <Link to="/documents" className="font-semibold text-sage-700 hover:underline">
                  Upload one
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {projectDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 text-navy-400" aria-hidden />
                    <Link
                      to={`/documents?doc=${d.id}`}
                      className="truncate hover:text-sage-700 hover:underline"
                    >
                      {d.file_name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {editing && <ProjectFormModal project={p} onClose={() => setEditing(false)} />}
      {addingTask && (
        <TaskFormModal open onClose={() => setAddingTask(false)} defaults={{ project_id: p.id }} />
      )}
      {milestoneForm && (
        <MilestoneFormModal
          projectId={p.id}
          milestone={milestoneForm === 'new' ? undefined : milestoneForm}
          onClose={() => setMilestoneForm(null)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        description="Milestones are deleted. Tasks and documents stay in your workspace but are no longer linked to the project."
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(p.id, {
            onSuccess: () => navigate('/projects', { replace: true }),
            onSettled: () => setConfirmDelete(false),
          })
        }
      />
    </PageContainer>
  )
}

function MilestoneList({
  milestones,
  today,
  onEdit,
}: {
  milestones: Milestone[]
  today: string
  onEdit: (m: Milestone) => void
}) {
  const update = useUpdateMilestone()
  if (!milestones.length) return <p className="text-sm text-navy-500">No milestones yet.</p>
  return (
    <ul className="flex flex-col gap-1">
      {milestones.map((m) => {
        const late = !m.is_completed && m.due_date && m.due_date < today
        return (
          <li key={m.id} className="flex items-start gap-3 rounded-lg px-1 py-2">
            <Checkbox
              className="mt-0.5"
              checked={m.is_completed}
              onChange={(checked) => update.mutate({ id: m.id, patch: { is_completed: checked } })}
              label={`Mark milestone "${m.title}" ${m.is_completed ? 'not reached' : 'reached'}`}
            />
            <button type="button" onClick={() => onEdit(m)} className="min-w-0 flex-1 text-left">
              <span
                className={
                  m.is_completed
                    ? 'flex items-center gap-1.5 text-sm text-navy-400 line-through'
                    : 'flex items-center gap-1.5 text-sm font-medium'
                }
              >
                <Diamond className="size-3.5 shrink-0 text-purple-600" aria-hidden />
                {m.title}
              </span>
              <span className={late ? 'text-xs font-medium text-red-700' : 'text-xs text-navy-500'}>
                {m.due_date
                  ? late
                    ? relativeDue(m.due_date, today)
                    : formatDate(m.due_date)
                  : 'No date'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function MilestoneFormModal({
  projectId,
  milestone,
  onClose,
}: {
  projectId: string
  milestone?: Milestone
  onClose: () => void
}) {
  const create = useCreateMilestone()
  const update = useUpdateMilestone()
  const remove = useDeleteMilestone()
  const [title, setTitle] = useState(milestone?.title ?? '')
  const [description, setDescription] = useState(milestone?.description ?? '')
  const [dueDate, setDueDate] = useState(milestone?.due_date ?? '')
  const [error, setError] = useState<string>()
  const busy = create.isPending || update.isPending || remove.isPending

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Give the milestone a title.')
    const input = {
      title: title.trim().slice(0, 200),
      description: emptyToNull(description),
      due_date: emptyToNull(dueDate),
    }
    if (milestone) await update.mutateAsync({ id: milestone.id, patch: input })
    else await create.mutateAsync({ projectId, input })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={milestone ? 'Edit milestone' : 'New milestone'}>
      <form
        onSubmit={(e) => void submit(e).catch(() => undefined)}
        noValidate
        className="flex flex-col gap-4"
      >
        {(create.error || update.error || remove.error) && (
          <Alert>{errorMessage(create.error ?? update.error ?? remove.error)}</Alert>
        )}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={error}
          autoFocus
        />
        <Input
          label="Deadline"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <div className="flex justify-between gap-2">
          {milestone ? (
            <Button
              variant="ghost"
              onClick={() => remove.mutate(milestone.id, { onSuccess: onClose })}
              disabled={busy}
              leftIcon={<Trash2 className="size-4" aria-hidden />}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

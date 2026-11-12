import { useState, type FormEvent } from 'react'
import { Alert, Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { emptyToNull, errorMessage } from '@/lib/query'
import type { Task } from '@/types/database'
import { useProjects } from '@/features/projects/api'
import { useCategories, useCreateTask, useUpdateTask } from '../api'
import { PRIORITY_LABELS, STATUS_LABELS, validateTaskForm, type TaskFormValues } from '../logic'

interface TaskFormModalProps {
  open: boolean
  onClose: () => void
  task?: Task
  /** Pre-fill values for a new task (e.g. a project or due date). */
  defaults?: Partial<TaskFormValues>
  onSaved?: (task: Task) => void
}

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }))

export function TaskFormModal({ open, onClose, task, defaults, onSaved }: TaskFormModalProps) {
  const categories = useCategories()
  const projects = useProjects()
  const create = useCreateTask()
  const update = useUpdateTask()

  const [values, setValues] = useState<TaskFormValues>(() => ({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'todo',
    priority: task?.priority ?? 'medium',
    category_id: task?.category_id ?? '',
    project_id: task?.project_id ?? '',
    start_date: task?.start_date ?? '',
    due_date: task?.due_date ?? '',
    ...defaults,
  }))
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormValues, string>>>({})
  const saving = create.isPending || update.isPending
  const mutationError = create.error ?? update.error

  const set =
    (field: keyof TaskFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = validateTaskForm(values)
    setErrors(next)
    if (Object.keys(next).length) return

    const input = {
      title: values.title.trim(),
      description: emptyToNull(values.description),
      status: values.status,
      priority: values.priority,
      category_id: emptyToNull(values.category_id),
      project_id: emptyToNull(values.project_id),
      start_date: emptyToNull(values.start_date),
      due_date: emptyToNull(values.due_date),
    }
    const saved = task
      ? await update.mutateAsync({ id: task.id, patch: input })
      : await create.mutateAsync(input)
    onSaved?.(saved)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <form
        onSubmit={(e) => void handleSubmit(e).catch(() => undefined)}
        noValidate
        className="flex flex-col gap-4"
      >
        {mutationError && <Alert>{errorMessage(mutationError)}</Alert>}
        <Input
          label="Title"
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          autoFocus
          maxLength={200}
        />
        <Textarea
          label="Description"
          value={values.description}
          onChange={set('description')}
          error={errors.description}
          rows={3}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            value={values.status}
            onChange={set('status')}
            options={toOptions(STATUS_LABELS)}
          />
          <Select
            label="Priority"
            value={values.priority}
            onChange={set('priority')}
            options={toOptions(PRIORITY_LABELS)}
          />
          <Select
            label="Category"
            value={values.category_id}
            onChange={set('category_id')}
            placeholder="No category"
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Project"
            value={values.project_id}
            onChange={set('project_id')}
            placeholder="No project"
            options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
          <Input
            label="Start date"
            type="date"
            value={values.start_date}
            onChange={set('start_date')}
            error={errors.start_date}
          />
          <Input
            label="Due date"
            type="date"
            value={values.due_date}
            onChange={set('due_date')}
            error={errors.due_date}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {task ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

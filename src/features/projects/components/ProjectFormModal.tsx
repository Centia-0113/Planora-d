import { useState, type FormEvent } from 'react'
import { Alert, Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { emptyToNull, errorMessage } from '@/lib/query'
import type { Project, ProjectStatus, TaskPriority } from '@/types/database'
import { PRIORITY_LABELS } from '@/features/tasks/logic'
import { useCreateProject, useUpdateProject } from '../api'
import { PROJECT_STATUS_LABELS } from '../logic'

export function ProjectFormModal({
  project,
  onClose,
  onSaved,
}: {
  project?: Project
  onClose: () => void
  onSaved?: (project: Project) => void
}) {
  const create = useCreateProject()
  const update = useUpdateProject()
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'planning')
  const [priority, setPriority] = useState<TaskPriority>(project?.priority ?? 'medium')
  const [startDate, setStartDate] = useState(project?.start_date ?? '')
  const [endDate, setEndDate] = useState(project?.end_date ?? '')
  const [errors, setErrors] = useState<{ name?: string; endDate?: string }>({})
  const saving = create.isPending || update.isPending

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'Give the project a name.'
    else if (name.trim().length > 120) next.name = 'Names can be up to 120 characters.'
    if (startDate && endDate && startDate > endDate)
      next.endDate = 'The end date cannot be before the start date.'
    setErrors(next)
    if (Object.keys(next).length) return

    const input = {
      name: name.trim(),
      description: emptyToNull(description),
      status,
      priority,
      start_date: emptyToNull(startDate),
      end_date: emptyToNull(endDate),
    }
    const saved = project
      ? await update.mutateAsync({ id: project.id, patch: input })
      : await create.mutateAsync(input)
    onSaved?.(saved)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={project ? 'Edit project' : 'New project'}>
      <form
        onSubmit={(e) => void handleSubmit(e).catch(() => undefined)}
        noValidate
        className="flex flex-col gap-4"
      >
        {(create.error || update.error) && (
          <Alert>{errorMessage(create.error ?? update.error)}</Alert>
        )}
        <Input
          label="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
          maxLength={120}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            options={Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End date (deadline)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={errors.endDate}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {project ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

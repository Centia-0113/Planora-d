import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, FolderKanban, Plus, Sparkles } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Button,
  EmptyState,
  ErrorState,
  ProgressBar,
  Select,
  Spinner,
  buttonClasses,
} from '@/components/ui'
import { formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import { useMilestones, useProjects } from '@/features/projects/api'
import { HealthBadge, ProjectStatusBadge } from '@/features/projects/components/ProjectBadges'
import { ProjectFormModal } from '@/features/projects/components/ProjectFormModal'
import { PROJECT_STATUS_LABELS, projectProgress } from '@/features/projects/logic'
import { useTasks } from '@/features/tasks/api'
import { useWorkspace } from '@/features/workspace/workspace-context'
import type { ProjectStatus } from '@/types/database'

export function ProjectsPage() {
  const { today } = useWorkspace()
  const projects = useProjects()
  const tasks = useTasks()
  const milestones = useMilestones()
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState<ProjectStatus | 'all' | 'open'>('open')

  const rows = useMemo(() => {
    return (projects.data ?? [])
      .filter((p) =>
        status === 'all'
          ? true
          : status === 'open'
            ? p.status !== 'completed'
            : p.status === status,
      )
      .map((p) => ({
        project: p,
        progress: projectProgress(
          p,
          (tasks.data ?? []).filter((t) => t.project_id === p.id),
          (milestones.data ?? []).filter((m) => m.project_id === p.id),
          today,
        ),
      }))
  }, [projects.data, tasks.data, milestones.data, status, today])

  return (
    <PageContainer
      title="Projects"
      description="Group related tasks, set milestones and track progress."
      actions={
        <>
          <Link to="/ai-planner" className={buttonClasses('secondary')}>
            <Sparkles className="size-4" aria-hidden /> Plan from a document
          </Link>
          <Button
            leftIcon={<Plus className="size-4" aria-hidden />}
            onClick={() => setCreating(true)}
          >
            New project
          </Button>
        </>
      }
    >
      <div className="mb-5 max-w-xs">
        <Select
          label="Show"
          hideLabel
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          options={[
            { value: 'open', label: 'Open projects' },
            { value: 'all', label: 'All projects' },
            ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      {projects.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading projects" />
        </div>
      ) : projects.isError ? (
        <ErrorState
          message={errorMessage(projects.error)}
          onRetry={() => void projects.refetch()}
        />
      ) : (projects.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-6" aria-hidden />}
          title="No projects yet"
          description="Create a project to group related tasks and milestones, or let AI draft one from a document."
          action={<Button onClick={() => setCreating(true)}>Create a project</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState title="No projects match this filter" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ project, progress }) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="flex h-full flex-col rounded-card border border-cream-300 bg-white p-5 shadow-card transition-colors hover:border-sage-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading text-lg font-bold">{project.name}</h3>
                  <ProjectStatusBadge status={project.status} />
                </div>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-navy-500">{project.description}</p>
                )}
                <div className="mt-auto pt-5">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold">{progress.percent}%</span>
                    <span className="text-navy-500">
                      {progress.completedTasks}/{progress.totalTasks} tasks
                      {progress.totalMilestones > 0 &&
                        ` · ${progress.completedMilestones}/${progress.totalMilestones} milestones`}
                    </span>
                  </div>
                  <ProgressBar value={progress.percent} label={`${project.name} progress`} />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-navy-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3.5" aria-hidden />
                      {project.end_date ? `Ends ${formatDate(project.end_date)}` : 'No end date'}
                    </span>
                    <HealthBadge health={progress.health} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && <ProjectFormModal onClose={() => setCreating(false)} />}
    </PageContainer>
  )
}

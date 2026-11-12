import { Link } from 'react-router-dom'
import { FolderKanban, ListChecks } from 'lucide-react'
import { Checkbox } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Project, Subtask, Task, TaskCategory } from '@/types/database'
import { subtaskProgress } from '../logic'
import { CategoryBadge, DueBadge, PriorityBadge } from './TaskBadges'

export function TaskRow({
  task,
  today,
  category,
  project,
  subtasks = [],
  onToggle,
  toggling,
}: {
  task: Task
  today: string
  category?: TaskCategory
  project?: Project
  subtasks?: Subtask[]
  onToggle: (task: Task, completed: boolean) => void
  toggling?: boolean
}) {
  const completed = task.status === 'completed'
  const progress = subtaskProgress(subtasks)

  return (
    <li className="flex items-start gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3 shadow-card transition-colors hover:border-sage-300">
      <Checkbox
        className="mt-0.5"
        checked={completed}
        disabled={toggling}
        onChange={(checked) => onToggle(task, checked)}
        label={
          completed ? `Mark "${task.title}" as not completed` : `Mark "${task.title}" as completed`
        }
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/tasks/${task.id}`}
          className={cn(
            'block truncate font-medium hover:text-sage-700 hover:underline',
            completed ? 'text-navy-400 line-through' : 'text-navy-900',
          )}
        >
          {task.title}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <PriorityBadge priority={task.priority} />
          <CategoryBadge category={category} />
          <DueBadge due={task.due_date} today={today} completed={completed} />
          {task.status === 'in_progress' && (
            <span className="text-xs font-semibold text-blue-700">In progress</span>
          )}
          {project && (
            <Link
              to={`/projects/${project.id}`}
              className="inline-flex items-center gap-1 text-xs text-navy-500 hover:text-sage-700"
            >
              <FolderKanban className="size-3.5" aria-hidden />
              {project.name}
            </Link>
          )}
          {progress.total > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-navy-500">
              <ListChecks className="size-3.5" aria-hidden />
              {progress.done}/{progress.total} subtasks
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

import { addDays } from '@/lib/dates'
import type { Milestone, Project, ProjectStatus, Task } from '@/types/database'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
}

export interface ProjectProgress {
  /** 0–100 */
  percent: number
  completedTasks: number
  totalTasks: number
  outstandingTasks: number
  overdueTasks: number
  completedMilestones: number
  totalMilestones: number
  nextDeadline: string | null
  health: 'on_track' | 'at_risk' | 'overdue' | 'done'
}

/**
 * Defined calculation (not an average of percentages):
 * - With tasks: completed tasks / total tasks.
 * - Without tasks: completed milestones / total milestones.
 * - A project marked completed is 100%.
 */
export function projectProgress(
  project: Pick<Project, 'status' | 'end_date'>,
  tasks: Pick<Task, 'status' | 'due_date'>[],
  milestones: Pick<Milestone, 'is_completed' | 'due_date'>[],
  today: string,
): ProjectProgress {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.due_date && t.due_date < today,
  ).length
  const completedMilestones = milestones.filter((m) => m.is_completed).length

  let percent = 0
  if (project.status === 'completed') percent = 100
  else if (tasks.length) percent = Math.round((completedTasks / tasks.length) * 100)
  else if (milestones.length) percent = Math.round((completedMilestones / milestones.length) * 100)

  const upcoming = [
    ...tasks
      .filter((t) => t.status !== 'completed' && t.due_date && t.due_date >= today)
      .map((t) => t.due_date!),
    ...milestones
      .filter((m) => !m.is_completed && m.due_date && m.due_date >= today)
      .map((m) => m.due_date!),
  ].sort()

  let health: ProjectProgress['health'] = 'on_track'
  if (project.status === 'completed') health = 'done'
  else if ((project.end_date && project.end_date < today) || overdueTasks > 0) health = 'overdue'
  else if (project.end_date && project.end_date <= addDays(today, 7) && percent < 80)
    health = 'at_risk'

  return {
    percent,
    completedTasks,
    totalTasks: tasks.length,
    outstandingTasks: tasks.length - completedTasks,
    overdueTasks,
    completedMilestones,
    totalMilestones: milestones.length,
    nextDeadline: upcoming[0] ?? null,
    health,
  }
}

export const HEALTH_LABELS: Record<ProjectProgress['health'], string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  overdue: 'Overdue',
  done: 'Done',
}

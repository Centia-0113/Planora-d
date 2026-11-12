import { AlertTriangle, CalendarClock, CheckCircle2, Circle, CircleDot, Flag } from 'lucide-react'
import { cn } from '@/lib/cn'
import { relativeDue } from '@/lib/dates'
import type { CategoryColor, TaskCategory, TaskPriority, TaskStatus } from '@/types/database'
import { PRIORITY_LABELS, STATUS_LABELS } from '../logic'

const pill =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset'

const CATEGORY_COLORS: Record<CategoryColor, string> = {
  navy: 'bg-navy-50 text-navy-700 ring-navy-200',
  sage: 'bg-sage-50 text-sage-700 ring-sage-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: 'bg-red-50 text-red-700 ring-red-200',
  high: 'bg-amber-50 text-amber-800 ring-amber-200',
  medium: 'bg-navy-50 text-navy-700 ring-navy-200',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn(pill, PRIORITY_STYLES[priority])}>
      <Flag className="size-3" aria-hidden />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const Icon = status === 'completed' ? CheckCircle2 : status === 'in_progress' ? CircleDot : Circle
  const style =
    status === 'completed'
      ? 'bg-sage-50 text-sage-700 ring-sage-200'
      : status === 'in_progress'
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-cream-200 text-navy-700 ring-cream-400'
  return (
    <span className={cn(pill, style)}>
      <Icon className="size-3" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function CategoryBadge({ category }: { category: TaskCategory | undefined }) {
  if (!category) return null
  return <span className={cn(pill, CATEGORY_COLORS[category.color])}>{category.name}</span>
}

export function DueBadge({
  due,
  today,
  completed,
}: {
  due: string | null
  today: string
  completed: boolean
}) {
  if (!due) return null
  const overdue = !completed && due < today
  const soon = !completed && !overdue && due <= today
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        overdue ? 'text-red-700' : soon ? 'text-amber-700' : 'text-navy-500',
      )}
    >
      {overdue ? (
        <AlertTriangle className="size-3.5" aria-hidden />
      ) : (
        <CalendarClock className="size-3.5" aria-hidden />
      )}
      {completed ? `Was due ${due}` : relativeDue(due, today)}
    </span>
  )
}

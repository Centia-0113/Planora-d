import { Badge } from '@/components/ui'
import type { ProjectStatus } from '@/types/database'
import { HEALTH_LABELS, PROJECT_STATUS_LABELS, type ProjectProgress } from '../logic'

const STATUS_TONES = {
  planning: 'cream',
  active: 'navy',
  on_hold: 'amber',
  completed: 'sage',
} as const
const HEALTH_TONES = { on_track: 'sage', at_risk: 'amber', overdue: 'red', done: 'sage' } as const

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>
}

export function HealthBadge({ health }: { health: ProjectProgress['health'] }) {
  return <Badge tone={HEALTH_TONES[health]}>{HEALTH_LABELS[health]}</Badge>
}

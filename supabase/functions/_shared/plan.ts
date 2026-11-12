/**
 * Planora AI plan model + deterministic analysis.
 *
 * Shared by the generate-plan Edge Function (Deno) and the React review page,
 * so it must stay dependency-free plain TypeScript.
 */

export type DateSource = 'document' | 'suggested' | 'none' | 'user'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface PlanDate {
  /** ISO date (YYYY-MM-DD) or null. */
  value: string | null
  /** document = stated in the document; suggested = proposed by the AI; user = set during review; none = unknown. */
  source: DateSource
  /** Exact wording from the document that supports a "document" date. */
  quote: string | null
}

export interface PlanTask {
  key: string
  title: string
  description: string | null
  phase: string | null
  priority: Priority
  estimated_days: number | null
  start_date: PlanDate
  due_date: PlanDate
  depends_on: string[]
  milestone_key: string | null
  responsible: string | null
}

export interface PlanMilestone {
  key: string
  title: string
  description: string | null
  due_date: PlanDate
}

export interface PlanRisk {
  description: string
  severity: 'low' | 'medium' | 'high'
  mitigation: string | null
}

export interface AiPlan {
  project: {
    title: string
    summary: string | null
    objectives: string[]
    deliverables: string[]
    start_date: PlanDate
    end_date: PlanDate
  }
  milestones: PlanMilestone[]
  tasks: PlanTask[]
  risks: PlanRisk[]
  questions: string[]
  assumptions: string[]
}

export type IssueKind =
  | 'date_order'
  | 'dependency_order'
  | 'unknown_dependency'
  | 'dependency_cycle'
  | 'outside_project'
  | 'milestone_before_tasks'
  | 'missing_deadline'
  | 'suggested_deadline'
  | 'invalid_date'

export interface PlanIssue {
  kind: IssueKind
  severity: 'warning' | 'info'
  message: string
  task_keys: string[]
}

export interface StoredPlan extends AiPlan {
  issues: PlanIssue[]
  meta: {
    model: string
    document_name: string
    generated_at: string
    truncated: boolean
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isValidIsoDate(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

/** Clean up AI output: valid dates only, unique keys, known dependencies, consistent sources. */
export function normalizePlan(plan: AiPlan): { plan: AiPlan; issues: PlanIssue[] } {
  const issues: PlanIssue[] = []

  const cleanDate = (d: PlanDate, label: string, keys: string[]): PlanDate => {
    if (d.value !== null && !isValidIsoDate(d.value)) {
      issues.push({
        kind: 'invalid_date',
        severity: 'warning',
        message: `${label} had an unreadable date ("${d.value}") and was cleared.`,
        task_keys: keys,
      })
      return { value: null, source: 'none', quote: null }
    }
    if (d.value === null) return { value: null, source: 'none', quote: null }
    // A "document" date must be backed by a quote; otherwise treat it as a suggestion.
    if (d.source === 'document' && !d.quote?.trim()) return { ...d, source: 'suggested' }
    if (d.source === 'none') return { ...d, source: 'suggested' }
    return d
  }

  const seen = new Set<string>()
  const tasks = plan.tasks.map((t, i) => {
    let key = (t.key || `t${i + 1}`).trim()
    while (seen.has(key)) key = `${key}_${i + 1}`
    seen.add(key)
    return { ...t, key }
  })
  const taskKeys = new Set(tasks.map((t) => t.key))
  const milestoneKeys = new Set(plan.milestones.map((m) => m.key))

  const normalizedTasks = tasks.map((t) => {
    const unknown = t.depends_on.filter((k) => !taskKeys.has(k) || k === t.key)
    if (unknown.length) {
      issues.push({
        kind: 'unknown_dependency',
        severity: 'info',
        message: `"${t.title}" referred to unknown dependencies (${unknown.join(', ')}); they were removed.`,
        task_keys: [t.key],
      })
    }
    return {
      ...t,
      start_date: cleanDate(t.start_date, `Start of "${t.title}"`, [t.key]),
      due_date: cleanDate(t.due_date, `Deadline of "${t.title}"`, [t.key]),
      depends_on: [...new Set(t.depends_on.filter((k) => taskKeys.has(k) && k !== t.key))],
      milestone_key: t.milestone_key && milestoneKeys.has(t.milestone_key) ? t.milestone_key : null,
    }
  })

  return {
    plan: {
      ...plan,
      project: {
        ...plan.project,
        start_date: cleanDate(plan.project.start_date, 'Project start', []),
        end_date: cleanDate(plan.project.end_date, 'Project end', []),
      },
      milestones: plan.milestones.map((m) => ({
        ...m,
        due_date: cleanDate(m.due_date, `Milestone "${m.title}"`, []),
      })),
      tasks: normalizedTasks,
    },
    issues,
  }
}

/** Find scheduling conflicts and uncertain deadlines. Pure and deterministic. */
export function analysePlan(plan: AiPlan): PlanIssue[] {
  const issues: PlanIssue[] = []
  const byKey = new Map(plan.tasks.map((t) => [t.key, t]))
  const pStart = plan.project.start_date.value
  const pEnd = plan.project.end_date.value

  for (const t of plan.tasks) {
    const start = t.start_date.value
    const due = t.due_date.value

    if (start && due && start > due) {
      issues.push({
        kind: 'date_order',
        severity: 'warning',
        message: `"${t.title}" starts (${start}) after its deadline (${due}).`,
        task_keys: [t.key],
      })
    }

    for (const depKey of t.depends_on) {
      const dep = byKey.get(depKey)
      const depDue = dep?.due_date.value
      const myStart = start ?? due
      if (dep && depDue && myStart && myStart < depDue) {
        issues.push({
          kind: 'dependency_order',
          severity: 'warning',
          message: `"${t.title}" is scheduled before "${dep.title}" finishes (${depDue}), but depends on it.`,
          task_keys: [t.key, dep.key],
        })
      }
    }

    if ((pStart && start && start < pStart) || (pEnd && due && due > pEnd)) {
      issues.push({
        kind: 'outside_project',
        severity: 'warning',
        message: `"${t.title}" falls outside the project period.`,
        task_keys: [t.key],
      })
    }

    if (!due) {
      issues.push({
        kind: 'missing_deadline',
        severity: 'info',
        message: `"${t.title}" has no deadline. The document does not state one.`,
        task_keys: [t.key],
      })
    } else if (t.due_date.source === 'suggested') {
      issues.push({
        kind: 'suggested_deadline',
        severity: 'info',
        message: `The deadline for "${t.title}" (${due}) is a suggestion, not stated in the document.`,
        task_keys: [t.key],
      })
    }
  }

  for (const m of plan.milestones) {
    const mDue = m.due_date.value
    if (!mDue) continue
    const late = plan.tasks.filter(
      (t) => t.milestone_key === m.key && t.due_date.value && t.due_date.value > mDue,
    )
    if (late.length) {
      issues.push({
        kind: 'milestone_before_tasks',
        severity: 'warning',
        message: `Milestone "${m.title}" (${mDue}) is due before ${late.length} of its tasks finish.`,
        task_keys: late.map((t) => t.key),
      })
    }
  }

  const cycle = findDependencyCycle(plan.tasks)
  if (cycle) {
    issues.push({
      kind: 'dependency_cycle',
      severity: 'warning',
      message: `Circular dependency: ${cycle.map((k) => byKey.get(k)?.title ?? k).join(' → ')}.`,
      task_keys: cycle,
    })
  }

  return issues
}

/** Returns the keys forming a dependency cycle, or null. */
export function findDependencyCycle(
  tasks: Pick<PlanTask, 'key' | 'depends_on'>[],
): string[] | null {
  const deps = new Map(tasks.map((t) => [t.key, t.depends_on]))
  const state = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []

  const visit = (key: string): string[] | null => {
    if (state.get(key) === 'done') return null
    if (state.get(key) === 'visiting') return [...stack.slice(stack.indexOf(key)), key]
    state.set(key, 'visiting')
    stack.push(key)
    for (const next of deps.get(key) ?? []) {
      if (!deps.has(next)) continue
      const found = visit(next)
      if (found) return found
    }
    stack.pop()
    state.set(key, 'done')
    return null
  }

  for (const t of tasks) {
    const found = visit(t.key)
    if (found) return found
  }
  return null
}

/** Shape accepted by the approve_generated_plan database function. */
export interface ApprovalPayload {
  project: {
    name: string
    description: string | null
    start_date: string | null
    end_date: string | null
  }
  milestones: { title: string; description: string | null; due_date: string | null }[]
  tasks: {
    key: string
    title: string
    description: string | null
    priority: Priority
    start_date: string | null
    due_date: string | null
    depends_on: string[]
  }[]
}

export function toApprovalPayload(plan: AiPlan): ApprovalPayload {
  const keys = new Set(plan.tasks.map((t) => t.key))
  return {
    project: {
      name: plan.project.title.trim(),
      description: plan.project.summary?.trim() || null,
      start_date: plan.project.start_date.value,
      end_date: plan.project.end_date.value,
    },
    milestones: plan.milestones.map((m) => ({
      title: m.title.trim(),
      description: m.description?.trim() || null,
      due_date: m.due_date.value,
    })),
    tasks: plan.tasks.map((t) => ({
      key: t.key,
      title: t.title.trim(),
      description: t.description?.trim() || null,
      priority: t.priority,
      start_date: t.start_date.value,
      due_date: t.due_date.value,
      depends_on: t.depends_on.filter((k) => keys.has(k)),
    })),
  }
}

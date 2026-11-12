import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Diamond,
  FileText,
  HelpCircle,
  Info,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import {
  analysePlan,
  toApprovalPayload,
  type AiPlan,
  type DateSource,
  type PlanDate,
  type PlanIssue,
  type PlanTask,
  type Priority,
} from '@shared/plan'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  Input,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import { usePlan, useApprovePlan, useRejectPlan } from '@/features/ai/api'
import { useDocuments } from '@/features/documents/api'
import { useProjects } from '@/features/projects/api'
import { PRIORITY_LABELS } from '@/features/tasks/logic'
import { useWorkspace } from '@/features/workspace/workspace-context'

const SOURCE_BADGE: Record<
  DateSource,
  { tone: 'sage' | 'amber' | 'cream' | 'navy'; label: string }
> = {
  document: { tone: 'sage', label: 'From document' },
  suggested: { tone: 'amber', label: 'AI suggestion' },
  user: { tone: 'navy', label: 'Set by you' },
  none: { tone: 'cream', label: 'Not stated' },
}

export function PlanReviewPage() {
  const { planId } = useParams<{ planId: string }>()
  const plan = usePlan(planId)

  if (plan.isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading plan" />
      </div>
    )
  }
  if (plan.isError) {
    return (
      <PageContainer>
        <ErrorState title="Plan not found" message={errorMessage(plan.error)} />
      </PageContainer>
    )
  }
  return <PlanEditor key={plan.data.id} record={plan.data} />
}

function PlanEditor({ record }: { record: NonNullable<ReturnType<typeof usePlan>['data']> }) {
  const navigate = useNavigate()
  const { timezone } = useWorkspace()
  const documents = useDocuments()
  const projects = useProjects()
  const approve = useApprovePlan()
  const reject = useRejectPlan()
  const stored = record.plan
  const readOnly = record.status !== 'pending_review'

  const [draft, setDraft] = useState<AiPlan>(() => ({
    project: stored.project,
    milestones: stored.milestones,
    tasks: stored.tasks,
    risks: stored.risks,
    questions: stored.questions,
    assumptions: stored.assumptions,
  }))
  const [attachTo, setAttachTo] = useState('')
  const [confirmReject, setConfirmReject] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [formError, setFormError] = useState<string>()

  // Re-analyse live as the user edits, so conflicts reflect the current draft.
  const issues: PlanIssue[] = useMemo(() => analysePlan(draft), [draft])
  const warnings = issues.filter((i) => i.severity === 'warning')
  const issuesByTask = useMemo(() => {
    const map = new Map<string, PlanIssue[]>()
    for (const i of issues) for (const k of i.task_keys) map.set(k, [...(map.get(k) ?? []), i])
    return map
  }, [issues])
  const titleByKey = new Map(draft.tasks.map((t) => [t.key, t.title]))
  const doc = documents.data?.find((d) => d.id === record.document_id)

  const updateTask = (key: string, patch: Partial<PlanTask>) =>
    setDraft((d) => ({ ...d, tasks: d.tasks.map((t) => (t.key === key ? { ...t, ...patch } : t)) }))
  const userDate = (value: string): PlanDate =>
    value ? { value, source: 'user', quote: null } : { value: null, source: 'none', quote: null }
  const removeTask = (key: string) =>
    setDraft((d) => ({
      ...d,
      tasks: d.tasks
        .filter((t) => t.key !== key)
        .map((t) => ({ ...t, depends_on: t.depends_on.filter((k) => k !== key) })),
    }))
  const addTask = () => {
    const key = `new${Date.now()}`
    setExpanded(key)
    setDraft((d) => {
      return {
        ...d,
        tasks: [
          ...d.tasks,
          {
            key,
            title: 'New task',
            description: null,
            phase: null,
            priority: 'medium',
            estimated_days: null,
            start_date: { value: null, source: 'none', quote: null },
            due_date: { value: null, source: 'none', quote: null },
            depends_on: [],
            milestone_key: null,
            responsible: null,
          },
        ],
      }
    })
  }

  function handleApprove() {
    setFormError(undefined)
    if (!attachTo && !draft.project.title.trim()) return setFormError('Give the project a name.')
    if (draft.tasks.length === 0) return setFormError('Keep at least one task, or reject the plan.')
    if (draft.tasks.some((t) => !t.title.trim())) return setFormError('Every task needs a title.')
    approve.mutate(
      { planId: record.id, payload: toApprovalPayload(draft), projectId: attachTo || null },
      { onSuccess: (projectId) => navigate(`/projects/${projectId}`, { replace: true }) },
    )
  }

  return (
    <PageContainer>
      <Link
        to="/ai-planner"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="size-4" aria-hidden /> AI Planner
      </Link>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold sm:text-3xl">Review proposed plan</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-navy-500">
            <FileText className="size-4" aria-hidden />
            {doc ? (
              <Link
                to={`/documents?doc=${doc.id}`}
                className="font-medium text-sage-700 hover:underline"
              >
                {stored.meta.document_name}
              </Link>
            ) : (
              stored.meta.document_name
            )}
            <span>· generated {formatDateTime(stored.meta.generated_at, timezone)}</span>
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmReject(true)}>
              Reject
            </Button>
            <Button variant="sage" loading={approve.isPending} onClick={handleApprove}>
              Approve and create {draft.tasks.length} tasks
            </Button>
          </div>
        )}
      </div>

      {readOnly && (
        <div className="mb-5">
          <Alert tone={record.status === 'approved' ? 'success' : 'info'}>
            This plan was {record.status === 'approved' ? 'approved' : 'rejected'}
            {record.reviewed_at && ` on ${formatDateTime(record.reviewed_at, timezone)}`}.{' '}
            {record.project_id && (
              <Link to={`/projects/${record.project_id}`} className="font-semibold underline">
                Open the project
              </Link>
            )}
          </Alert>
        </div>
      )}
      {stored.meta.truncated && (
        <div className="mb-5">
          <Alert tone="info">
            The document was very long, so only its first part was analysed. Check for missing
            tasks.
          </Alert>
        </div>
      )}
      {(formError || approve.error || reject.error) && (
        <div className="mb-5">
          <Alert>{formError ?? errorMessage(approve.error ?? reject.error)}</Alert>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <Card>
            <CardHeader title="Project" />
            <div className="flex flex-col gap-4">
              {!readOnly && (projects.data?.length ?? 0) > 0 && (
                <Select
                  label="Create as"
                  value={attachTo}
                  onChange={(e) => setAttachTo(e.target.value)}
                  options={[
                    { value: '', label: 'A new project' },
                    ...(projects.data ?? []).map((p) => ({
                      value: p.id,
                      label: `Add to existing: ${p.name}`,
                    })),
                  ]}
                />
              )}
              {!attachTo && (
                <>
                  <Input
                    label="Project name"
                    value={draft.project.title}
                    disabled={readOnly}
                    maxLength={120}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, project: { ...d.project, title: e.target.value } }))
                    }
                  />
                  <Textarea
                    label="Summary"
                    value={draft.project.summary ?? ''}
                    disabled={readOnly}
                    rows={3}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        project: { ...d.project, summary: e.target.value },
                      }))
                    }
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DateField
                      label="Start"
                      date={draft.project.start_date}
                      disabled={readOnly}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          project: { ...d.project, start_date: userDate(v) },
                        }))
                      }
                    />
                    <DateField
                      label="End / deadline"
                      date={draft.project.end_date}
                      disabled={readOnly}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          project: { ...d.project, end_date: userDate(v) },
                        }))
                      }
                    />
                  </div>
                </>
              )}
              {(draft.project.objectives.length > 0 || draft.project.deliverables.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <BulletList title="Objectives" items={draft.project.objectives} />
                  <BulletList title="Deliverables" items={draft.project.deliverables} />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={`Tasks (${draft.tasks.length})`}
              description="Edit or remove anything before approving. Dates are labelled by where they came from."
              action={
                !readOnly && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Plus className="size-4" aria-hidden />}
                    onClick={addTask}
                  >
                    Add
                  </Button>
                )
              }
            />
            <ol className="flex flex-col gap-2">
              {draft.tasks.map((t, index) => {
                const taskIssues = issuesByTask.get(t.key) ?? []
                const hasWarning = taskIssues.some((i) => i.severity === 'warning')
                const open = expanded === t.key
                return (
                  <li
                    key={t.key}
                    className={cn(
                      'rounded-xl border p-3',
                      hasWarning ? 'border-amber-300 bg-amber-50/40' : 'border-cream-300',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-2 w-6 shrink-0 text-right text-xs font-semibold text-navy-400">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <label htmlFor={`title-${t.key}`} className="sr-only">
                            Task title
                          </label>
                          <input
                            id={`title-${t.key}`}
                            value={t.title}
                            disabled={readOnly}
                            maxLength={200}
                            onChange={(e) => updateTask(t.key, { title: e.target.value })}
                            className="h-9 min-w-0 flex-1 rounded-lg border border-transparent px-2 text-sm font-medium hover:border-navy-200 focus:border-sage-500 focus:outline-none disabled:bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => setExpanded(open ? null : t.key)}
                            className="rounded-lg p-2 text-navy-400 hover:bg-navy-50"
                            aria-expanded={open}
                            aria-label={open ? 'Hide task details' : 'Show task details'}
                          >
                            {open ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </button>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => removeTask(t.key)}
                              className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-700"
                              aria-label={`Remove task ${t.title}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 px-2 text-xs text-navy-500">
                          {t.phase && <Badge tone="cream">{t.phase}</Badge>}
                          <span>{PRIORITY_LABELS[t.priority]} priority</span>
                          {t.due_date.value && (
                            <span className="inline-flex items-center gap-1">
                              Due {t.due_date.value}{' '}
                              <Badge tone={SOURCE_BADGE[t.due_date.source].tone}>
                                {SOURCE_BADGE[t.due_date.source].label}
                              </Badge>
                            </span>
                          )}
                          {!t.due_date.value && <Badge tone="cream">No deadline</Badge>}
                          {t.depends_on.length > 0 && (
                            <span>
                              After: {t.depends_on.map((k) => titleByKey.get(k) ?? k).join(', ')}
                            </span>
                          )}
                        </div>
                        {taskIssues
                          .filter((i) => i.severity === 'warning')
                          .map((i) => (
                            <p
                              key={i.message}
                              className="mt-1 flex items-start gap-1 px-2 text-xs text-amber-800"
                            >
                              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{' '}
                              {i.message}
                            </p>
                          ))}

                        {open && (
                          <div className="mt-3 grid gap-3 px-2 sm:grid-cols-3">
                            <div className="sm:col-span-3">
                              <Textarea
                                label="Description"
                                rows={2}
                                disabled={readOnly}
                                value={t.description ?? ''}
                                onChange={(e) => updateTask(t.key, { description: e.target.value })}
                              />
                            </div>
                            <Select
                              label="Priority"
                              disabled={readOnly}
                              value={t.priority}
                              onChange={(e) =>
                                updateTask(t.key, { priority: e.target.value as Priority })
                              }
                              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
                                value,
                                label,
                              }))}
                            />
                            <DateField
                              label="Start"
                              date={t.start_date}
                              disabled={readOnly}
                              onChange={(v) => updateTask(t.key, { start_date: userDate(v) })}
                            />
                            <DateField
                              label="Due"
                              date={t.due_date}
                              disabled={readOnly}
                              onChange={(v) => updateTask(t.key, { due_date: userDate(v) })}
                            />
                            {t.due_date.quote && (
                              <p className="text-xs text-navy-500 sm:col-span-3">
                                Document says: <q className="italic">{t.due_date.quote}</q>
                              </p>
                            )}
                            {t.responsible && (
                              <p className="text-xs text-navy-500 sm:col-span-3">
                                Responsible: {t.responsible}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>

          {draft.milestones.length > 0 && (
            <Card>
              <CardHeader title={`Milestones (${draft.milestones.length})`} />
              <ul className="flex flex-col gap-2">
                {draft.milestones.map((m) => (
                  <li
                    key={m.key}
                    className="flex flex-col gap-2 rounded-xl border border-cream-300 p-3 sm:flex-row sm:items-center"
                  >
                    <Diamond
                      className="hidden size-4 shrink-0 text-purple-600 sm:block"
                      aria-hidden
                    />
                    <label htmlFor={`ms-${m.key}`} className="sr-only">
                      Milestone title
                    </label>
                    <input
                      id={`ms-${m.key}`}
                      value={m.title}
                      disabled={readOnly}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          milestones: d.milestones.map((x) =>
                            x.key === m.key ? { ...x, title: e.target.value } : x,
                          ),
                        }))
                      }
                      className="h-9 min-w-0 flex-1 rounded-lg border border-transparent px-2 text-sm font-medium hover:border-navy-200 focus:border-sage-500 focus:outline-none disabled:bg-transparent"
                    />
                    <div className="flex items-center gap-2">
                      <DateField
                        label="Milestone date"
                        hideLabel
                        date={m.due_date}
                        disabled={readOnly}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            milestones: d.milestones.map((x) =>
                              x.key === m.key ? { ...x, due_date: userDate(v) } : x,
                            ),
                          }))
                        }
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              milestones: d.milestones.filter((x) => x.key !== m.key),
                            }))
                          }
                          className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Remove milestone ${m.title}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card className={warnings.length ? 'border-amber-300' : undefined}>
            <CardHeader
              title="Scheduling check"
              description={
                warnings.length
                  ? `${warnings.length} potential conflicts`
                  : 'No conflicts found in the current draft.'
              }
            />
            <ul className="flex flex-col gap-2 text-sm">
              {issues.length === 0 && (
                <li className="text-navy-500">Every task has a consistent schedule.</li>
              )}
              {issues.map((i, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  {i.severity === 'warning' ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />
                  )}
                  <span className={i.severity === 'warning' ? 'text-navy-800' : 'text-navy-500'}>
                    {i.message}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {draft.questions.length > 0 && (
            <Card>
              <CardHeader
                title="Questions to clarify"
                description="Information the document did not make clear."
              />
              <ul className="flex flex-col gap-2 text-sm">
                {draft.questions.map((q) => (
                  <li key={q} className="flex gap-2">
                    <HelpCircle className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden /> {q}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {draft.risks.length > 0 && (
            <Card>
              <CardHeader title="Potential risks" />
              <ul className="flex flex-col gap-3 text-sm">
                {draft.risks.map((r) => (
                  <li key={r.description} className="flex gap-2">
                    <ShieldAlert
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        r.severity === 'high'
                          ? 'text-red-600'
                          : r.severity === 'medium'
                            ? 'text-amber-600'
                            : 'text-navy-400',
                      )}
                      aria-hidden
                    />
                    <span>
                      {r.description}
                      {r.mitigation && (
                        <span className="mt-0.5 block text-xs text-navy-500">
                          Mitigation: {r.mitigation}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {draft.assumptions.length > 0 && (
            <Card>
              <CardHeader title="AI assumptions" />
              <BulletList items={draft.assumptions} />
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReject}
        title="Reject this plan?"
        description="No tasks will be created. You can generate a new plan from the document at any time."
        confirmLabel="Reject plan"
        loading={reject.isPending}
        onCancel={() => setConfirmReject(false)}
        onConfirm={() =>
          reject.mutate(record.id, {
            onSuccess: () => navigate('/ai-planner', { replace: true }),
            onSettled: () => setConfirmReject(false),
          })
        }
      />
    </PageContainer>
  )
}

function DateField({
  label,
  date,
  onChange,
  disabled,
  hideLabel,
}: {
  label: string
  date: PlanDate
  onChange: (value: string) => void
  disabled?: boolean
  hideLabel?: boolean
}) {
  const badge = SOURCE_BADGE[date.source]
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={cn(
          'flex items-center justify-between gap-2 text-sm font-medium text-navy-800',
          hideLabel && 'sr-only',
        )}
      >
        {label}
        {date.value && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </span>
      <input
        type="date"
        aria-label={label}
        value={date.value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-navy-200 bg-white px-3 text-sm focus:border-sage-500 focus:ring-2 focus:ring-sage-200 focus:outline-none disabled:bg-cream-50"
      />
    </div>
  )
}

function BulletList({ title, items }: { title?: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      {title && (
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-navy-500 uppercase">
          {title}
        </p>
      )}
      <ul className="list-disc space-y-1 pl-5 text-sm text-navy-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

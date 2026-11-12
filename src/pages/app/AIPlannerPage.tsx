import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Select,
  Spinner,
  buttonClasses,
} from '@/components/ui'
import { formatDateTime } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import {
  ACTIVE_JOB_STATUSES,
  JOB_STATUS_LABELS,
  useAiJobs,
  useGeneratePlan,
  usePlans,
} from '@/features/ai/api'
import { useDocuments } from '@/features/documents/api'
import { FILE_TYPES } from '@/features/documents/fileTypes'
import { useWorkspace } from '@/features/workspace/workspace-context'

const steps = [
  'Upload a project brief, assignment or requirements document.',
  'Planora extracts the text and asks AI to identify objectives, deliverables, tasks, dependencies and deadlines.',
  'You review the proposed plan, edit or remove tasks, then approve it.',
  'Approved tasks and milestones appear in your project, task list and monthly planner.',
]

export function AIPlannerPage() {
  const { timezone } = useWorkspace()
  const [params] = useSearchParams()
  const documents = useDocuments()
  const jobs = useAiJobs()
  const plans = usePlans()
  const generate = useGeneratePlan()
  const [documentId, setDocumentId] = useState(params.get('document') ?? '')

  const eligible = useMemo(
    () => (documents.data ?? []).filter((d) => FILE_TYPES[d.file_type].aiSupported),
    [documents.data],
  )
  const docById = useMemo(
    () => new Map((documents.data ?? []).map((d) => [d.id, d])),
    [documents.data],
  )
  const planByJob = useMemo(
    () => new Map((plans.data ?? []).map((p) => [p.ai_job_id, p])),
    [plans.data],
  )
  const activeForSelected = (jobs.data ?? []).some(
    (j) => j.document_id === documentId && ACTIVE_JOB_STATUSES.includes(j.status),
  )

  return (
    <PageContainer
      title="AI Planner"
      description="Turn a project document into an editable plan and timeline."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Generate a plan"
              description="Choose an uploaded document. Processing usually takes under a minute."
            />
            {documents.isPending ? (
              <Spinner label="Loading documents" />
            ) : eligible.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-6" aria-hidden />}
                title="No documents to analyse"
                description="Upload a PDF, Word (.docx), text, CSV or Excel document first."
                action={
                  <Link to="/documents" className={buttonClasses('primary', 'sm')}>
                    <Upload className="size-4" aria-hidden /> Upload a document
                  </Link>
                }
              />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Select
                    label="Document"
                    value={documentId}
                    onChange={(e) => {
                      setDocumentId(e.target.value)
                      generate.reset()
                    }}
                    placeholder="Select a document…"
                    options={eligible.map((d) => ({ value: d.id, label: d.file_name }))}
                  />
                </div>
                <Button
                  variant="sage"
                  size="lg"
                  disabled={!documentId || activeForSelected}
                  loading={generate.isPending}
                  leftIcon={<Sparkles className="size-4" aria-hidden />}
                  onClick={() => generate.mutate(documentId)}
                >
                  {activeForSelected ? 'Processing…' : 'Generate plan'}
                </Button>
              </div>
            )}
            {generate.isError && (
              <div className="mt-4">
                <Alert>{errorMessage(generate.error)}</Alert>
              </div>
            )}
            {generate.isSuccess && (
              <div className="mt-4">
                <Alert tone="success">
                  Processing started. The plan will appear below when it is ready; we’ll also notify
                  you.
                </Alert>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent plans" />
            {jobs.isPending ? (
              <Spinner label="Loading plans" />
            ) : jobs.isError ? (
              <ErrorState message={errorMessage(jobs.error)} onRetry={() => void jobs.refetch()} />
            ) : (jobs.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-navy-500">No plans generated yet.</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {jobs.data!.map((job) => {
                  const doc = docById.get(job.document_id)
                  const plan = planByJob.get(job.id)
                  const active = ACTIVE_JOB_STATUSES.includes(job.status)
                  return (
                    <li
                      key={job.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {active ? (
                          <Loader2
                            className="mt-0.5 size-5 shrink-0 animate-spin text-navy-500"
                            aria-hidden
                          />
                        ) : job.status === 'failed' ? (
                          <AlertTriangle
                            className="mt-0.5 size-5 shrink-0 text-red-600"
                            aria-hidden
                          />
                        ) : (
                          <CheckCircle2
                            className="mt-0.5 size-5 shrink-0 text-sage-600"
                            aria-hidden
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {doc?.file_name ?? 'Deleted document'}
                          </p>
                          <p className="text-xs text-navy-500">
                            {JOB_STATUS_LABELS[job.status]} ·{' '}
                            {formatDateTime(job.created_at, timezone)}
                          </p>
                          {job.error_message && (
                            <p className="mt-1 text-xs text-red-700">{job.error_message}</p>
                          )}
                          {job.truncated && (
                            <p className="mt-1 text-xs text-amber-700">
                              Only the first part of a very long document was analysed.
                            </p>
                          )}
                        </div>
                      </div>
                      {plan && (
                        <div className="flex items-center gap-2 sm:justify-end">
                          {plan.status === 'pending_review' ? (
                            <Link
                              to={`/ai-planner/plans/${plan.id}`}
                              className={buttonClasses('primary', 'sm')}
                            >
                              Review plan
                            </Link>
                          ) : (
                            <>
                              <Badge tone={plan.status === 'approved' ? 'sage' : 'cream'}>
                                {plan.status === 'approved' ? 'Approved' : 'Rejected'}
                              </Badge>
                              <Link
                                to={`/ai-planner/plans/${plan.id}`}
                                className={buttonClasses('ghost', 'sm')}
                              >
                                View
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="bg-navy-900 text-cream-50">
            <Sparkles className="size-6 text-sage-300" aria-hidden />
            <h3 className="mt-3 text-lg font-bold text-cream-50">How it works</h3>
            <ol className="mt-3 space-y-3 text-sm text-navy-100">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sage-400/20 text-xs font-bold text-sage-200">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <div className="flex gap-3">
              <ShieldCheck className="size-5 shrink-0 text-sage-600" aria-hidden />
              <div className="text-sm text-navy-600">
                <p className="font-semibold text-navy-900">You stay in control</p>
                <p className="mt-1">
                  Nothing is added to your workspace until you approve it. Dates the document states
                  are marked separately from dates the AI suggests.
                </p>
                <p className="mt-2">
                  The document’s text is sent to our AI provider (Anthropic) for processing. See the{' '}
                  <Link to="/privacy" className="font-semibold text-sage-700 hover:underline">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}

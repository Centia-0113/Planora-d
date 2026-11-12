import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
  buttonClasses,
} from '@/components/ui'
import { formatDateTime } from '@/lib/dates'
import { emptyToNull, errorMessage } from '@/lib/query'
import {
  getDownloadUrl,
  useDeleteDocument,
  useDocuments,
  useUpdateDocument,
} from '@/features/documents/api'
import { UploadZone } from '@/features/documents/components/UploadZone'
import { DOCUMENT_CATEGORY_LABELS, FILE_TYPES, formatBytes } from '@/features/documents/fileTypes'
import { useProjects } from '@/features/projects/api'
import { useWorkspace } from '@/features/workspace/workspace-context'
import type { DocumentCategory, DocumentRecord, DocumentStatus } from '@/types/database'

const STATUS_BADGE: Record<
  DocumentStatus,
  { tone: 'cream' | 'navy' | 'sage' | 'red'; label: string }
> = {
  uploaded: { tone: 'cream', label: 'Uploaded' },
  processing: { tone: 'navy', label: 'Processing' },
  processed: { tone: 'sage', label: 'Analysed' },
  failed: { tone: 'red', label: 'Analysis failed' },
}

export function DocumentsPage() {
  const { timezone } = useWorkspace()
  const documents = useDocuments()
  const projects = useProjects()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<DocumentCategory | 'all'>('all')
  const [projectId, setProjectId] = useState('all')
  const [type, setType] = useState('all')

  const projectById = useMemo(
    () => new Map((projects.data ?? []).map((p) => [p.id, p])),
    [projects.data],
  )
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (documents.data ?? []).filter(
      (d) =>
        (!q || d.file_name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)) &&
        (category === 'all' || d.category === category) &&
        (type === 'all' || d.file_type === type) &&
        (projectId === 'all' ||
          (projectId === 'none' ? !d.project_id : d.project_id === projectId)),
    )
  }, [documents.data, search, category, type, projectId])

  const openId = params.get('doc')
  const openDoc = documents.data?.find((d) => d.id === openId)
  const setOpen = (id: string | null) => setParams(id ? { doc: id } : {}, { replace: true })

  return (
    <PageContainer
      title="Documents"
      description="Store project briefs and task descriptions securely, and turn them into plans."
    >
      <div className="mb-6">
        <UploadZone />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <label htmlFor="doc-search" className="sr-only">
            Search documents
          </label>
          <Search
            className="pointer-events-none absolute top-3.5 left-3 size-4 text-navy-400"
            aria-hidden
          />
          <input
            id="doc-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="h-11 w-full rounded-xl border border-navy-200 bg-white pr-3 pl-9 text-sm focus:border-sage-500 focus:ring-2 focus:ring-sage-200 focus:outline-none"
          />
        </div>
        <Select
          label="Category"
          hideLabel
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory | 'all')}
          options={[
            { value: 'all', label: 'All categories' },
            ...Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <Select
          label="Project"
          hideLabel
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          options={[
            { value: 'all', label: 'All projects' },
            { value: 'none', label: 'Not linked' },
            ...(projects.data ?? []).map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <Select
          label="File type"
          hideLabel
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: 'all', label: 'All file types' },
            ...Object.entries(FILE_TYPES).map(([value, t]) => ({ value, label: t.label })),
          ]}
        />
      </div>

      {documents.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading documents" />
        </div>
      ) : documents.isError ? (
        <ErrorState
          message={errorMessage(documents.error)}
          onRetry={() => void documents.refetch()}
        />
      ) : (documents.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<FileText className="size-6" aria-hidden />}
          title="No documents yet"
          description="Upload a project brief or assignment above. You can then generate a plan from it."
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No documents match these filters" />
      ) : (
        <div className="overflow-hidden rounded-card border border-cream-300 bg-white shadow-card">
          <ul className="divide-y divide-cream-200">
            {visible.map((d) => {
              const Icon =
                d.file_type === 'csv' || d.file_type === 'xlsx' ? FileSpreadsheet : FileText
              const project = d.project_id ? projectById.get(d.project_id) : undefined
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(d.id)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-cream-50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.file_name}</span>
                      <span className="text-xs text-navy-500">
                        {FILE_TYPES[d.file_type].label} · {formatBytes(d.file_size)} ·{' '}
                        {formatDateTime(d.created_at, timezone)}
                        {project && ` · ${project.name}`}
                      </span>
                    </span>
                    <span className="hidden flex-col items-end gap-1 sm:flex">
                      <Badge tone="cream">{DOCUMENT_CATEGORY_LABELS[d.category]}</Badge>
                      {d.processing_status !== 'uploaded' && (
                        <Badge tone={STATUS_BADGE[d.processing_status].tone}>
                          {STATUS_BADGE[d.processing_status].label}
                        </Badge>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {openDoc && <DocumentDetails key={openDoc.id} doc={openDoc} onClose={() => setOpen(null)} />}
    </PageContainer>
  )
}

function DocumentDetails({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const { timezone } = useWorkspace()
  const projects = useProjects()
  const update = useUpdateDocument()
  const remove = useDeleteDocument()
  const [fileName, setFileName] = useState(doc.file_name)
  const [category, setCategory] = useState(doc.category)
  const [projectId, setProjectId] = useState(doc.project_id ?? '')
  const [description, setDescription] = useState(doc.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [linkError, setLinkError] = useState<string>()
  const dirty =
    fileName !== doc.file_name ||
    category !== doc.category ||
    projectId !== (doc.project_id ?? '') ||
    description !== (doc.description ?? '')

  async function open(download: boolean) {
    setLinkError(undefined)
    try {
      const url = await getDownloadUrl(doc, download)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setLinkError(errorMessage(err))
    }
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Document details"
        description={`Uploaded ${formatDateTime(doc.created_at, timezone)} · ${formatBytes(doc.file_size)}`}
      >
        <div className="flex flex-col gap-4">
          {(update.error || linkError) && <Alert>{linkError ?? errorMessage(update.error)}</Alert>}
          <Input
            label="File name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            maxLength={255}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              options={Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Select
              label="Project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="No project"
              options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="size-4" aria-hidden />}
              onClick={() => void open(true)}
            >
              Download
            </Button>
            {(doc.file_type === 'pdf' || doc.file_type === 'txt') && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ExternalLink className="size-4" aria-hidden />}
                onClick={() => void open(false)}
              >
                Preview
              </Button>
            )}
            {FILE_TYPES[doc.file_type].aiSupported && (
              <Link to={`/ai-planner?document=${doc.id}`} className={buttonClasses('sage', 'sm')}>
                <Sparkles className="size-4" aria-hidden /> Generate plan
              </Link>
            )}
          </div>

          <div className="flex justify-between gap-2 border-t border-cream-200 pt-4">
            <Button
              variant="ghost"
              leftIcon={<Trash2 className="size-4" aria-hidden />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                disabled={!dirty || !fileName.trim()}
                loading={update.isPending}
                onClick={() =>
                  update.mutate(
                    {
                      id: doc.id,
                      patch: {
                        file_name: fileName.trim(),
                        category,
                        project_id: emptyToNull(projectId),
                        description: emptyToNull(description),
                      },
                    },
                    { onSuccess: onClose },
                  )
                }
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this document?"
        description="The file is permanently removed from storage. Any AI plans generated from it are deleted too."
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(doc, { onSuccess: onClose, onSettled: () => setConfirmDelete(false) })
        }
      />
    </>
  )
}

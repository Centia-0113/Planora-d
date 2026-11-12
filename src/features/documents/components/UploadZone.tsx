import { useRef, useState } from 'react'
import { CheckCircle2, UploadCloud, X, XCircle } from 'lucide-react'
import { ProgressBar, Select } from '@/components/ui'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/query'
import type { DocumentCategory } from '@/types/database'
import { useProjects } from '@/features/projects/api'
import { UploadCancelledError, useUploadDocument } from '../api'
import { ACCEPT_ATTRIBUTE, DOCUMENT_CATEGORY_LABELS, formatBytes, validateFile } from '../fileTypes'

interface QueueItem {
  id: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'done' | 'error' | 'cancelled'
  error?: string
  controller?: AbortController
}

export function UploadZone({ defaultProjectId = '' }: { defaultProjectId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const projects = useProjects()
  const upload = useUploadDocument()
  const [dragging, setDragging] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId)
  const [category, setCategory] = useState<DocumentCategory>('brief')

  const patch = (id: string, changes: Partial<QueueItem>) =>
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  function startUploads(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID()
      const check = validateFile(file)
      if (!check.ok) {
        setQueue((q) => [
          {
            id,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'error',
            error: check.error,
          },
          ...q,
        ])
        continue
      }
      const controller = new AbortController()
      setQueue((q) => [
        { id, name: file.name, size: file.size, progress: 0, status: 'uploading', controller },
        ...q,
      ])
      upload.mutate(
        {
          file,
          projectId: projectId || null,
          category,
          signal: controller.signal,
          onProgress: (progress) => patch(id, { progress }),
        },
        {
          onSuccess: () => patch(id, { status: 'done', progress: 100 }),
          onError: (err) =>
            patch(
              id,
              err instanceof UploadCancelledError
                ? { status: 'cancelled' }
                : { status: 'error', error: errorMessage(err) },
            ),
        },
      )
    }
  }

  return (
    <div className="rounded-card border border-cream-300 bg-white p-5 shadow-card">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Select
          label="Link to project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="No project"
          options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          options={Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length) startUploads(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-sage-500 bg-sage-50' : 'border-cream-400 bg-cream-50',
        )}
      >
        <UploadCloud className="mb-3 size-10 text-sage-600" aria-hidden />
        <p className="font-semibold">Drag and drop files here</p>
        <p className="mt-1 text-sm text-navy-500">
          PDF, DOCX, DOC, TXT, CSV or XLSX · up to 20 MB each
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-xl bg-navy-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-navy-700"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          aria-label="Choose files to upload"
          onChange={(e) => {
            if (e.target.files?.length) startUploads(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {queue.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2" aria-label="Uploads" aria-live="polite">
          {queue.map((item) => (
            <li key={item.id} className="rounded-xl border border-cream-200 px-3 py-2">
              <div className="flex items-center gap-2">
                {item.status === 'done' ? (
                  <CheckCircle2 className="size-4 shrink-0 text-sage-600" aria-hidden />
                ) : item.status === 'error' ? (
                  <XCircle className="size-4 shrink-0 text-red-600" aria-hidden />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                <span className="text-xs text-navy-500">
                  {item.status === 'uploading'
                    ? `${item.progress}%`
                    : item.status === 'done'
                      ? 'Uploaded'
                      : item.status === 'cancelled'
                        ? 'Cancelled'
                        : formatBytes(item.size)}
                </span>
                {item.status === 'uploading' ? (
                  <button
                    type="button"
                    onClick={() => item.controller?.abort()}
                    className="rounded p-1 text-navy-400 hover:text-red-700"
                    aria-label={`Cancel upload of ${item.name}`}
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQueue((q) => q.filter((i) => i.id !== item.id))}
                    className="rounded p-1 text-navy-300 hover:text-navy-600"
                    aria-label={`Dismiss ${item.name}`}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              {item.status === 'uploading' && (
                <ProgressBar
                  value={item.progress}
                  label={`Uploading ${item.name}`}
                  className="mt-2"
                />
              )}
              {item.error && <p className="mt-1 text-xs text-red-700">{item.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

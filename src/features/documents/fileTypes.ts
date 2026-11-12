import type { DocumentCategory, DocumentFileType } from '@/types/database'

export const MAX_FILE_BYTES = 20 * 1024 * 1024

/** Canonical MIME type per extension (browsers report CSV/DOC inconsistently, so we don't trust file.type). */
export const FILE_TYPES: Record<
  DocumentFileType,
  { mime: string; label: string; aiSupported: boolean }
> = {
  pdf: { mime: 'application/pdf', label: 'PDF', aiSupported: true },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word',
    aiSupported: true,
  },
  doc: { mime: 'application/msword', label: 'Word 97–2003', aiSupported: false },
  txt: { mime: 'text/plain', label: 'Text', aiSupported: true },
  csv: { mime: 'text/csv', label: 'CSV', aiSupported: true },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Excel',
    aiSupported: true,
  },
}

export const ACCEPT_ATTRIBUTE = Object.keys(FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(',')

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  brief: 'Project brief',
  requirements: 'Requirements',
  assignment: 'Assignment',
  report: 'Report',
  reference: 'Reference',
  other: 'Other',
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

export type FileCheck =
  { ok: true; fileType: DocumentFileType; mime: string } | { ok: false; error: string }

export function validateFile(file: Pick<File, 'name' | 'size'>): FileCheck {
  const ext = fileExtension(file.name)
  if (!(ext in FILE_TYPES)) {
    return {
      ok: false,
      error: `${file.name}: unsupported file type. Use PDF, DOCX, DOC, TXT, CSV or XLSX.`,
    }
  }
  if (file.size === 0) return { ok: false, error: `${file.name} is empty.` }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `${file.name} is larger than the 20 MB limit.` }
  }
  if (file.name.length > 255) return { ok: false, error: 'File names can be up to 255 characters.' }
  const fileType = ext as DocumentFileType
  return { ok: true, fileType, mime: FILE_TYPES[fileType].mime }
}

/** Storage-safe object name: <workspace>/<uuid>-<sanitised name> */
export function storagePathFor(workspaceId: string, fileName: string, id: string): string {
  const ext = fileExtension(fileName)
  const base = fileName
    .slice(0, fileName.length - (ext ? ext.length + 1 : 0))
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return `${workspaceId}/${id}-${base || 'document'}${ext ? `.${ext}` : ''}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

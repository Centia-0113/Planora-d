import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/query'
import type { DocumentCategory, DocumentRecord } from '@/types/database'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { keys as taskKeys } from '@/features/tasks/api'
import { storagePathFor, validateFile } from './fileTypes'

export const BUCKET = 'documents'

export const documentKeys = {
  documents: (ws: string) => ['ws', ws, 'documents'] as const,
}

const LIST_COLUMNS =
  'id, workspace_id, project_id, uploaded_by, file_name, file_type, mime_type, file_size, storage_path, category, description, processing_status, created_at, updated_at'

export function useDocuments() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: documentKeys.documents(workspaceId),
    queryFn: async () => {
      const rows = unwrap<Omit<DocumentRecord, 'extracted_text'>[]>(
        await supabase
          .from('documents')
          .select(LIST_COLUMNS)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(1000),
      )
      return rows.map((r) => ({ ...r, extracted_text: null })) as DocumentRecord[]
    },
  })
}

export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled')
  }
}

/**
 * Upload with progress events. supabase-js does not expose upload progress,
 * so we call the Storage REST endpoint directly with the user's access token;
 * the bucket's RLS policies still decide whether the upload is allowed.
 */
function uploadWithProgress(
  path: string,
  file: File,
  contentType: string,
  accessToken: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    xhr.open('POST', `${env.supabaseUrl}/storage/v1/object/${BUCKET}/${encodedPath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', env.supabaseAnonKey)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        let message = `Upload failed (${xhr.status})`
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string; error?: string }
          message = body.message || body.error || message
        } catch {
          /* keep default message */
        }
        reject(new Error(message))
      }
    }
    xhr.onerror = () =>
      reject(new Error('The upload was interrupted. Check your connection and try again.'))
    xhr.onabort = () => reject(new UploadCancelledError())
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(file)
  })
}

export interface UploadOptions {
  file: File
  projectId: string | null
  category: DocumentCategory
  onProgress: (percent: number) => void
  signal?: AbortSignal
}

export function useUploadDocument() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, projectId, category, onProgress, signal }: UploadOptions) => {
      const check = validateFile(file)
      if (!check.ok) throw new Error(check.error)

      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Your session has expired. Please sign in again.')

      const path = storagePathFor(workspaceId, file.name, crypto.randomUUID())
      await uploadWithProgress(path, file, check.mime, token, onProgress, signal)

      const { data: row, error } = await supabase
        .from('documents')
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          file_name: file.name,
          file_type: check.fileType,
          mime_type: check.mime,
          file_size: file.size,
          storage_path: path,
          category,
        })
        .select(LIST_COLUMNS)
        .single()

      if (error) {
        // Don't leave an orphaned file behind if the metadata insert fails.
        await supabase.storage.from(BUCKET).remove([path])
        throw error
      }
      return row as unknown as DocumentRecord
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.all(workspaceId) }),
  })
}

export function useUpdateDocument() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<DocumentRecord, 'file_name' | 'project_id' | 'category' | 'description'>>
    }) => {
      const { error } = await supabase.from('documents').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all(workspaceId) }),
  })
}

export function useDeleteDocument() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (doc: Pick<DocumentRecord, 'id' | 'storage_path'>) => {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.storage_path])
      if (storageError) throw storageError
      const { error } = await supabase.from('documents').delete().eq('id', doc.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all(workspaceId) }),
  })
}

/** Short-lived signed URL; access is checked by storage RLS before it is issued. */
export async function getDownloadUrl(
  doc: Pick<DocumentRecord, 'storage_path' | 'file_name'>,
  download = true,
) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, 60, download ? { download: doc.file_name } : undefined)
  if (error || !data) throw error ?? new Error('Could not create a download link.')
  return data.signedUrl
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import type { ApprovalPayload } from '@shared/plan'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/query'
import type { AiJob, AiJobStatus, GeneratedPlan } from '@/types/database'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { keys as taskKeys } from '@/features/tasks/api'

export const aiKeys = {
  jobs: (ws: string) => ['ws', ws, 'ai-jobs'] as const,
  plans: (ws: string) => ['ws', ws, 'plans'] as const,
  plan: (ws: string, id: string) => ['ws', ws, 'plans', id] as const,
}

export const ACTIVE_JOB_STATUSES: AiJobStatus[] = ['queued', 'extracting', 'analysing']

export const JOB_STATUS_LABELS: Record<AiJobStatus, string> = {
  queued: 'Queued',
  extracting: 'Reading document',
  analysing: 'Building plan',
  completed: 'Plan ready',
  failed: 'Failed',
}

export function useAiJobs() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: aiKeys.jobs(workspaceId),
    queryFn: async () =>
      unwrap<AiJob[]>(
        await supabase
          .from('ai_jobs')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(50),
      ),
    // Poll while any job is still running.
    refetchInterval: (query) =>
      query.state.data?.some((j) => ACTIVE_JOB_STATUSES.includes(j.status)) ? 3000 : false,
  })
}

export function usePlans() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: aiKeys.plans(workspaceId),
    queryFn: async () =>
      unwrap<
        Pick<
          GeneratedPlan,
          'id' | 'ai_job_id' | 'document_id' | 'status' | 'project_id' | 'created_at'
        >[]
      >(
        await supabase
          .from('generated_plans')
          .select('id, ai_job_id, document_id, status, project_id, created_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(50),
      ),
  })
}

export function usePlan(id: string | undefined) {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: aiKeys.plan(workspaceId, id ?? ''),
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap<GeneratedPlan>(
        await supabase.from('generated_plans').select('*').eq('id', id!).single(),
      ),
  })
}

async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string }
      if (body.error) return body.error
    } catch {
      /* fall through */
    }
  }
  return error instanceof Error ? error.message : 'The request failed.'
}

export function useGeneratePlan() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke<{ job_id: string }>('generate-plan', {
        body: { document_id: documentId },
      })
      if (error) throw new Error(await functionErrorMessage(error))
      return data!
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.all(workspaceId) }),
  })
}

export function useApprovePlan() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      planId,
      payload,
      projectId,
    }: {
      planId: string
      payload: ApprovalPayload
      projectId: string | null
    }) =>
      unwrap<string>(
        await supabase.rpc('approve_generated_plan', {
          p_plan_id: planId,
          p_plan: payload,
          p_project_id: projectId,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all(workspaceId) }),
  })
}

export function useRejectPlan() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.rpc('reject_generated_plan', { p_plan_id: planId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all(workspaceId) }),
  })
}

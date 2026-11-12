import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/query'
import type { Milestone, Project } from '@/types/database'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { keys as taskKeys } from '@/features/tasks/api'

export const projectKeys = {
  projects: (ws: string) => ['ws', ws, 'projects'] as const,
  project: (ws: string, id: string) => ['ws', ws, 'projects', id] as const,
  milestones: (ws: string) => ['ws', ws, 'milestones'] as const,
}

export type ProjectInput = Pick<
  Project,
  'name' | 'description' | 'status' | 'priority' | 'start_date' | 'end_date'
>
export type MilestoneInput = Pick<Milestone, 'title' | 'description' | 'due_date'>

export function useProjects() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: projectKeys.projects(workspaceId),
    queryFn: async () =>
      unwrap<Project[]>(
        await supabase
          .from('projects')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false }),
      ),
  })
}

export function useProject(id: string | undefined) {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: projectKeys.project(workspaceId, id ?? ''),
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap<Project>(await supabase.from('projects').select('*').eq('id', id!).single()),
  })
}

export function useMilestones() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: projectKeys.milestones(workspaceId),
    queryFn: async () =>
      unwrap<Milestone[]>(
        await supabase
          .from('milestones')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('position'),
      ),
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  const { workspaceId } = useWorkspace()
  return () => qc.invalidateQueries({ queryKey: taskKeys.all(workspaceId) })
}

export function useCreateProject() {
  const { workspaceId } = useWorkspace()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: ProjectInput) =>
      unwrap<Project>(
        await supabase
          .from('projects')
          .insert({ ...input, workspace_id: workspaceId })
          .select()
          .single(),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateProject() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProjectInput> }) =>
      unwrap<Project>(await supabase.from('projects').update(patch).eq('id', id).select().single()),
    onSuccess: invalidate,
  })
}

export function useDeleteProject() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useCreateMilestone() {
  const { workspaceId } = useWorkspace()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ projectId, input }: { projectId: string; input: MilestoneInput }) =>
      unwrap<Milestone>(
        await supabase
          .from('milestones')
          .insert({ ...input, project_id: projectId, workspace_id: workspaceId })
          .select()
          .single(),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateMilestone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<MilestoneInput & Pick<Milestone, 'is_completed'>>
    }) =>
      unwrap<Milestone>(
        await supabase.from('milestones').update(patch).eq('id', id).select().single(),
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteMilestone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

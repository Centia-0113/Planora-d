import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/query'
import type { Subtask, Task, TaskCategory, TaskDependency } from '@/types/database'
import { useWorkspace } from '@/features/workspace/workspace-context'

export const keys = {
  all: (ws: string) => ['ws', ws] as const,
  tasks: (ws: string) => ['ws', ws, 'tasks'] as const,
  task: (ws: string, id: string) => ['ws', ws, 'tasks', id] as const,
  categories: (ws: string) => ['ws', ws, 'categories'] as const,
  subtasks: (ws: string) => ['ws', ws, 'subtasks'] as const,
  dependencies: (ws: string) => ['ws', ws, 'dependencies'] as const,
}

export type TaskInput = Pick<
  Task,
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'category_id'
  | 'project_id'
  | 'start_date'
  | 'due_date'
>

export function useCategories() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: keys.categories(workspaceId),
    queryFn: async () =>
      unwrap<TaskCategory[]>(
        await supabase
          .from('task_categories')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('is_default', { ascending: false })
          .order('name'),
      ),
    staleTime: 5 * 60_000,
  })
}

export function useTasks() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: keys.tasks(workspaceId),
    queryFn: async () =>
      unwrap<Task[]>(
        await supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(2000),
      ),
  })
}

export function useTask(id: string | undefined) {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: keys.task(workspaceId, id ?? ''),
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap<Task>(await supabase.from('tasks').select('*').eq('id', id!).single()),
  })
}

export function useAllSubtasks() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: keys.subtasks(workspaceId),
    queryFn: async () =>
      unwrap<Subtask[]>(
        await supabase
          .from('subtasks')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('position')
          .order('created_at'),
      ),
  })
}

export function useDependencies() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: keys.dependencies(workspaceId),
    queryFn: async () =>
      unwrap<TaskDependency[]>(
        await supabase.from('task_dependencies').select('*').eq('workspace_id', workspaceId),
      ),
  })
}

/** Invalidate everything derived from tasks (lists, dashboard, planner, analytics, projects). */
function useInvalidateWorkspace() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  return () => queryClient.invalidateQueries({ queryKey: keys.all(workspaceId) })
}

export function useCreateTask() {
  const { workspaceId } = useWorkspace()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: async (input: TaskInput) =>
      unwrap<Task>(
        await supabase
          .from('tasks')
          .insert({ ...input, workspace_id: workspaceId })
          .select()
          .single(),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateTask() {
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TaskInput> }) =>
      unwrap<Task>(await supabase.from('tasks').update(patch).eq('id', id).select().single()),
    onSuccess: invalidate,
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useCreateSubtask() {
  const { workspaceId } = useWorkspace()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: async ({
      taskId,
      title,
      position,
    }: {
      taskId: string
      title: string
      position: number
    }) =>
      unwrap<Subtask>(
        await supabase
          .from('subtasks')
          .insert({ workspace_id: workspaceId, task_id: taskId, title, position })
          .select()
          .single(),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateSubtask() {
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<Subtask, 'title' | 'is_completed'>>
    }) =>
      unwrap<Subtask>(await supabase.from('subtasks').update(patch).eq('id', id).select().single()),
    onSuccess: invalidate,
  })
}

export function useDeleteSubtask() {
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

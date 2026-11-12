import type { Task } from '@/types/database'
import { useUpdateTask } from './api'

/** Mark a task complete / re-open it. Re-opened tasks go back to "to do". */
export function useToggleTask() {
  const update = useUpdateTask()
  return {
    toggle: (task: Pick<Task, 'id'>, completed: boolean) =>
      update.mutate({ id: task.id, patch: { status: completed ? 'completed' : 'todo' } }),
    pendingId: update.isPending ? update.variables?.id : undefined,
    error: update.error,
  }
}

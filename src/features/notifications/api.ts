import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/query'
import type { AppNotification, Reminder } from '@/types/database'
import { useAuth } from '@/features/auth/auth-context'
import { useWorkspace } from '@/features/workspace/workspace-context'

export const notificationKeys = {
  notifications: (ws: string) => ['ws', ws, 'notifications'] as const,
  reminders: (ws: string) => ['ws', ws, 'reminders'] as const,
}

export function useNotifications() {
  const { workspaceId } = useWorkspace()
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.notifications(workspaceId),
    queryFn: async () =>
      unwrap<AppNotification[]>(
        await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ),
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  })
}

export function useMarkNotificationsRead() {
  const { workspaceId } = useWorkspace()
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    /** Pass ids to mark specific notifications, or nothing to mark all unread. */
    mutationFn: async (ids?: string[]) => {
      let query = supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user!.id)
        .is('read_at', null)
      if (ids) query = query.in('id', ids)
      const { error } = await query
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: notificationKeys.notifications(workspaceId) }),
  })
}

export function useDeleteNotification() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: notificationKeys.notifications(workspaceId) }),
  })
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export type ReminderInput = Pick<Reminder, 'title' | 'note' | 'remind_at' | 'task_id' | 'event_id'>

export function useReminders() {
  const { workspaceId } = useWorkspace()
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.reminders(workspaceId),
    queryFn: async () =>
      unwrap<Reminder[]>(
        await supabase
          .from('reminders')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user!.id)
          .order('remind_at'),
      ),
  })
}

export function useSaveReminder() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ReminderInput }) => {
      const { error } = id
        ? await supabase.from('reminders').update(input).eq('id', id)
        : await supabase.from('reminders').insert({ ...input, workspace_id: workspaceId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.reminders(workspaceId) }),
  })
}

export function useUpdateReminderStatus() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Reminder['status'] }) => {
      const { error } = await supabase.from('reminders').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.reminders(workspaceId) }),
  })
}

export function useDeleteReminder() {
  const { workspaceId } = useWorkspace()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.reminders(workspaceId) }),
  })
}

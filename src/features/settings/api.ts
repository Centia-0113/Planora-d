import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/query'
import type { Profile, UserPreferences } from '@/types/database'
import { useAuth } from '@/features/auth/auth-context'
import { workspaceKeys } from '@/features/workspace/queries'

export const preferenceKeys = {
  preferences: (userId: string) => ['preferences', userId] as const,
}

export function usePreferences() {
  const { user } = useAuth()
  return useQuery({
    queryKey: preferenceKeys.preferences(user?.id ?? 'anonymous'),
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap<UserPreferences | null>(
        await supabase.from('user_preferences').select('*').eq('user_id', user!.id).maybeSingle(),
      ),
  })
}

export type PreferencesInput = Partial<
  Pick<
    UserPreferences,
    | 'in_app_enabled'
    | 'email_enabled'
    | 'browser_enabled'
    | 'overdue_alerts'
    | 'due_soon_alerts'
    | 'default_reminder_minutes'
    | 'week_starts_on'
  >
>

export function useUpdatePreferences() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: PreferencesInput) =>
      unwrap<UserPreferences>(
        await supabase
          .from('user_preferences')
          .update(patch)
          .eq('user_id', user!.id)
          .select()
          .single(),
      ),
    onSuccess: (data) => qc.setQueryData(preferenceKeys.preferences(user!.id), data),
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, 'full_name' | 'timezone'>>) =>
      unwrap<Profile>(
        await supabase.from('profiles').update(patch).eq('id', user!.id).select().single(),
      ),
    onSuccess: (data) => {
      qc.setQueryData(workspaceKeys.profile(user!.id), data)
      void qc.invalidateQueries({ queryKey: ['ws'] })
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: 'DELETE' },
      })
      if (error) throw error
      await supabase.auth.signOut()
    },
  })
}

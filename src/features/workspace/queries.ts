import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Workspace, WorkspaceRole } from '@/types/database'
import { useAuth } from '@/features/auth/auth-context'

export const workspaceKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  personalWorkspace: (userId: string) => ['workspace', 'personal', userId] as const,
}

function getDisplayName(user: Pick<User, 'email' | 'user_metadata'>) {
  const fullName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim()
      : user.email?.split('@')[0] ?? 'My'

  return fullName
}

export async function ensureUserProfile(user: Pick<User, 'id' | 'email' | 'user_metadata'>): Promise<Profile> {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError
  if (existing) return existing

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      full_name: getDisplayName(user),
      timezone: 'Africa/Johannesburg',
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function ensurePersonalWorkspace(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
): Promise<PersonalWorkspace> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspaces!inner(*)')
    .eq('user_id', user.id)
    .eq('workspace.is_personal', true)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  if (data?.workspace) {
    const workspace = data.workspace as unknown as Workspace
    return { ...workspace, role: data.role }
  }

  await ensureUserProfile(user)

  const workspaceName = `${getDisplayName(user).split(/\s+/)[0] ?? 'My'}'s workspace`
  const { data: createdWorkspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      name: workspaceName,
      owner_id: user.id,
      is_personal: true,
    })
    .select('*')
    .single()

  if (workspaceError) throw workspaceError

  const { error: membershipError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: createdWorkspace.id,
      user_id: user.id,
      role: 'owner',
    })

  if (membershipError) throw membershipError

  return { ...createdWorkspace, role: 'owner' }
}

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: workspaceKeys.profile(user?.id ?? 'anonymous'),
    enabled: Boolean(user),
    queryFn: async (): Promise<Profile> => {
      if (!user) throw new Error('User is required to load profile')
      return ensureUserProfile(user)
    },
  })
}

export interface PersonalWorkspace extends Workspace {
  role: WorkspaceRole
}

/**
 * The private workspace created for every user at registration
 * (see the handle_new_user trigger in supabase/migrations).
 */
export function usePersonalWorkspace() {
  const { user } = useAuth()
  return useQuery({
    queryKey: workspaceKeys.personalWorkspace(user?.id ?? 'anonymous'),
    enabled: Boolean(user),
    queryFn: async (): Promise<PersonalWorkspace> => {
      if (!user) throw new Error('User is required to load personal workspace')
      return ensurePersonalWorkspace(user)
    },
  })
}

import { createContext, useContext } from 'react'
import type { Profile, UserPreferences } from '@/types/database'
import type { PersonalWorkspace } from './queries'

export interface WorkspaceContextValue {
  workspace: PersonalWorkspace
  workspaceId: string
  profile: Profile
  preferences: UserPreferences | null
  timezone: string
  /** Today's date (YYYY-MM-DD) in the user's timezone. */
  today: string
  weekStartsOn: 0 | 1
}

export const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}

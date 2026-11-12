import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ErrorState, FullPageLoader } from '@/components/ui'
import { todayInTz } from '@/lib/dates'
import { usePreferences } from '@/features/settings/api'
import { usePersonalWorkspace, useProfile } from './queries'
import { WorkspaceContext, type WorkspaceContextValue } from './workspace-context'

/** Loads the signed-in user's workspace, profile and preferences once for all app pages. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = usePersonalWorkspace()
  const profile = useProfile()
  const preferences = usePreferences()
  const timezone = profile.data?.timezone ?? 'Africa/Johannesburg'
  const [today, setToday] = useState(() => todayInTz(timezone))

  // Keep "today" correct across midnight and timezone changes.
  useEffect(() => {
    const update = () => setToday(todayInTz(timezone))
    update()
    const id = window.setInterval(update, 60_000)
    return () => window.clearInterval(id)
  }, [timezone])

  const value = useMemo<WorkspaceContextValue | null>(() => {
    if (!workspace.data || !profile.data) return null
    return {
      workspace: workspace.data,
      workspaceId: workspace.data.id,
      profile: profile.data,
      preferences: preferences.data ?? null,
      timezone,
      today,
      weekStartsOn: preferences.data?.week_starts_on ?? 1,
    }
  }, [workspace.data, profile.data, preferences.data, timezone, today])

  if (workspace.isError || profile.isError) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <ErrorState
          title="We couldn’t load your workspace"
          message="Check your connection and try again."
          onRetry={() => {
            void workspace.refetch()
            void profile.refetch()
          }}
        />
      </div>
    )
  }
  if (!value) return <FullPageLoader label="Loading your workspace" />

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

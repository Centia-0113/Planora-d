import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthContextValue } from './auth-context'

/**
 * Holds the current Supabase session and keeps it in sync with
 * sign-in, sign-out, token refresh and password-recovery events.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .catch(() => {
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false)
        // Never let one user's cached data leak into the next session.
        queryClient.clear()
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isPasswordRecovery,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [session, loading, isPasswordRecovery],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

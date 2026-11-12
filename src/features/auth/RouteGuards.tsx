import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageLoader } from '@/components/ui'
import { useAuth } from './auth-context'

/** Only signed-in users may render child routes; everyone else goes to /login. */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader label="Checking your session" />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** Login / register pages: signed-in users are sent straight to their dashboard. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

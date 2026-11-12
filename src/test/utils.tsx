import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'

export const fakeUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'alice@example.test',
} as User

export function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: null,
    user: null,
    loading: false,
    isPasswordRecovery: false,
    signOut: async () => {},
    ...overrides,
  }
}

/** Render a route tree at a given URL with a controllable auth state. */
export function renderRoutes(
  routes: RouteObject[],
  { initialPath = '/', auth = authValue() }: { initialPath?: string; auth?: AuthContextValue } = {},
) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return { ...utils, router }
}

/** Render a single page at "/" with routing context. */
export function renderPage(
  element: ReactElement,
  extraRoutes: RouteObject[] = [],
  auth?: AuthContextValue,
) {
  return renderRoutes([{ path: '/', element }, ...extraRoutes], { auth })
}

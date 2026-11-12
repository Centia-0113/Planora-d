import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { AuthContext } from '@/features/auth/auth-context'
import {
  WorkspaceContext,
  type WorkspaceContextValue,
} from '@/features/workspace/workspace-context'
import type { Task } from '@/types/database'
import { authValue, fakeUser } from './utils'

export const TODAY = '2026-11-12'
export const WS = 'ws-1'

export const workspaceValue: WorkspaceContextValue = {
  workspace: {
    id: WS,
    name: 'Alice’s workspace',
    owner_id: fakeUser.id,
    is_personal: true,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    role: 'owner',
  },
  workspaceId: WS,
  profile: {
    id: fakeUser.id,
    full_name: 'Alice Mokoena',
    avatar_url: null,
    timezone: 'Africa/Johannesburg',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
  preferences: null,
  timezone: 'Africa/Johannesburg',
  today: TODAY,
  weekStartsOn: 1,
}

/** Render an in-app page with auth + workspace context and a fresh query cache. */
export function renderAppPage(
  element: ReactElement,
  { path = '/', initialPath = '/', extraRoutes = [] as RouteObject[] } = {},
) {
  const router = createMemoryRouter([{ path, element }, ...extraRoutes], {
    initialEntries: [initialPath],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue({ user: fakeUser })}>
        <WorkspaceContext.Provider value={workspaceValue}>
          <RouterProvider router={router} />
        </WorkspaceContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return { ...utils, router }
}

export function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
    workspace_id: WS,
    category_id: null,
    project_id: null,
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'medium',
    start_date: null,
    due_date: null,
    completed_at: null,
    assigned_to: null,
    created_by: fakeUser.id,
    created_at: '2026-11-01T08:00:00Z',
    updated_at: '2026-11-01T08:00:00Z',
    ...overrides,
  }
}

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RouteObject } from 'react-router-dom'
import { authValue, fakeUser, renderRoutes } from '@/test/utils'
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards'

const routes: RouteObject[] = [
  {
    element: <PublicOnlyRoute />,
    children: [{ path: '/login', element: <h1>Login page</h1> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <h1>Dashboard</h1> },
      { path: '/tasks', element: <h1>Tasks</h1> },
    ],
  },
]

describe('ProtectedRoute', () => {
  it('redirects unauthenticated visitors to /login', async () => {
    const { router } = renderRoutes(routes, { initialPath: '/dashboard' })
    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('remembers where the visitor was going', async () => {
    const { router } = renderRoutes(routes, { initialPath: '/tasks' })
    await screen.findByRole('heading', { name: 'Login page' })
    expect(router.state.location.state).toEqual({ from: '/tasks' })
  })

  it('shows a loader, not the page, while the session is being checked', () => {
    renderRoutes(routes, { initialPath: '/dashboard', auth: authValue({ loading: true }) })
    expect(screen.getByRole('status', { name: 'Checking your session' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('renders the page for signed-in users', async () => {
    renderRoutes(routes, { initialPath: '/dashboard', auth: authValue({ user: fakeUser }) })
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})

describe('PublicOnlyRoute', () => {
  it('sends signed-in users from /login to the dashboard', async () => {
    const { router } = renderRoutes(routes, {
      initialPath: '/login',
      auth: authValue({ user: fakeUser }),
    })
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it('shows the login page to visitors', async () => {
    renderRoutes(routes, { initialPath: '/login' })
    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeInTheDocument()
  })
})

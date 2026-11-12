import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/utils'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))

beforeEach(() => {
  vi.clearAllMocks()
})

const dashboardRoute = { path: '/dashboard', element: <h1>Dashboard</h1> }
const verifyRoute = { path: '/verify-email', element: <h1>Verify email</h1> }

describe('LoginPage', () => {
  it('validates input before contacting the server', async () => {
    renderPage(<LoginPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs in and opens the dashboard', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    renderPage(<LoginPage />, [dashboardRoute])

    await userEvent.type(await screen.findByLabelText('Email'), ' alice@example.test ')
    await userEvent.type(screen.getByLabelText('Password'), 'planora2026')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'alice@example.test',
      password: 'planora2026',
    })
  })

  it('shows a friendly message for wrong credentials', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: new Error('Invalid login credentials'),
    })
    renderPage(<LoginPage />)

    await userEvent.type(await screen.findByLabelText('Email'), 'alice@example.test')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password do not match an account.',
    )
  })
})

describe('RegisterPage', () => {
  async function fillForm(overrides: Partial<Record<string, string>> = {}) {
    const values = {
      'Full name': 'Alice Mokoena',
      Email: 'alice@example.test',
      Password: 'planora2026',
      'Confirm password': 'planora2026',
      ...overrides,
    }
    for (const [label, value] of Object.entries(values)) {
      if (value) await userEvent.type(await screen.findByLabelText(label), value)
    }
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
  }

  it('rejects mismatched passwords and weak passwords', async () => {
    renderPage(<RegisterPage />)
    await fillForm({ Password: 'short', 'Confirm password': 'different' })
    expect(screen.getByText(/at least 8 characters\./)).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('registers and asks the user to verify their email', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null })
    const { router } = renderPage(<RegisterPage />, [verifyRoute])
    await fillForm()

    expect(await screen.findByRole('heading', { name: 'Verify email' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?email=alice%40example.test')
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'alice@example.test',
      password: 'planora2026',
      options: {
        data: { full_name: 'Alice Mokoena' },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  })

  it('reports an existing account', async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: new Error('User already registered') })
    renderPage(<RegisterPage />)
    await fillForm()
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/)
  })
})

describe('ForgotPasswordPage', () => {
  it('sends a reset link that returns to /reset-password', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    renderPage(<ForgotPasswordPage />)

    await userEvent.type(await screen.findByLabelText('Email'), 'alice@example.test')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    await waitFor(() =>
      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('alice@example.test', {
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    )
    expect(await screen.findByText(/password reset link is on its way/)).toBeInTheDocument()
  })
})

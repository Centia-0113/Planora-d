import { describe, expect, it, vi } from 'vitest'
import { ensurePersonalWorkspace, ensureUserProfile } from './queries'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

describe('workspace onboarding recovery', () => {
  it('creates a profile when the authenticated user has no profile row', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-1', full_name: 'Alice Example', timezone: 'Africa/Johannesburg' },
            error: null,
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await ensureUserProfile({
      id: 'user-1',
      email: 'alice@example.com',
      user_metadata: { full_name: 'Alice Example' },
    } as any)

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(result).toMatchObject({ id: 'user-1', full_name: 'Alice Example' })
  })

  it('creates a personal workspace when the user has no personal workspace row', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          insert: vi.fn().mockReturnThis(),
        }
      }

      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-1', full_name: 'Alice Example', timezone: 'Africa/Johannesburg' },
            error: null,
          }),
        }
      }

      if (table === 'workspaces') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'workspace-1', name: "Alice's workspace", owner_id: 'user-1', is_personal: true },
            error: null,
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await ensurePersonalWorkspace({
      id: 'user-1',
      email: 'alice@example.com',
      user_metadata: { full_name: 'Alice Example' },
    } as any)

    expect(mockSupabase.from).toHaveBeenCalledWith('workspaces')
    expect(result).toMatchObject({ owner_id: 'user-1', is_personal: true })
  })
})

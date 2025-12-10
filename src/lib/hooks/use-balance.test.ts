import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useBalance } from './use-balance'
import { createMockSupabaseClient, mockUser } from '@/test/mocks/supabase'

// Mock the Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('useBalance', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient({ balance: 1000 })
    vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return 0 balance when user is null', async () => {
    const { result } = renderHook(() => useBalance(null))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.balance).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('should fetch balance when user is provided', async () => {
    const { result } = renderHook(() => useBalance(mockUser))

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.balance).toBe(1000)
    expect(result.current.error).toBeNull()
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'get_user_balance',
      { p_user_id: mockUser.id }
    )
  })

  it('should handle RPC error gracefully', async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const { result } = renderHook(() => useBalance(mockUser))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // The hook catches error and uses fallback message
    expect(result.current.error).toBe('Erro ao carregar saldo')
    expect(result.current.balance).toBe(0)
  })

  it('should handle network error', async () => {
    mockSupabase.rpc = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useBalance(mockUser))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
  })

  it('should allow manual refetch', async () => {
    mockSupabase.rpc = vi.fn()
      .mockResolvedValueOnce({ data: 1000, error: null })
      .mockResolvedValueOnce({ data: 1500, error: null })

    const { result } = renderHook(() => useBalance(mockUser))

    await waitFor(() => {
      expect(result.current.balance).toBe(1000)
    })

    // Trigger manual refetch
    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.balance).toBe(1500)
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(2)
  })

  it('should subscribe to realtime updates', async () => {
    renderHook(() => useBalance(mockUser))

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith(`ledger:${mockUser.id}`)
    })
  })

  it('should handle null data from RPC', async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    const { result } = renderHook(() => useBalance(mockUser))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.balance).toBe(0)
  })

  it('should return different balances for different users', async () => {
    const user1 = { ...mockUser, id: 'user-1' }
    const user2 = { ...mockUser, id: 'user-2' }

    mockSupabase.rpc = vi.fn()
      .mockImplementation((fn, params) => {
        if (params?.p_user_id === 'user-1') {
          return Promise.resolve({ data: 500, error: null })
        }
        return Promise.resolve({ data: 2000, error: null })
      })

    const { result: result1 } = renderHook(() => useBalance(user1))
    const { result: result2 } = renderHook(() => useBalance(user2))

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false)
      expect(result2.current.isLoading).toBe(false)
    })

    expect(result1.current.balance).toBe(500)
    expect(result2.current.balance).toBe(2000)
  })
})

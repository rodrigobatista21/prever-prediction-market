import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTrade } from './use-trade'
import { createMockSupabaseClient } from '@/test/mocks/supabase'

// Mock the Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock the rate limiter
vi.mock('@/lib/utils/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, resetIn: 0 }),
  formatRateLimitError: vi.fn((resetIn: number) => `Rate limited. Try again in ${resetIn}s`),
}))

import { createClient } from '@/lib/supabase/client'
import { checkRateLimit, formatRateLimitError } from '@/lib/utils/rate-limiter'

describe('useTrade', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>)
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, resetIn: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('buyShares', () => {
    it('should successfully buy shares', async () => {
      const expectedResponse = {
        success: true,
        shares_bought: 90.909,
        new_balance: 900,
        new_pool_yes: 1100,
        new_pool_no: 909.09,
      }

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: expectedResponse,
        error: null,
      })

      const { result } = renderHook(() => useTrade())

      let response
      await act(async () => {
        response = await result.current.buyShares('market-123', true, 100)
      })

      expect(response).toEqual(expectedResponse)
      expect(result.current.error).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_buy_shares', {
        p_market_id: 'market-123',
        p_outcome: true,
        p_amount: 100,
      })
    })

    it('should handle buy shares error', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Saldo insuficiente' },
      })

      const { result } = renderHook(() => useTrade())

      let response
      await act(async () => {
        response = await result.current.buyShares('market-123', true, 100)
      })

      expect(response).toBeNull()
      expect(result.current.error).toBe('Saldo insuficiente')
    })

    it('should respect rate limit', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, resetIn: 30 })

      const { result } = renderHook(() => useTrade())

      let response
      await act(async () => {
        response = await result.current.buyShares('market-123', true, 100)
      })

      expect(response).toBeNull()
      expect(formatRateLimitError).toHaveBeenCalledWith(30)
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('should set loading state correctly', async () => {
      let resolveRpc: (value: unknown) => void
      mockSupabase.rpc = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveRpc = resolve
        })
      })

      const { result } = renderHook(() => useTrade())

      expect(result.current.isLoading).toBe(false)

      // Start buy operation
      let buyPromise: Promise<unknown>
      act(() => {
        buyPromise = result.current.buyShares('market-123', true, 100)
      })

      // Should be loading now
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Resolve the RPC call
      await act(async () => {
        resolveRpc!({ data: { success: true }, error: null })
        await buyPromise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('sellShares', () => {
    it('should successfully sell shares', async () => {
      const expectedResponse = {
        success: true,
        amount_received: 47.62,
        new_balance: 1047.62,
        new_pool_yes: 952.38,
        new_pool_no: 1050,
      }

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: expectedResponse,
        error: null,
      })

      const { result } = renderHook(() => useTrade())

      let response
      await act(async () => {
        response = await result.current.sellShares('market-123', true, 50)
      })

      expect(response).toEqual(expectedResponse)
      expect(result.current.error).toBeNull()
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_sell_shares', {
        p_market_id: 'market-123',
        p_outcome: true,
        p_shares: 50,
      })
    })

    it('should handle sell shares error', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Ações insuficientes' },
      })

      const { result } = renderHook(() => useTrade())

      let response
      await act(async () => {
        response = await result.current.sellShares('market-123', true, 50)
      })

      expect(response).toBeNull()
      expect(result.current.error).toBe('Ações insuficientes')
    })

    it('should respect rate limit for sell', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, resetIn: 15 })

      const { result } = renderHook(() => useTrade())

      let response
      await act(async () => {
        response = await result.current.sellShares('market-123', false, 25)
      })

      expect(response).toBeNull()
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('depositMock', () => {
    it('should successfully deposit', async () => {
      const expectedResponse = {
        success: true,
        new_balance: 1100,
      }

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: expectedResponse,
        error: null,
      })

      const { result } = renderHook(() => useTrade())

      let response
      await act(async () => {
        response = await result.current.depositMock('user-123', 100)
      })

      expect(response).toEqual(expectedResponse)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_deposit_mock', {
        p_user_id: 'user-123',
        p_amount: 100,
      })
    })

    it('should handle deposit error', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Deposit failed' },
      })

      const { result } = renderHook(() => useTrade())

      let response
      await act(async () => {
        response = await result.current.depositMock('user-123', 100)
      })

      expect(response).toBeNull()
      expect(result.current.error).toBe('Deposit failed')
    })
  })

  describe('clearError', () => {
    it('should clear error', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Some error' },
      })

      const { result } = renderHook(() => useTrade())

      await act(async () => {
        await result.current.buyShares('market-123', true, 100)
      })

      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockSupabase.rpc = vi.fn().mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTrade())

      await act(async () => {
        await result.current.buyShares('market-123', true, 100)
      })

      expect(result.current.error).toBe('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      mockSupabase.rpc = vi.fn().mockRejectedValue('Unknown error')

      const { result } = renderHook(() => useTrade())

      await act(async () => {
        await result.current.buyShares('market-123', true, 100)
      })

      expect(result.current.error).toBe('Erro ao comprar ações')
    })
  })
})

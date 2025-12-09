'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { checkRateLimit, formatRateLimitError } from '@/lib/utils/rate-limiter'
import type { BuySharesResponse, SellSharesResponse, DepositResponse } from '@/lib/types/database.types'

interface UseTradeReturn {
  isLoading: boolean
  error: string | null
  buyShares: (
    marketId: string,
    outcome: boolean,
    amount: number
  ) => Promise<BuySharesResponse | null>
  sellShares: (
    marketId: string,
    outcome: boolean,
    shares: number
  ) => Promise<SellSharesResponse | null>
  depositMock: (
    userId: string,
    amount: number
  ) => Promise<DepositResponse | null>
  clearError: () => void
}

export function useTrade(): UseTradeReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const buyShares = useCallback(async (
    marketId: string,
    outcome: boolean,
    amount: number
  ): Promise<BuySharesResponse | null> => {
    try {
      // Rate limit check
      const rateLimitResult = checkRateLimit(marketId, 'trade')
      if (!rateLimitResult.allowed) {
        setError(formatRateLimitError(rateLimitResult.resetIn))
        return null
      }

      setIsLoading(true)
      setError(null)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('rpc_buy_shares', {
          p_market_id: marketId,
          p_outcome: outcome,
          p_amount: amount,
        })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      return data as BuySharesResponse
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao comprar ações'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const sellShares = useCallback(async (
    marketId: string,
    outcome: boolean,
    shares: number
  ): Promise<SellSharesResponse | null> => {
    try {
      // Rate limit check
      const rateLimitResult = checkRateLimit(marketId, 'trade')
      if (!rateLimitResult.allowed) {
        setError(formatRateLimitError(rateLimitResult.resetIn))
        return null
      }

      setIsLoading(true)
      setError(null)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('rpc_sell_shares', {
          p_market_id: marketId,
          p_outcome: outcome,
          p_shares: shares,
        })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      return data as SellSharesResponse
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao vender ações'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const depositMock = useCallback(async (
    userId: string,
    amount: number
  ): Promise<DepositResponse | null> => {
    try {
      // Rate limit check
      const rateLimitResult = checkRateLimit(userId, 'deposit')
      if (!rateLimitResult.allowed) {
        setError(formatRateLimitError(rateLimitResult.resetIn))
        return null
      }

      setIsLoading(true)
      setError(null)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('rpc_deposit_mock', {
          p_user_id: userId,
          p_amount: amount,
        })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      return data as DepositResponse
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao depositar'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    buyShares,
    sellShares,
    depositMock,
    clearError,
  }
}

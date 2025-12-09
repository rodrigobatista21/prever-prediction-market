'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

import type { MarketCategory } from '@/lib/types/database.types'

interface CreateMarketParams {
  title: string
  description: string
  category?: MarketCategory
  ends_at: string
  initial_liquidity?: number
  image_url?: string | null
}

interface CreateMarketResponse {
  success: boolean
  market_id: string
}

interface ResolveMarketResponse {
  success: boolean
  winning_outcome: boolean
  total_payout: number
  winners_count: number
}

export function useAdmin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const clearError = useCallback(() => setError(null), [])

  const createMarket = useCallback(async (params: CreateMarketParams): Promise<CreateMarketResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('rpc_create_market', {
        p_title: params.title,
        p_description: params.description,
        p_ends_at: params.ends_at,
        p_initial_liquidity: params.initial_liquidity ?? 1000,
        p_image_url: params.image_url ?? null,
        p_category: params.category ?? 'outros',
      })

      if (rpcError) {
        setError(rpcError.message)
        return null
      }

      return data as CreateMarketResponse
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar mercado'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const resolveMarket = useCallback(async (
    marketId: string,
    winningOutcome: boolean
  ): Promise<ResolveMarketResponse | null> => {
    setIsLoading(true)
    setError(null)

    console.log('useAdmin: Resolving market', { marketId, winningOutcome })

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('rpc_resolve_market', {
        p_market_id: marketId,
        p_winning_outcome: winningOutcome,
      })

      console.log('useAdmin: RPC response', { data, error: rpcError })

      if (rpcError) {
        console.error('useAdmin: RPC error', rpcError)
        setError(rpcError.message)
        return null
      }

      return data as ResolveMarketResponse
    } catch (err) {
      console.error('useAdmin: Unexpected error', err)
      const message = err instanceof Error ? err.message : 'Erro ao resolver mercado'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    createMarket,
    resolveMarket,
    isLoading,
    error,
    clearError,
  }
}

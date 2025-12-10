'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Market, MarketWithOdds } from '@/lib/types/database.types'
import { calculateOdds, calculateTotalLiquidity } from '@/lib/utils/cpmm'

interface UseMarketReturn {
  market: MarketWithOdds | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMarket(marketId: string): UseMarketReturn {
  const [market, setMarket] = useState<MarketWithOdds | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const transformMarket = (m: Market): MarketWithOdds => {
    const odds = calculateOdds({
      poolYes: m.pool_yes,
      poolNo: m.pool_no,
    })
    return {
      ...m,
      odds_yes: odds.yes * 100,
      odds_no: odds.no * 100,
      total_liquidity: calculateTotalLiquidity({
        poolYes: m.pool_yes,
        poolNo: m.pool_no,
      }),
    }
  }

  const fetchMarket = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('markets')
        .select('*')
        .eq('id', marketId)
        .single()

      if (fetchError) throw fetchError

      setMarket(data ? transformMarket(data) : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mercado')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, marketId])

  useEffect(() => {
    if (marketId) {
      fetchMarket()
    }
  }, [marketId, fetchMarket])

  // Realtime subscription para este mercado específico
  useEffect(() => {
    if (!marketId) return

    const channel = supabase
      .channel(`market:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'markets',
          filter: `id=eq.${marketId}`,
        },
        (payload) => {
          const updatedMarket = payload.new as Market
          setMarket(transformMarket(updatedMarket))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, marketId])

  return {
    market,
    isLoading,
    error,
    refetch: fetchMarket,
  }
}

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Market, MarketWithOdds } from '@/lib/types/database.types'
import { calculateOdds, calculateTotalLiquidity } from '@/lib/utils/cpmm'

interface UseMarketsReturn {
  markets: MarketWithOdds[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMarkets(): UseMarketsReturn {
  const [markets, setMarkets] = useState<MarketWithOdds[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscribed = useRef(false)

  const supabase = createClient()

  const transformMarket = (market: Market): MarketWithOdds => {
    const odds = calculateOdds({
      poolYes: market.pool_yes,
      poolNo: market.pool_no,
    })
    return {
      ...market,
      odds_yes: odds.yes * 100,
      odds_no: odds.no * 100,
      total_liquidity: calculateTotalLiquidity({
        poolYes: market.pool_yes,
        poolNo: market.pool_no,
      }),
    }
  }

  const fetchMarkets = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('markets')
        .select('*')
        .is('outcome', null) // Apenas mercados abertos
        .gt('ends_at', new Date().toISOString()) // Não encerrados
        .order('ends_at', { ascending: true })

      if (fetchError) throw fetchError

      setMarkets((data ?? []).map(transformMarket))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mercados')
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  // Realtime subscription para atualizações de mercados
  useEffect(() => {
    // Prevent duplicate subscriptions
    if (subscribed.current) return
    subscribed.current = true

    const channel = supabase
      .channel('markets:updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'markets',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedMarket = payload.new as Market
            setMarkets((prev) =>
              prev.map((m) =>
                m.id === updatedMarket.id ? transformMarket(updatedMarket) : m
              )
            )
          } else if (payload.eventType === 'INSERT') {
            const newMarket = payload.new as Market
            if (!newMarket.outcome && new Date(newMarket.ends_at) > new Date()) {
              setMarkets((prev) => [...prev, transformMarket(newMarket)])
            }
          }
        }
      )
      .subscribe()

    return () => {
      subscribed.current = false
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    markets,
    isLoading,
    error,
    refetch: fetchMarkets,
  }
}

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MarketTrade {
  id: string
  userId: string
  userName: string | null
  amount: number
  description: string
  createdAt: string
  outcome: 'yes' | 'no' | null
  shares: number | null
}

interface UseMarketTradesReturn {
  trades: MarketTrade[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useMarketTrades(marketId: string): UseMarketTradesReturn {
  const [trades, setTrades] = useState<MarketTrade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscribed = useRef(false)

  const supabase = createClient()

  const fetchTrades = useCallback(async () => {
    if (!marketId) return

    try {
      setIsLoading(true)
      setError(null)

      // Query ledger entries for this market with user profiles
      const { data, error: queryError } = await supabase
        .from('ledger_entries')
        .select(`
          id,
          user_id,
          amount,
          description,
          created_at,
          profiles:user_id (
            full_name
          )
        `)
        .eq('reference_id', marketId)
        .eq('category', 'TRADE')
        .lt('amount', 0) // Only buys (negative = money spent)
        .not('description', 'ilike', '%ESTORNO%') // Exclude reversals
        .not('description', 'ilike', '%TESTE%') // Exclude tests
        .order('created_at', { ascending: false })
        .limit(50)

      if (queryError) {
        setError(queryError.message)
        return
      }

      // Transform data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedTrades: MarketTrade[] = (data || []).map((entry: any) => {
        // Parse description to extract outcome and shares
        // Format: "Compra de X.XX ações SIM/NÃO"
        const description = entry.description || ''
        const sharesMatch = description.match(/Compra de ([\d.,]+) ações (SIM|NÃO)/i)

        let outcome: 'yes' | 'no' | null = null
        let shares: number | null = null

        if (sharesMatch) {
          shares = parseFloat(sharesMatch[1].replace(',', '.'))
          outcome = sharesMatch[2].toUpperCase() === 'SIM' ? 'yes' : 'no'
        }

        return {
          id: entry.id,
          userId: entry.user_id,
          userName: entry.profiles?.full_name || null,
          amount: Math.abs(parseFloat(entry.amount)),
          description: entry.description,
          createdAt: entry.created_at,
          outcome,
          shares
        }
      })

      setTrades(transformedTrades)
    } catch {
      setError('Erro ao carregar histórico')
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId])

  useEffect(() => {
    fetchTrades()

    // Prevent duplicate subscriptions
    if (subscribed.current) return
    subscribed.current = true

    // Subscribe to new trades
    const channel = supabase
      .channel(`market-trades-${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_entries',
          filter: `reference_id=eq.${marketId}`
        },
        () => {
          fetchTrades()
        }
      )
      .subscribe()

    return () => {
      subscribed.current = false
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId])

  return {
    trades,
    isLoading,
    error,
    refetch: fetchTrades
  }
}

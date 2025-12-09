'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PaymentWinner {
  user_id: string
  user_name: string
  payout: number
  shares: number
  paid_at: string
}

export interface PaymentLoser {
  user_id: string
  user_name: string
  shares_lost: number
  avg_cost: number
}

export interface ResolvedMarketPayment {
  id: string
  title: string
  category: string
  outcome: boolean
  resolved_at: string
  pool_yes: number
  pool_no: number
  total_liquidity: number
  total_bet: number
  total_payout: number
  winners_count: number
  losers_count: number
  winners: PaymentWinner[] | null
  losers: PaymentLoser[] | null
}

export interface PaymentSummary {
  total_markets_resolved: number
  total_collected: number
  total_paid: number
  total_deposits: number
}

export interface PaymentReportResponse {
  success: boolean
  summary: PaymentSummary
  markets: ResolvedMarketPayment[]
}

export function useAdminPayments() {
  const [data, setData] = useState<PaymentReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchReport = useCallback(async (marketId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error: rpcError } = await (supabase.rpc as any)(
        'get_admin_payment_report',
        marketId ? { p_market_id: marketId } : {}
      )

      if (rpcError) {
        console.error('useAdminPayments: RPC error', rpcError)
        setError(rpcError.message)
        return null
      }

      setData(result as PaymentReportResponse)
      return result as PaymentReportResponse
    } catch (err) {
      console.error('useAdminPayments: Unexpected error', err)
      const message = err instanceof Error ? err.message : 'Erro ao carregar relatório'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Auto-fetch on mount
  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const refetch = useCallback(() => {
    return fetchReport()
  }, [fetchReport])

  const fetchByMarket = useCallback((marketId: string) => {
    return fetchReport(marketId)
  }, [fetchReport])

  // Calculated metrics
  const systemProfit = data?.summary
    ? data.summary.total_collected - data.summary.total_paid
    : 0

  const profitMargin = data?.summary && data.summary.total_collected > 0
    ? ((data.summary.total_collected - data.summary.total_paid) / data.summary.total_collected) * 100
    : 0

  return {
    data,
    summary: data?.summary ?? null,
    markets: data?.markets ?? [],
    isLoading,
    error,
    refetch,
    fetchByMarket,
    // Calculated
    systemProfit,
    profitMargin,
  }
}

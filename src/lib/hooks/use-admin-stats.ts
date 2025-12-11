'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminStats {
  // Users
  totalUsers: number
  activeUsers24h: number
  activeUsers7d: number
  newUsersToday: number

  // Markets
  totalMarkets: number
  openMarkets: number
  resolvedMarkets: number
  pendingResolution: number

  // Financial
  totalVolume: number
  volumeToday: number
  totalLiquidity: number
  totalUserBalances: number

  // Activity
  tradesToday: number
  tradesThisWeek: number
}

export interface RecentActivity {
  id: string
  type: 'trade' | 'deposit' | 'withdrawal' | 'market_created' | 'market_resolved'
  description: string
  amount?: number
  userId?: string
  userName?: string
  createdAt: string
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // Fetch all stats in parallel
      const [
        usersResult,
        activeUsers24hResult,
        activeUsers7dResult,
        newUsersTodayResult,
        marketsResult,
        pendingMarketsResult,
        volumeTodayResult,
        totalVolumeResult,
        totalLiquidityResult,
        totalBalancesResult,
        tradesTodayResult,
        tradesWeekResult,
      ] = await Promise.all([
        // Total users
        supabase.from('profiles').select('*', { count: 'exact', head: true }),

        // Active users 24h (distinct users with ledger entries)
        supabase
          .from('ledger_entries')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', yesterday),

        // Active users 7d
        supabase
          .from('ledger_entries')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', weekAgo),

        // New users today
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today),

        // Markets stats
        supabase.from('markets').select('outcome'),

        // Pending resolution (ended but not resolved)
        supabase
          .from('markets')
          .select('*', { count: 'exact', head: true })
          .is('outcome', null)
          .lt('ends_at', now.toISOString()),

        // Volume today
        supabase
          .from('ledger_entries')
          .select('amount')
          .in('category', ['buy', 'sell'])
          .gte('created_at', today),

        // Total volume
        supabase
          .from('ledger_entries')
          .select('amount')
          .in('category', ['buy', 'sell']),

        // Total liquidity (sum of pools in open markets)
        supabase
          .from('markets')
          .select('pool_yes, pool_no')
          .is('outcome', null),

        // Total user balances
        supabase.from('ledger_entries').select('amount'),

        // Trades today
        supabase
          .from('ledger_entries')
          .select('*', { count: 'exact', head: true })
          .in('category', ['buy', 'sell'])
          .gte('created_at', today),

        // Trades this week
        supabase
          .from('ledger_entries')
          .select('*', { count: 'exact', head: true })
          .in('category', ['buy', 'sell'])
          .gte('created_at', weekAgo),
      ])

      // Calculate markets by status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markets = (marketsResult.data || []) as any[]
      const openMarkets = markets.filter(m => m.outcome === null).length
      const resolvedMarkets = markets.filter(m => m.outcome !== null).length

      // Calculate volumes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const volumeToday = ((volumeTodayResult.data || []) as any[])
        .reduce((sum, e) => sum + Math.abs(e.amount), 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalVolume = ((totalVolumeResult.data || []) as any[])
        .reduce((sum, e) => sum + Math.abs(e.amount), 0)

      // Calculate liquidity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalLiquidity = ((totalLiquidityResult.data || []) as any[])
        .reduce((sum, m) => sum + (m.pool_yes || 0) + (m.pool_no || 0), 0)

      // Calculate total balances
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalUserBalances = ((totalBalancesResult.data || []) as any[])
        .reduce((sum, e) => sum + e.amount, 0)

      setStats({
        totalUsers: usersResult.count ?? 0,
        activeUsers24h: activeUsers24hResult.count ?? 0,
        activeUsers7d: activeUsers7dResult.count ?? 0,
        newUsersToday: newUsersTodayResult.count ?? 0,
        totalMarkets: markets.length,
        openMarkets,
        resolvedMarkets,
        pendingResolution: pendingMarketsResult.count ?? 0,
        totalVolume,
        volumeToday,
        totalLiquidity,
        totalUserBalances,
        tradesToday: tradesTodayResult.count ?? 0,
        tradesThisWeek: tradesWeekResult.count ?? 0,
      })
    } catch (err) {
      console.error('Error fetching admin stats:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const fetchRecentActivity = useCallback(async () => {
    try {
      // Fetch recent ledger entries with user info
      const { data: entries } = await supabase
        .from('ledger_entries')
        .select(`
          id,
          category,
          amount,
          description,
          created_at,
          user_id,
          profiles!inner(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (entries) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activity: RecentActivity[] = (entries as any[]).map((entry) => {
          let type: RecentActivity['type'] = 'trade'
          if (entry.category === 'deposit') type = 'deposit'
          else if (entry.category === 'withdrawal') type = 'withdrawal'
          else if (entry.category === 'buy' || entry.category === 'sell') type = 'trade'

          return {
            id: entry.id,
            type,
            description: entry.description || `${entry.category} de R$ ${Math.abs(entry.amount).toFixed(2)}`,
            amount: entry.amount,
            userId: entry.user_id,
            userName: (entry.profiles as { full_name: string | null })?.full_name || 'Usuário',
            createdAt: entry.created_at,
          }
        })

        setRecentActivity(activity)
      }
    } catch (err) {
      console.error('Error fetching recent activity:', err)
    }
  }, [supabase])

  useEffect(() => {
    fetchStats()
    fetchRecentActivity()
  }, [fetchStats, fetchRecentActivity])

  return {
    stats,
    recentActivity,
    isLoading,
    error,
    refresh: () => {
      fetchStats()
      fetchRecentActivity()
    },
  }
}

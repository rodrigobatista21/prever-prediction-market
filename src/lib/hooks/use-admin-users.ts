'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  balance: number
  created_at: string
  last_activity: string | null
  total_trades: number
  total_volume: number
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      if (!profiles) {
        setUsers([])
        return
      }

      // For each user, calculate balance and activity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usersWithStats = await Promise.all(
        (profiles as any[]).map(async (profile) => {
          // Get balance
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: balanceData } = await (supabase as any)
            .from('ledger_entries')
            .select('amount')
            .eq('user_id', profile.id)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const balance = ((balanceData || []) as any[]).reduce((sum, e) => sum + e.amount, 0)

          // Get trade stats
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: tradeData } = await (supabase as any)
            .from('ledger_entries')
            .select('amount, created_at')
            .eq('user_id', profile.id)
            .in('category', ['buy', 'sell'])

          const totalTrades = tradeData?.length || 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalVolume = ((tradeData || []) as any[]).reduce((sum, e) => sum + Math.abs(e.amount), 0)

          // Get last activity
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: lastActivity } = await (supabase as any)
            .from('ledger_entries')
            .select('created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            is_admin: profile.is_admin || false,
            balance,
            created_at: profile.created_at,
            last_activity: lastActivity?.created_at || null,
            total_trades: totalTrades,
            total_volume: totalVolume,
          }
        })
      )

      setUsers(usersWithStats)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    users,
    isLoading,
    error,
    refresh: fetchUsers,
  }
}

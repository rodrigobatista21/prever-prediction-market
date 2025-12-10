'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface UseBalanceReturn {
  balance: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBalance(user: User | null): UseBalanceReturn {
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscribed = useRef(false)

  const supabase = createClient()

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setBalance(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: rpcError } = await supabase
        .rpc('get_user_balance', { p_user_id: user.id } as unknown as undefined) as { data: number | null; error: Error | null }

      if (rpcError) throw rpcError

      setBalance(data ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar saldo')
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Realtime subscription para ledger_entries
  useEffect(() => {
    if (!user) return
    if (subscribed.current) return
    subscribed.current = true

    const channel = supabase
      .channel(`ledger:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch balance when new ledger entry is added
          fetchBalance()
        }
      )
      .subscribe()

    return () => {
      subscribed.current = false
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  }
}

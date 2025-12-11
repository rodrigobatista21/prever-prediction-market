'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type OrderBook,
  type BestPrices,
  type PlaceOrderResult,
  parseOrderBookData
} from '@/lib/utils/orderbook'
import type { PlaceOrderResponse, CancelOrderResponse } from '@/lib/types/database.types'

/**
 * Hook para buscar e assinar o order book de um mercado
 */
export function useOrderBook(marketId: string, outcome: boolean) {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [bestPrices, setBestPrices] = useState<BestPrices | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchOrderBook = useCallback(async () => {
    try {
      // Buscar order book detalhado (non-blocking - we don't need this for trading)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: err } = await (supabase.rpc as any)('get_order_book_detailed', {
          p_market_id: marketId,
          p_outcome: outcome,
          p_depth: 10
        })

        if (!err && data) {
          const parsed = parseOrderBookData(data)
          setOrderBook(parsed)
        }
      } catch (detailErr) {
        // Non-critical - order book details are optional
        console.warn('[useOrderBook] get_order_book_detailed failed (non-critical):', detailErr)
      }

      // Buscar melhores preços - THIS IS CRITICAL for trading
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pricesData, error: pricesErr } = await (supabase.rpc as any)('get_best_prices', {
        p_market_id: marketId,
        p_outcome: outcome
      })

      if (pricesErr) throw pricesErr

      if (pricesData && pricesData.length > 0) {
        setBestPrices({
          best_bid: pricesData[0].best_bid ? Number(pricesData[0].best_bid) : null,
          best_ask: pricesData[0].best_ask ? Number(pricesData[0].best_ask) : null,
          bid_quantity: pricesData[0].bid_quantity ? Number(pricesData[0].bid_quantity) : null,
          ask_quantity: pricesData[0].ask_quantity ? Number(pricesData[0].ask_quantity) : null
        })
      } else {
        setBestPrices(null)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching order book:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar order book')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, marketId, outcome])

  useEffect(() => {
    fetchOrderBook()

    // Subscribe to changes
    const channel = supabase
      .channel(`orderbook-${marketId}-${outcome}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `market_id=eq.${marketId}`
        },
        () => {
          fetchOrderBook()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_fills',
          filter: `market_id=eq.${marketId}`
        },
        () => {
          fetchOrderBook()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, marketId, outcome, fetchOrderBook])

  return {
    orderBook,
    bestPrices,
    isLoading,
    error,
    refresh: fetchOrderBook
  }
}

/**
 * Hook para colocar ordens
 */
export function usePlaceOrder() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const placeOrder = async (
    marketId: string,
    outcome: boolean,
    side: 'buy' | 'sell',
    orderType: 'limit' | 'market',
    price: number | null,
    quantity: number
  ): Promise<PlaceOrderResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.rpc as any)('place_order', {
        p_user_id: user.id,
        p_market_id: marketId,
        p_outcome: outcome,
        p_side: side,
        p_order_type: orderType,
        p_price: price,
        p_quantity: quantity
      })

      if (err) throw err

      const result = data as PlaceOrderResponse

      if (!result.success) {
        setError(result.error || 'Erro ao colocar ordem')
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao colocar ordem'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = () => setError(null)

  return {
    placeOrder,
    isLoading,
    error,
    clearError
  }
}

/**
 * Hook para cancelar ordens
 */
export function useCancelOrder() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const cancelOrder = async (orderId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.rpc as any)('cancel_order', {
        p_user_id: user.id,
        p_order_id: orderId
      })

      if (err) throw err

      const result = data as CancelOrderResponse

      if (!result.success) {
        setError(result.error || 'Erro ao cancelar ordem')
        return false
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar ordem'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return { cancelOrder, isLoading, error }
}

/**
 * Hook para buscar ordens abertas do usuário
 */
export function useUserOrders() {
  const [orders, setOrders] = useState<Array<{
    id: string
    market_id: string
    market_title: string
    outcome: boolean
    side: 'buy' | 'sell'
    order_type: string
    price: number
    quantity: number
    filled_quantity: number
    status: string
    created_at: string
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setOrders([])
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.rpc as any)('get_user_open_orders', {
        p_user_id: user.id
      })

      if (err) throw err

      setOrders(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching user orders:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordens')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return { orders, isLoading, error, refresh: fetchOrders }
}

/**
 * Hook para buscar posições do usuário
 */
export function useUserPositions() {
  const [positions, setPositions] = useState<Array<{
    market_id: string
    market_title: string
    market_status: string
    outcome: boolean
    quantity: number
    avg_cost: number | null
    current_value: number
    unrealized_pnl: number
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchPositions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPositions([])
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.rpc as any)('get_user_positions', {
        p_user_id: user.id
      })

      if (err) throw err

      setPositions(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching positions:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar posições')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  return { positions, isLoading, error, refresh: fetchPositions }
}

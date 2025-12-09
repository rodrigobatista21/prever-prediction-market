'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OddsHistoryPoint {
  odds_yes: number
  odds_no: number
  recorded_at: string
}

interface UseOddsHistoryResult {
  history: OddsHistoryPoint[]
  isLoading: boolean
  error: string | null
}

// Cache para evitar requests repetidos
const historyCache = new Map<string, { data: OddsHistoryPoint[], timestamp: number }>()
const CACHE_TTL = 60000 // 1 minuto

export function useOddsHistory(marketId: string): UseOddsHistoryResult {
  const [history, setHistory] = useState<OddsHistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    // Verificar cache
    const cached = historyCache.get(marketId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setHistory(cached.data)
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { data, error: fetchError } = await supabase
        .from('odds_history')
        .select('odds_yes, odds_no, recorded_at')
        .eq('market_id', marketId)
        .order('recorded_at', { ascending: true })
        .limit(50)

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const historyData = (data || []).map((point: { odds_yes: number; odds_no: number; recorded_at: string }) => ({
        odds_yes: Number(point.odds_yes),
        odds_no: Number(point.odds_no),
        recorded_at: point.recorded_at,
      }))

      // Atualizar cache
      historyCache.set(marketId, { data: historyData, timestamp: Date.now() })

      setHistory(historyData)
      setError(null)
    } catch (err) {
      setError('Erro ao carregar histórico')
    } finally {
      setIsLoading(false)
    }
  }, [marketId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return { history, isLoading, error }
}

// Hook para buscar histórico de múltiplos mercados de uma vez (mais eficiente)
export function useMultipleOddsHistory(marketIds: string[]): Map<string, OddsHistoryPoint[]> {
  const [historyMap, setHistoryMap] = useState<Map<string, OddsHistoryPoint[]>>(new Map())

  useEffect(() => {
    if (marketIds.length === 0) return

    const fetchAll = async () => {
      const supabase = createClient()

      // Verificar quais IDs precisam ser buscados (não estão em cache)
      const idsToFetch = marketIds.filter(id => {
        const cached = historyCache.get(id)
        return !cached || Date.now() - cached.timestamp >= CACHE_TTL
      })

      // Primeiro, preencher com dados do cache
      const newMap = new Map<string, OddsHistoryPoint[]>()
      marketIds.forEach(id => {
        const cached = historyCache.get(id)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          newMap.set(id, cached.data)
        }
      })

      if (idsToFetch.length > 0) {
        // Buscar dados que não estão em cache
        const { data, error } = await supabase
          .from('odds_history')
          .select('market_id, odds_yes, odds_no, recorded_at')
          .in('market_id', idsToFetch)
          .order('recorded_at', { ascending: true })

        if (!error && data) {
          // Agrupar por market_id
          const grouped = new Map<string, OddsHistoryPoint[]>()

          data.forEach((point: { market_id: string; odds_yes: number; odds_no: number; recorded_at: string }) => {
            const marketId = point.market_id
            if (!grouped.has(marketId)) {
              grouped.set(marketId, [])
            }
            grouped.get(marketId)!.push({
              odds_yes: Number(point.odds_yes),
              odds_no: Number(point.odds_no),
              recorded_at: point.recorded_at,
            })
          })

          // Atualizar cache e mapa
          grouped.forEach((history, id) => {
            historyCache.set(id, { data: history, timestamp: Date.now() })
            newMap.set(id, history)
          })
        }
      }

      setHistoryMap(newMap)
    }

    fetchAll()
  }, [marketIds.join(',')])

  return historyMap
}

// Função utilitária para extrair dados de sparkline do histórico
export function getSparklineData(history: OddsHistoryPoint[], points: number = 12): number[] {
  if (history.length === 0) return []
  if (history.length <= points) {
    return history.map(h => h.odds_yes * 100)
  }

  // Amostrar pontos uniformemente
  const step = Math.floor(history.length / points)
  const sparkline: number[] = []

  for (let i = 0; i < points; i++) {
    const index = Math.min(i * step, history.length - 1)
    sparkline.push(history[index].odds_yes * 100)
  }

  // Sempre incluir o último ponto
  sparkline[sparkline.length - 1] = history[history.length - 1].odds_yes * 100

  return sparkline
}

// Calcular variação 24h
export function calculate24hChange(history: OddsHistoryPoint[]): number {
  if (history.length < 2) return 0

  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Encontrar ponto mais próximo de 24h atrás
  let point24hAgo = history[0]
  for (const point of history) {
    const pointDate = new Date(point.recorded_at)
    if (pointDate <= yesterday) {
      point24hAgo = point
    } else {
      break
    }
  }

  const currentOdds = history[history.length - 1].odds_yes
  const oldOdds = point24hAgo.odds_yes

  if (oldOdds === 0) return 0

  return ((currentOdds - oldOdds) / oldOdds) * 100
}

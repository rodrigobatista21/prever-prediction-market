'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, ExternalLink, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import type { Market, MarketPosition } from '@/lib/types/database.types'
import { formatBRL } from '@/lib/utils/format'
import { calculateOdds } from '@/lib/utils/cpmm'
import { cn } from '@/lib/utils'

interface PositionWithMarket extends MarketPosition {
  market: Market
  currentOddsYes: number
  currentOddsNo: number
  totalValue: number
  profitLoss: number
  profitLossPercent: number
}

export default function MinhasApostasPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [positions, setPositions] = useState<PositionWithMarket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const subscribed = useRef(false)

  const supabase = createClient()

  const fetchPositions = useCallback(async () => {
    if (!user) {
      setPositions([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // Busca posições com dados do mercado
      const { data, error } = await supabase
        .from('market_positions')
        .select(`
          *,
          market:markets(*)
        `)
        .eq('user_id', user.id)
        .or('shares_yes.gt.0,shares_no.gt.0') // Apenas posições ativas

      if (error) {
        console.error('Error fetching positions:', error)
        return
      }

      // Transforma e calcula métricas
      const positionsWithMetrics: PositionWithMarket[] = (data || [])
        .filter((p: any) => p.market) // Filtra mercados que existem
        .map((p: any) => {
          const market = p.market as Market
          const odds = calculateOdds({
            poolYes: market.pool_yes,
            poolNo: market.pool_no,
          })

          // Calcula valor atual das ações
          const valueYes = p.shares_yes * odds.yes
          const valueNo = p.shares_no * odds.no
          const totalValue = valueYes + valueNo

          // Calcula custo total
          const costYes = p.shares_yes * p.avg_cost_yes
          const costNo = p.shares_no * p.avg_cost_no
          const totalCost = costYes + costNo

          // Calcula lucro/prejuízo
          const profitLoss = totalValue - totalCost
          const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0

          return {
            ...p,
            market,
            currentOddsYes: odds.yes * 100,
            currentOddsNo: odds.no * 100,
            totalValue,
            profitLoss,
            profitLossPercent,
          }
        })
        .sort((a, b) => b.totalValue - a.totalValue) // Ordena por valor

      setPositions(positionsWithMetrics)
    } catch (err) {
      console.error('Unexpected error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  // Realtime subscription
  useEffect(() => {
    if (!user) return
    if (subscribed.current) return
    subscribed.current = true

    const channel = supabase
      .channel(`positions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_positions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchPositions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'markets',
        },
        () => {
          fetchPositions()
        }
      )
      .subscribe()

    return () => {
      subscribed.current = false
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchPositions])

  if (authLoading) {
    return <PositionsSkeleton />
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Faça login para ver suas posições</p>
        <Button asChild>
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    )
  }

  // Calcula totais
  const totalValue = positions.reduce((sum, p) => sum + p.totalValue, 0)
  const totalProfitLoss = positions.reduce((sum, p) => sum + p.profitLoss, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Minhas Posições</h1>
        {positions.length > 0 && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold">{formatBRL(totalValue)}</p>
            <p
              className={cn(
                'text-sm font-medium',
                totalProfitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'
              )}
            >
              {totalProfitLoss >= 0 ? '+' : ''}
              {formatBRL(totalProfitLoss)}
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <PositionsSkeleton />
      ) : positions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Você ainda não tem posições</p>
            <p className="text-sm text-muted-foreground mb-4">
              Explore as teses e faça sua primeira operação
            </p>
            <Button asChild>
              <Link href="/">Ver Teses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {positions.map((position) => (
            <PositionCard key={position.id} position={position} />
          ))}
        </div>
      )}
    </div>
  )
}

function PositionCard({ position }: { position: PositionWithMarket }) {
  const { market } = position
  const isResolved = market.outcome !== null
  const hasYes = position.shares_yes > 0
  const hasNo = position.shares_no > 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/mercado/${market.id}`}
              className="font-semibold hover:text-primary transition-colors line-clamp-2 flex items-center gap-2"
            >
              {market.title}
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </Link>

            <div className="flex flex-wrap gap-2 mt-2">
              {isResolved ? (
                <Badge variant="secondary">
                  Resolvido: {market.outcome ? 'SIM' : 'NÃO'}
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">
                    SIM {position.currentOddsYes.toFixed(0)}%
                  </Badge>
                  <Badge variant="outline" className="text-rose-500 border-rose-500/50">
                    NÃO {position.currentOddsNo.toFixed(0)}%
                  </Badge>
                </>
              )}
            </div>

            {/* Posições */}
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {hasYes && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>
                    <span className="font-medium">{position.shares_yes.toFixed(2)}</span>
                    <span className="text-muted-foreground"> ações SIM</span>
                  </span>
                  <span className="text-muted-foreground">
                    (custo médio: {formatBRL(position.avg_cost_yes)})
                  </span>
                </div>
              )}
              {hasNo && (
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <span>
                    <span className="font-medium">{position.shares_no.toFixed(2)}</span>
                    <span className="text-muted-foreground"> ações NÃO</span>
                  </span>
                  <span className="text-muted-foreground">
                    (custo médio: {formatBRL(position.avg_cost_no)})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Valor e P&L */}
          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-lg">{formatBRL(position.totalValue)}</p>
            <p
              className={cn(
                'text-sm font-medium flex items-center justify-end gap-1',
                position.profitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'
              )}
            >
              {position.profitLoss >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {position.profitLoss >= 0 ? '+' : ''}
              {formatBRL(position.profitLoss)}
              <span className="text-xs">
                ({position.profitLossPercent >= 0 ? '+' : ''}
                {position.profitLossPercent.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PositionsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <div className="flex gap-2 mb-3">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-6 w-20 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

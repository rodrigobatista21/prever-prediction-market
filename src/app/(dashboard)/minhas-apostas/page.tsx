'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, ExternalLink, BarChart3, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/hooks'
import { useUserPositions, useUserOrders, useCancelOrder } from '@/lib/hooks/use-orderbook'
import { createClient } from '@/lib/supabase/client'
import type { Market, MarketPosition } from '@/lib/types/database.types'
import { formatBRL } from '@/lib/utils/format'
import { formatPrice } from '@/lib/utils/orderbook'
import { calculateOdds } from '@/lib/utils/cpmm'
import { cn } from '@/lib/utils'

// Tipo para posições do Order Book (user_shares)
interface OrderBookPosition {
  market_id: string
  market_title: string
  market_status: string
  outcome: boolean
  quantity: number
  avg_cost: number | null
  current_value: number
  unrealized_pnl: number
}

// Tipo para posições legadas (market_positions)
interface LegacyPositionWithMarket extends MarketPosition {
  market: Market
  currentOddsYes: number
  currentOddsNo: number
  totalValue: number
  profitLoss: number
  profitLossPercent: number
}

export default function MinhasApostasPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [legacyPositions, setLegacyPositions] = useState<LegacyPositionWithMarket[]>([])
  const [isLoadingLegacy, setIsLoadingLegacy] = useState(true)
  const subscribed = useRef(false)

  // Hooks do Order Book
  const { positions: orderBookPositions, isLoading: isLoadingOrderBook, refresh: refreshPositions } = useUserPositions()
  const { orders: openOrders, isLoading: isLoadingOrders, refresh: refreshOrders } = useUserOrders()
  const { cancelOrder, isLoading: isCancelling } = useCancelOrder()

  const supabase = createClient()

  // Buscar posições legadas (CPMM)
  const fetchLegacyPositions = useCallback(async () => {
    if (!user) {
      setLegacyPositions([])
      setIsLoadingLegacy(false)
      return
    }

    try {
      setIsLoadingLegacy(true)

      const { data, error } = await supabase
        .from('market_positions')
        .select(`
          *,
          market:markets(*)
        `)
        .eq('user_id', user.id)
        .or('shares_yes.gt.0,shares_no.gt.0')

      if (error) {
        return
      }

      const positionsWithMetrics: LegacyPositionWithMarket[] = (data || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((p: any) => p.market)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => {
          const market = p.market as Market
          const odds = calculateOdds({
            poolYes: market.pool_yes,
            poolNo: market.pool_no,
          })

          const valueYes = p.shares_yes * odds.yes
          const valueNo = p.shares_no * odds.no
          const totalValue = valueYes + valueNo

          const costYes = p.shares_yes * p.avg_cost_yes
          const costNo = p.shares_no * p.avg_cost_no
          const totalCost = costYes + costNo

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
        .sort((a, b) => b.totalValue - a.totalValue)

      setLegacyPositions(positionsWithMetrics)
    } catch {
      // Silently handle error
    } finally {
      setIsLoadingLegacy(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchLegacyPositions()
  }, [fetchLegacyPositions])

  // Realtime subscription para posições legadas
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
          fetchLegacyPositions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_shares',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshPositions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshOrders()
        }
      )
      .subscribe()

    return () => {
      subscribed.current = false
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchLegacyPositions, refreshPositions, refreshOrders])

  const handleCancelOrder = async (orderId: string) => {
    const success = await cancelOrder(orderId)
    if (success) {
      refreshOrders()
    }
  }

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

  const isLoading = isLoadingLegacy || isLoadingOrderBook || isLoadingOrders

  // Calcula totais das posições do Order Book
  const orderBookTotalValue = orderBookPositions.reduce((sum, p) => sum + p.current_value, 0)
  const orderBookTotalPnL = orderBookPositions.reduce((sum, p) => sum + p.unrealized_pnl, 0)

  // Calcula totais das posições legadas
  const legacyTotalValue = legacyPositions.reduce((sum, p) => sum + p.totalValue, 0)
  const legacyTotalPnL = legacyPositions.reduce((sum, p) => sum + p.profitLoss, 0)

  // Total geral
  const totalValue = orderBookTotalValue + legacyTotalValue
  const totalPnL = orderBookTotalPnL + legacyTotalPnL

  const hasPositions = orderBookPositions.length > 0 || legacyPositions.length > 0
  const hasOrders = openOrders.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Minhas Posições</h1>
        {hasPositions && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold">{formatBRL(totalValue)}</p>
            <p
              className={cn(
                'text-sm font-medium',
                totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
              )}
            >
              {totalPnL >= 0 ? '+' : ''}
              {formatBRL(totalPnL)}
            </p>
          </div>
        )}
      </div>

      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="positions">
            Posições ({orderBookPositions.length + legacyPositions.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            Ordens Abertas ({openOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-4">
          {isLoading ? (
            <PositionsSkeleton />
          ) : !hasPositions ? (
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
              {/* Posições do Order Book */}
              {orderBookPositions.map((position, index) => (
                <OrderBookPositionCard key={`ob-${index}`} position={position} />
              ))}

              {/* Posições Legadas (CPMM) */}
              {legacyPositions.map((position) => (
                <LegacyPositionCard key={position.id} position={position} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {isLoadingOrders ? (
            <PositionsSkeleton />
          ) : !hasOrders ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Nenhuma ordem aberta</p>
                <p className="text-sm text-muted-foreground">
                  Suas ordens limit pendentes aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {openOrders.map((order) => (
                <OpenOrderCard
                  key={order.id}
                  order={order}
                  onCancel={handleCancelOrder}
                  isCancelling={isCancelling}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OrderBookPositionCard({ position }: { position: OrderBookPosition }) {
  const isResolved = position.market_status !== 'open'
  const isWon = position.market_status === 'won'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/mercado/${position.market_id}`}
              className="font-semibold hover:text-primary transition-colors line-clamp-2 flex items-center gap-2"
            >
              {position.market_title}
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </Link>

            <div className="flex flex-wrap gap-2 mt-2">
              {isResolved ? (
                <Badge variant={isWon ? 'default' : 'secondary'}>
                  {isWon ? 'Venceu' : 'Perdeu'}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    position.outcome
                      ? 'text-emerald-500 border-emerald-500/50'
                      : 'text-rose-500 border-rose-500/50'
                  )}
                >
                  {position.outcome ? 'SIM' : 'NÃO'}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <div className="flex items-center gap-2">
                {position.outcome ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <span>
                  <span className="font-medium">{position.quantity.toFixed(2)}</span>
                  <span className="text-muted-foreground">
                    {' '}ações {position.outcome ? 'SIM' : 'NÃO'}
                  </span>
                </span>
                {position.avg_cost && (
                  <span className="text-muted-foreground">
                    (custo médio: {formatBRL(position.avg_cost)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-lg">{formatBRL(position.current_value)}</p>
            <p
              className={cn(
                'text-sm font-medium flex items-center justify-end gap-1',
                position.unrealized_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
              )}
            >
              {position.unrealized_pnl >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {position.unrealized_pnl >= 0 ? '+' : ''}
              {formatBRL(position.unrealized_pnl)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LegacyPositionCard({ position }: { position: LegacyPositionWithMarket }) {
  const { market } = position
  const isResolved = market.outcome !== null
  const hasYes = position.shares_yes > 0
  const hasNo = position.shares_no > 0

  return (
    <Card className="hover:shadow-md transition-shadow border-dashed">
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
              <Badge variant="outline" className="text-xs">Legado</Badge>
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

function OpenOrderCard({
  order,
  onCancel,
  isCancelling
}: {
  order: {
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
  }
  onCancel: (orderId: string) => void
  isCancelling: boolean
}) {
  const remaining = order.quantity - order.filled_quantity
  const isBuy = order.side === 'buy'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/mercado/${order.market_id}`}
              className="font-semibold hover:text-primary transition-colors line-clamp-2 flex items-center gap-2"
            >
              {order.market_title}
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </Link>

            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn(
                  isBuy
                    ? 'text-emerald-500 border-emerald-500/50'
                    : 'text-rose-500 border-rose-500/50'
                )}
              >
                {isBuy ? 'Compra' : 'Venda'}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  order.outcome
                    ? 'text-emerald-500 border-emerald-500/50'
                    : 'text-rose-500 border-rose-500/50'
                )}
              >
                {order.outcome ? 'SIM' : 'NÃO'}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {order.order_type}
              </Badge>
              {order.status === 'partial' && (
                <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                  Parcial
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              <span>Preço: {formatPrice(order.price)}</span>
              <span>Qtd: {remaining.toFixed(0)} / {order.quantity.toFixed(0)}</span>
              <span>Total: {formatBRL(remaining * order.price)}</span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(order.id)}
              disabled={isCancelling}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            >
              Cancelar
            </Button>
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

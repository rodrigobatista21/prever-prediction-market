'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Wallet,
  PieChart,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  Package
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
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
    return <PortfolioSkeleton />
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Acesse sua conta</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Faça login para ver suas posições, acompanhar seus investimentos e gerenciar suas ordens.
        </p>
        <Button asChild size="lg">
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    )
  }

  const isLoading = isLoadingLegacy || isLoadingOrderBook || isLoadingOrders

  // Calcula totais das posições do Order Book
  const orderBookTotalValue = orderBookPositions.reduce((sum, p) => sum + p.current_value, 0)
  const orderBookTotalPnL = orderBookPositions.reduce((sum, p) => sum + p.unrealized_pnl, 0)
  const orderBookTotalCost = orderBookPositions.reduce((sum, p) => sum + (p.avg_cost || 0) * p.quantity, 0)

  // Calcula totais das posições legadas
  const legacyTotalValue = legacyPositions.reduce((sum, p) => sum + p.totalValue, 0)
  const legacyTotalPnL = legacyPositions.reduce((sum, p) => sum + p.profitLoss, 0)
  const legacyTotalCost = legacyPositions.reduce((sum, p) => {
    const costYes = p.shares_yes * p.avg_cost_yes
    const costNo = p.shares_no * p.avg_cost_no
    return sum + costYes + costNo
  }, 0)

  // Total geral
  const totalValue = orderBookTotalValue + legacyTotalValue
  const totalPnL = orderBookTotalPnL + legacyTotalPnL
  const totalInvested = orderBookTotalCost + legacyTotalCost
  const totalROI = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  const hasPositions = orderBookPositions.length > 0 || legacyPositions.length > 0
  const hasOrders = openOrders.length > 0
  const totalPositions = orderBookPositions.length + legacyPositions.length

  // Contagem de posições por tipo
  const yesPositions = orderBookPositions.filter(p => p.outcome).length +
    legacyPositions.filter(p => p.shares_yes > 0).length
  const noPositions = orderBookPositions.filter(p => !p.outcome).length +
    legacyPositions.filter(p => p.shares_no > 0).length

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Portfólio</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas posições e ordens
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Explorar Mercados
          </Link>
        </Button>
      </div>

      {/* Portfolio Summary Cards */}
      {!isLoading && hasPositions && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Valor Total */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Valor Total</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{formatBRL(totalValue)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {totalPositions} {totalPositions === 1 ? 'posição' : 'posições'}
              </p>
            </CardContent>
          </Card>

          {/* Lucro/Prejuízo */}
          <Card className={cn(
            "border",
            totalPnL >= 0
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-rose-500/5 border-rose-500/20"
          )}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                {totalPnL >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <span className="text-xs sm:text-sm font-medium">Lucro/Prejuízo</span>
              </div>
              <p className={cn(
                "text-xl sm:text-2xl lg:text-3xl font-bold",
                totalPnL >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {totalPnL >= 0 ? '+' : ''}{formatBRL(totalPnL)}
              </p>
              <p className={cn(
                "text-xs sm:text-sm mt-1",
                totalPnL >= 0 ? "text-emerald-500/80" : "text-rose-500/80"
              )}>
                {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}% ROI
              </p>
            </CardContent>
          </Card>

          {/* Investido */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <PieChart className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Investido</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{formatBRL(totalInvested)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Custo total das posições
              </p>
            </CardContent>
          </Card>

          {/* Distribuição SIM/NÃO */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Distribuição</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-500 font-medium">SIM</span>
                    <span className="text-rose-500 font-medium">NÃO</span>
                  </div>
                  <Progress
                    value={totalPositions > 0 ? (yesPositions / totalPositions) * 100 : 50}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{yesPositions}</span>
                    <span>{noPositions}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            <span>Posições</span>
            {totalPositions > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {totalPositions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Ordens</span>
            {openOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {openOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-6">
          {isLoading ? (
            <PositionsSkeleton />
          ) : !hasPositions ? (
            <EmptyState
              icon={<PieChart className="w-12 h-12" />}
              title="Nenhuma posição ainda"
              description="Explore os mercados e faça sua primeira operação para começar a construir seu portfólio."
              actionLabel="Ver Mercados"
              actionHref="/"
            />
          ) : (
            <div className="space-y-3">
              {/* Posições do Order Book */}
              {orderBookPositions.map((position, index) => (
                <PositionCard key={`ob-${index}`} position={position} />
              ))}

              {/* Posições Legadas (CPMM) */}
              {legacyPositions.map((position) => (
                <LegacyPositionCard key={position.id} position={position} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          {isLoadingOrders ? (
            <PositionsSkeleton />
          ) : !hasOrders ? (
            <EmptyState
              icon={<Package className="w-12 h-12" />}
              title="Nenhuma ordem aberta"
              description="Suas ordens limit pendentes de execução aparecerão aqui."
              actionLabel="Ver Mercados"
              actionHref="/"
            />
          ) : (
            <div className="space-y-3">
              {openOrders.map((order) => (
                <OrderCard
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

// Componente de estado vazio reutilizável
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref
}: {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel: string
  actionHref: string
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// Card de Posição (Order Book) - Design Limpo
function PositionCard({ position }: { position: OrderBookPosition }) {
  const isYes = position.outcome
  const isResolved = position.market_status !== 'open'
  const pnlPercent = position.avg_cost && position.avg_cost > 0
    ? (position.unrealized_pnl / (position.avg_cost * position.quantity)) * 100
    : 0

  return (
    <Link href={`/mercado/${position.market_id}`}>
      <Card className="group hover:shadow-lg dark:hover:shadow-none hover:border-primary/50 transition-all cursor-pointer">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            {/* Indicador de Posição */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              isYes
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
            )}>
              {isYes ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {position.market_title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-semibold",
                        isYes
                          ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
                          : "border-rose-500/50 text-rose-500 bg-rose-500/10"
                      )}
                    >
                      {isYes ? 'SIM' : 'NÃO'}
                    </Badge>
                    {isResolved && (
                      <Badge variant="secondary">
                        {position.market_status === 'won' ? 'Venceu' : 'Perdeu'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Seta de navegação */}
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ações</p>
                  <p className="font-semibold">{position.quantity.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valor Atual</p>
                  <p className="font-semibold">{formatBRL(position.current_value)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Retorno</p>
                  <p className={cn(
                    "font-semibold flex items-center justify-end gap-1",
                    position.unrealized_pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {position.unrealized_pnl >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {position.unrealized_pnl >= 0 ? '+' : ''}{formatBRL(position.unrealized_pnl)}
                    <span className="text-xs opacity-80">
                      ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Card de Posição Legada (CPMM)
function LegacyPositionCard({ position }: { position: LegacyPositionWithMarket }) {
  const { market } = position
  const isResolved = market.outcome !== null
  const hasYes = position.shares_yes > 0
  const hasNo = position.shares_no > 0

  // Se tem ambas as posições, exibe como duas linhas
  const positions = []
  if (hasYes) {
    positions.push({
      isYes: true,
      shares: position.shares_yes,
      avgCost: position.avg_cost_yes,
      currentOdds: position.currentOddsYes,
      value: position.shares_yes * (position.currentOddsYes / 100),
    })
  }
  if (hasNo) {
    positions.push({
      isYes: false,
      shares: position.shares_no,
      avgCost: position.avg_cost_no,
      currentOdds: position.currentOddsNo,
      value: position.shares_no * (position.currentOddsNo / 100),
    })
  }

  return (
    <Link href={`/mercado/${market.id}`}>
      <Card className="group hover:shadow-lg dark:hover:shadow-none hover:border-primary/50 transition-all cursor-pointer border-dashed">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            {/* Indicador - usa a posição principal */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              hasYes && !hasNo
                ? "bg-emerald-500/10 text-emerald-500"
                : hasNo && !hasYes
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-primary/10 text-primary"
            )}>
              {hasYes && !hasNo ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : hasNo && !hasYes ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <PieChart className="w-6 h-6" />
              )}
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {market.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {isResolved ? (
                      <Badge variant="secondary">
                        Resolvido: {market.outcome ? 'SIM' : 'NÃO'}
                      </Badge>
                    ) : (
                      <>
                        {hasYes && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/50 text-emerald-500 bg-emerald-500/10 font-semibold"
                          >
                            SIM @ {position.currentOddsYes.toFixed(0)}%
                          </Badge>
                        )}
                        {hasNo && (
                          <Badge
                            variant="outline"
                            className="border-rose-500/50 text-rose-500 bg-rose-500/10 font-semibold"
                          >
                            NÃO @ {position.currentOddsNo.toFixed(0)}%
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </div>

              {/* Métricas por posição */}
              <div className="mt-4 pt-4 border-t space-y-3">
                {positions.map((pos, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Ações {pos.isYes ? 'SIM' : 'NÃO'}
                      </p>
                      <p className="font-semibold">{pos.shares.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Custo Médio</p>
                      <p className="font-semibold">{formatBRL(pos.avgCost)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Valor Atual</p>
                      <p className="font-semibold">{formatBRL(pos.value)}</p>
                    </div>
                  </div>
                ))}

                {/* Total do card */}
                <div className="flex items-center justify-between pt-2 border-t border-dashed">
                  <span className="text-sm text-muted-foreground">Retorno Total</span>
                  <span className={cn(
                    "font-semibold flex items-center gap-1",
                    position.profitLoss >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {position.profitLoss >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {position.profitLoss >= 0 ? '+' : ''}{formatBRL(position.profitLoss)}
                    <span className="text-xs opacity-80">
                      ({position.profitLossPercent >= 0 ? '+' : ''}{position.profitLossPercent.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Card de Ordem Aberta
function OrderCard({
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
  const isYes = order.outcome
  const progress = (order.filled_quantity / order.quantity) * 100

  return (
    <Card className="hover:shadow-lg dark:hover:shadow-none hover:border-primary/50 transition-all">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          {/* Indicador de Ordem */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            isBuy
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-rose-500/10 text-rose-500"
          )}>
            {isBuy ? (
              <TrendingUp className="w-6 h-6" />
            ) : (
              <TrendingDown className="w-6 h-6" />
            )}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/mercado/${order.market_id}`}
                  className="font-semibold line-clamp-2 hover:text-primary transition-colors"
                >
                  {order.market_title}
                </Link>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold",
                      isBuy
                        ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
                        : "border-rose-500/50 text-rose-500 bg-rose-500/10"
                    )}
                  >
                    {isBuy ? 'Comprar' : 'Vender'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold",
                      isYes
                        ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
                        : "border-rose-500/50 text-rose-500 bg-rose-500/10"
                    )}
                  >
                    {isYes ? 'SIM' : 'NÃO'}
                  </Badge>
                  {order.status === 'partial' && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10">
                      Parcial
                    </Badge>
                  )}
                </div>
              </div>

              {/* Botão Cancelar */}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  onCancel(order.id)
                }}
                disabled={isCancelling}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
              >
                Cancelar
              </Button>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Preço</p>
                <p className="font-semibold">{formatPrice(order.price)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
                <p className="font-semibold">{remaining.toFixed(0)} / {order.quantity.toFixed(0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="font-semibold">{formatBRL(remaining * order.price)}</p>
              </div>
            </div>

            {/* Barra de progresso se parcialmente preenchido */}
            {order.filled_quantity > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton para carregamento do Portfolio
function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-28 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-64" />
      <PositionsSkeleton />
    </div>
  )
}

// Skeleton para lista de posições
function PositionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <div className="flex gap-2 mb-4">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-3 w-12 mb-1 ml-auto" />
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  Trophy,
  Skull,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WinnersTable, LosersTable, PayoutSummaryTable } from './PayoutTable'
import { formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { ResolvedMarketPayment } from '@/lib/hooks/use-admin-payments'

const categoryLabels: Record<string, string> = {
  politica: 'Política',
  economia: 'Economia',
  esportes: 'Esportes',
  entretenimento: 'Entretenimento',
  tecnologia: 'Tecnologia',
  internacional: 'Internacional',
  outros: 'Outros',
}

interface ResolvedMarketCardProps {
  market: ResolvedMarketPayment
}

export function ResolvedMarketCard({ market }: ResolvedMarketCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const marketProfit = market.total_bet - market.total_payout
  const isProfitable = marketProfit >= 0

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {categoryLabels[market.category] || market.category}
              </Badge>
              <Badge
                className={cn(
                  market.outcome
                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
                    : 'bg-rose-500/20 text-rose-500 border-rose-500/50'
                )}
              >
                {market.outcome ? 'SIM Venceu' : 'NÃO Venceu'}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight">{market.title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(market.resolved_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {market.winners_count + market.losers_count} participantes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Apostado</p>
                <p className="font-semibold">{formatBRL(market.total_bet)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Pago</p>
                <p className="font-semibold text-emerald-500">
                  {formatBRL(market.total_payout)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Lucro</p>
                <p
                  className={cn(
                    'font-semibold flex items-center gap-1',
                    isProfitable ? 'text-emerald-500' : 'text-rose-500'
                  )}
                >
                  {isProfitable ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {formatBRL(Math.abs(marketProfit))}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="icon" className="flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="flex md:hidden items-center gap-4 mt-3 pt-3 border-t border-border/50">
          <div className="flex-1 text-center">
            <p className="text-muted-foreground text-xs">Apostado</p>
            <p className="font-semibold text-sm">{formatBRL(market.total_bet)}</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-muted-foreground text-xs">Pago</p>
            <p className="font-semibold text-sm text-emerald-500">
              {formatBRL(market.total_payout)}
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-muted-foreground text-xs">Lucro</p>
            <p
              className={cn(
                'font-semibold text-sm',
                isProfitable ? 'text-emerald-500' : 'text-rose-500'
              )}
            >
              {isProfitable ? '+' : '-'}
              {formatBRL(Math.abs(marketProfit))}
            </p>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t border-border/50 pt-4">
          {/* Summary */}
          <PayoutSummaryTable
            winners={market.winners}
            losers={market.losers}
            outcome={market.outcome}
          />

          {/* Pools Info */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-xs text-emerald-500 mb-1">Pool SIM (Final)</p>
              <p className="font-bold">{formatBRL(market.pool_yes)}</p>
            </div>
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <p className="text-xs text-rose-500 mb-1">Pool NÃO (Final)</p>
              <p className="font-bold">{formatBRL(market.pool_no)}</p>
            </div>
          </div>

          {/* Winners/Losers Tabs */}
          <Tabs defaultValue="winners" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="winners" className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-500" />
                Vencedores ({market.winners_count})
              </TabsTrigger>
              <TabsTrigger value="losers" className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-rose-500" />
                Perdedores ({market.losers_count})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="winners" className="mt-4">
              <WinnersTable winners={market.winners} />
            </TabsContent>
            <TabsContent value="losers" className="mt-4">
              <LosersTable losers={market.losers} />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}

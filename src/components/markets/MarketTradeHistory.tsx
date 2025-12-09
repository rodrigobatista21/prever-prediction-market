'use client'

import { Activity, TrendingUp, TrendingDown, User, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMarketTrades, type MarketTrade } from '@/lib/hooks/use-market-trades'
import { formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface MarketTradeHistoryProps {
  marketId: string
  className?: string
}

export function MarketTradeHistory({ marketId, className }: MarketTradeHistoryProps) {
  const { trades, isLoading } = useMarketTrades(marketId)

  if (isLoading) {
    return (
      <Card className={cn('border-border/50', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Carregando...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (trades.length === 0) {
    return (
      <Card className={cn('border-border/50', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-6">
            Nenhuma operação ainda. Seja o primeiro!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Atividade Recente
          <span className="text-xs font-normal text-muted-foreground">
            ({trades.length} operações)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {trades.slice(0, 10).map((trade) => (
          <TradeItem key={trade.id} trade={trade} />
        ))}

        {trades.length > 10 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            +{trades.length - 10} operações anteriores
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function TradeItem({ trade }: { trade: MarketTrade }) {
  const timeAgo = getRelativeTime(trade.createdAt)
  const isYes = trade.outcome === 'yes'

  // Anonymize user name for privacy
  const displayName = trade.userName
    ? anonymizeName(trade.userName)
    : 'Usuário'

  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar/Icon */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isYes ? 'bg-emerald-500/10' : 'bg-rose-500/10'
      )}>
        {isYes ? (
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-rose-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-medium truncate">{displayName}</span>
          <span className="text-muted-foreground">comprou</span>
          <span className="font-semibold">{formatBRL(trade.amount)}</span>
          <span className="text-muted-foreground">em</span>
          <span className={cn(
            'font-bold',
            isYes ? 'text-emerald-500' : 'text-rose-500'
          )}>
            {isYes ? 'SIM' : 'NÃO'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          {trade.shares && (
            <>
              <span>•</span>
              <span>{trade.shares.toFixed(2)} ações</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function anonymizeName(name: string): string {
  if (!name || name.length < 2) return 'Usuário'

  const parts = name.split(' ')
  if (parts.length === 1) {
    // Single name: "Rodrigo" -> "Rod..."
    return name.slice(0, 3) + '...'
  }

  // Multiple names: "Rodrigo Silva" -> "Rodrigo S."
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1][0]
  return `${firstName} ${lastInitial}.`
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'agora mesmo'
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} min`
  } else if (diffHours < 24) {
    return `há ${diffHours}h`
  } else if (diffDays === 1) {
    return 'ontem'
  } else if (diffDays < 7) {
    return `há ${diffDays} dias`
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
}

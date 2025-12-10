'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useMarkets } from '@/lib/hooks'
import { useAdmin } from '@/lib/hooks/use-admin'
import { formatBRL, formatRelativeDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MarketWithOdds } from '@/lib/types/database.types'

interface AdminMarketListProps {
  onResolved?: () => void
}

export function AdminMarketList({ onResolved }: AdminMarketListProps) {
  const { markets, isLoading: marketsLoading, refetch } = useMarkets()
  const { resolveMarket, isLoading: resolving } = useAdmin()

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    market: MarketWithOdds | null
    outcome: boolean | null
  }>({ open: false, market: null, outcome: null })

  // Filter only open markets (outcome === null)
  const openMarkets = markets.filter((m) => m.outcome === null)
  const resolvedMarkets = markets.filter((m) => m.outcome !== null)

  const handleResolveClick = (market: MarketWithOdds, outcome: boolean) => {
    setConfirmDialog({ open: true, market, outcome })
  }

  const handleConfirmResolve = async () => {
    if (!confirmDialog.market || confirmDialog.outcome === null) return

    const result = await resolveMarket(confirmDialog.market.id, confirmDialog.outcome)

    if (result?.success) {
      toast.success(
        <div>
          <p className="font-semibold">Mercado resolvido!</p>
          <p className="text-sm">
            Vencedor: {result.winning_outcome ? 'SIM' : 'NÃO'}
          </p>
          <p className="text-sm">
            Pagamentos: {result.winners_count} vencedores receberam {formatBRL(result.total_payout)}
          </p>
        </div>
      )
      refetch()
      onResolved?.()
    } else {
      toast.error('Erro ao resolver mercado')
    }

    setConfirmDialog({ open: false, market: null, outcome: null })
  }

  if (marketsLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando mercados...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Mercados Abertos ({openMarkets.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {openMarkets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum mercado aberto. Crie um novo mercado acima.
            </p>
          ) : (
            openMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onResolve={handleResolveClick}
                isResolving={resolving}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Resolved Markets */}
      {resolvedMarkets.length > 0 && (
        <Card className="border-border/50 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5" />
              Mercados Resolvidos ({resolvedMarkets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resolvedMarkets.slice(0, 5).map((market) => (
              <div
                key={market.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div>
                  <p className="font-medium text-sm">{market.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Resolvido em {market.resolved_at ? new Date(market.resolved_at).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <Badge
                  className={cn(
                    market.outcome
                      ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
                      : 'bg-rose-500/20 text-rose-500 border-rose-500/50'
                  )}
                >
                  {market.outcome ? 'SIM venceu' : 'NÃO venceu'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, market: null, outcome: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Resolução
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-muted-foreground text-sm">
                <p>
                  Você está prestes a resolver o mercado:
                </p>
                <p className="font-semibold text-foreground">
                  &quot;{confirmDialog.market?.title}&quot;
                </p>
                <p>
                  Resultado:{' '}
                  <span
                    className={cn(
                      'font-bold',
                      confirmDialog.outcome ? 'text-emerald-500' : 'text-rose-500'
                    )}
                  >
                    {confirmDialog.outcome ? 'SIM' : 'NÃO'} VENCEU
                  </span>
                </p>
                <p className="text-amber-500 text-sm">
                  Esta ação é IRREVERSÍVEL! Todos os apostadores vencedores receberão
                  automaticamente seus pagamentos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResolve}
              className={cn(
                confirmDialog.outcome
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-rose-500 hover:bg-rose-600'
              )}
            >
              {resolving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirmar {confirmDialog.outcome ? 'SIM' : 'NÃO'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface MarketCardProps {
  market: MarketWithOdds
  onResolve: (market: MarketWithOdds, outcome: boolean) => void
  isResolving: boolean
}

function MarketCard({ market, onResolve, isResolving }: MarketCardProps) {
  const isExpired = new Date(market.ends_at) < new Date()

  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold">{market.title}</h3>
          {market.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {market.description}
            </p>
          )}
        </div>
        {isExpired && (
          <Badge variant="destructive" className="flex-shrink-0">
            <Clock className="w-3 h-3 mr-1" />
            Expirado
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Odds:</span>
          <span className="text-emerald-500 font-medium">{Math.round(market.odds_yes)}% SIM</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-rose-500 font-medium">{Math.round(market.odds_no)}% NÃO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Liquidez:</span>
          <span className="font-medium">{formatBRL(market.total_liquidity)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {isExpired ? 'Encerrou' : 'Encerra'} {formatRelativeDate(market.ends_at)}
          </span>
        </div>
      </div>

      {/* Pools */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
          <span className="text-emerald-500">Pool SIM:</span>{' '}
          <span className="font-medium">{formatBRL(market.pool_yes)}</span>
        </div>
        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30">
          <span className="text-rose-500">Pool NÃO:</span>{' '}
          <span className="font-medium">{formatBRL(market.pool_no)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => onResolve(market, true)}
          disabled={isResolving}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Resolver SIM
        </Button>
        <Button
          onClick={() => onResolve(market, false)}
          disabled={isResolving}
          className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Resolver NÃO
        </Button>
      </div>
    </div>
  )
}

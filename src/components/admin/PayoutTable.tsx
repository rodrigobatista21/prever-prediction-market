'use client'

import { User, Trophy, Skull } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { PaymentWinner, PaymentLoser } from '@/lib/hooks/use-admin-payments'

interface WinnersTableProps {
  winners: PaymentWinner[] | null
}

export function WinnersTable({ winners }: WinnersTableProps) {
  if (!winners || winners.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Nenhum vencedor neste mercado
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">#</TableHead>
          <TableHead>Usuário</TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="text-right">Pagamento</TableHead>
          <TableHead className="text-right">Lucro por Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {winners.map((winner, index) => (
          <TableRow key={winner.user_id}>
            <TableCell className="font-medium">
              {index === 0 ? (
                <Trophy className="w-4 h-4 text-amber-500" />
              ) : (
                index + 1
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-emerald-500" />
                </div>
                <span className="font-medium">{winner.user_name}</span>
              </div>
            </TableCell>
            <TableCell className="text-right font-mono">
              {winner.shares?.toFixed(2) ?? '-'}
            </TableCell>
            <TableCell className="text-right">
              <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/50">
                +{formatBRL(winner.payout)}
              </Badge>
            </TableCell>
            <TableCell className="text-right text-muted-foreground text-sm">
              {winner.shares && winner.shares > 0
                ? formatBRL(winner.payout / winner.shares)
                : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface LosersTableProps {
  losers: PaymentLoser[] | null
}

export function LosersTable({ losers }: LosersTableProps) {
  if (!losers || losers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Nenhum perdedor neste mercado
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">#</TableHead>
          <TableHead>Usuário</TableHead>
          <TableHead className="text-right">Shares Perdidas</TableHead>
          <TableHead className="text-right">Custo Médio</TableHead>
          <TableHead className="text-right">Prejuízo Est.</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {losers.map((loser, index) => (
          <TableRow key={loser.user_id}>
            <TableCell className="font-medium">
              {index === 0 ? (
                <Skull className="w-4 h-4 text-rose-500" />
              ) : (
                index + 1
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-rose-500" />
                </div>
                <span className="font-medium">{loser.user_name}</span>
              </div>
            </TableCell>
            <TableCell className="text-right font-mono">
              {loser.shares_lost?.toFixed(2) ?? '-'}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {loser.avg_cost ? formatBRL(loser.avg_cost) : '-'}
            </TableCell>
            <TableCell className="text-right">
              <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/50">
                -{formatBRL(loser.shares_lost * (loser.avg_cost || 0))}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface PayoutSummaryTableProps {
  winners: PaymentWinner[] | null
  losers: PaymentLoser[] | null
  outcome: boolean
}

export function PayoutSummaryTable({ winners, losers, outcome }: PayoutSummaryTableProps) {
  const totalPaid = winners?.reduce((sum, w) => sum + w.payout, 0) ?? 0
  const totalShares = winners?.reduce((sum, w) => sum + (w.shares ?? 0), 0) ?? 0
  const totalLost = losers?.reduce((sum, l) => sum + (l.shares_lost * (l.avg_cost || 0)), 0) ?? 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground">Resultado</p>
        <Badge
          className={cn(
            'mt-1',
            outcome
              ? 'bg-emerald-500/20 text-emerald-500'
              : 'bg-rose-500/20 text-rose-500'
          )}
        >
          {outcome ? 'SIM Venceu' : 'NÃO Venceu'}
        </Badge>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Total Pago</p>
        <p className="text-lg font-bold text-emerald-500">{formatBRL(totalPaid)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Shares Vencedoras</p>
        <p className="text-lg font-bold">{totalShares.toFixed(2)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Prejuízo Total</p>
        <p className="text-lg font-bold text-rose-500">{formatBRL(totalLost)}</p>
      </div>
    </div>
  )
}

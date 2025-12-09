'use client'

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Percent,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { PaymentSummary } from '@/lib/hooks/use-admin-payments'

interface PaymentsSummaryCardsProps {
  summary: PaymentSummary | null
  systemProfit: number
  profitMargin: number
}

export function PaymentsSummaryCards({
  summary,
  systemProfit,
  profitMargin,
}: PaymentsSummaryCardsProps) {
  if (!summary) return null

  const cards = [
    {
      title: 'Mercados Resolvidos',
      value: summary.total_markets_resolved.toString(),
      icon: CheckCircle2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Apostado',
      value: formatBRL(summary.total_collected),
      subtitle: 'Entrada de trades',
      icon: Wallet,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Pago',
      value: formatBRL(summary.total_paid),
      subtitle: 'Pagamentos aos vencedores',
      icon: TrendingDown,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
    {
      title: 'Lucro do Sistema',
      value: formatBRL(systemProfit),
      subtitle: `${profitMargin.toFixed(1)}% de margem`,
      icon: systemProfit >= 0 ? TrendingUp : TrendingDown,
      color: systemProfit >= 0 ? 'text-emerald-500' : 'text-rose-500',
      bgColor: systemProfit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
    },
    {
      title: 'Total Depósitos',
      value: formatBRL(summary.total_deposits),
      subtitle: 'Capital injetado',
      icon: CircleDollarSign,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Margem de Lucro',
      value: `${profitMargin.toFixed(1)}%`,
      subtitle: systemProfit >= 0 ? 'Sistema lucrativo' : 'Sistema deficitário',
      icon: Percent,
      color: systemProfit >= 0 ? 'text-emerald-500' : 'text-rose-500',
      bgColor: systemProfit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  {card.title}
                </p>
                <p className={cn('text-lg font-bold', card.color)}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div className={cn('p-2 rounded-lg', card.bgColor)}>
                <card.icon className={cn('w-4 h-4', card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

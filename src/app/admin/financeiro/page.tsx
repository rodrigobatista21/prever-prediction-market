'use client'

import Link from 'next/link'
import { Wallet, Receipt, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminStats } from '@/lib/hooks/use-admin-stats'

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function FinanceiroPage() {
  const { stats, isLoading } = useAdminStats()

  const cards = [
    {
      title: 'Saldo dos Usuários',
      value: formatBRL(stats?.totalUserBalances ?? 0),
      description: 'Disponível para apostas',
      icon: Wallet,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Volume Total',
      value: formatBRL(stats?.totalVolume ?? 0),
      description: `${stats?.tradesThisWeek ?? 0} trades esta semana`,
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Liquidez Total',
      value: formatBRL(stats?.totalLiquidity ?? 0),
      description: 'Em mercados abertos',
      icon: Receipt,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Usuários Ativos',
      value: stats?.activeUsers7d ?? 0,
      description: 'Nos últimos 7 dias',
      icon: Users,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">
          Visão geral das finanças da plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold">
                      {typeof card.value === 'number'
                        ? card.value.toLocaleString('pt-BR')
                        : card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/financeiro/pagamentos">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Relatório de Pagamentos</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ver todos os payouts e mercados resolvidos
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Market Making</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gestão de liquidez (em breve)
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

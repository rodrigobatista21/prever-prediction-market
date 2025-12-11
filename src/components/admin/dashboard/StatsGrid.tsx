'use client'

import { Users, Store, Wallet, TrendingUp, Activity, Clock, DollarSign, BarChart3 } from 'lucide-react'
import { StatCard } from './StatCard'
import type { AdminStats } from '@/lib/hooks/use-admin-stats'

interface StatsGridProps {
  stats: AdminStats | null
  isLoading: boolean
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Users */}
      <StatCard
        title="Total de Usuários"
        value={stats?.totalUsers ?? 0}
        subtitle={`${stats?.newUsersToday ?? 0} novos hoje`}
        icon={Users}
        trend={stats?.newUsersToday ? { value: stats.newUsersToday, label: 'hoje' } : undefined}
        isLoading={isLoading}
      />

      {/* Active Users */}
      <StatCard
        title="Usuários Ativos (24h)"
        value={stats?.activeUsers24h ?? 0}
        subtitle={`${stats?.activeUsers7d ?? 0} na semana`}
        icon={Activity}
        variant="success"
        isLoading={isLoading}
      />

      {/* Markets */}
      <StatCard
        title="Mercados Abertos"
        value={stats?.openMarkets ?? 0}
        subtitle={`${stats?.totalMarkets ?? 0} total, ${stats?.resolvedMarkets ?? 0} resolvidos`}
        icon={Store}
        isLoading={isLoading}
      />

      {/* Pending Resolution */}
      <StatCard
        title="Pendentes de Resolução"
        value={stats?.pendingResolution ?? 0}
        subtitle="Mercados encerrados"
        icon={Clock}
        variant={stats?.pendingResolution && stats.pendingResolution > 0 ? 'warning' : 'default'}
        isLoading={isLoading}
      />

      {/* Volume Today */}
      <StatCard
        title="Volume Hoje"
        value={formatBRL(stats?.volumeToday ?? 0)}
        subtitle={`${stats?.tradesToday ?? 0} trades`}
        icon={TrendingUp}
        variant="success"
        isLoading={isLoading}
      />

      {/* Total Volume */}
      <StatCard
        title="Volume Total"
        value={formatBRL(stats?.totalVolume ?? 0)}
        subtitle={`${stats?.tradesThisWeek ?? 0} trades esta semana`}
        icon={BarChart3}
        isLoading={isLoading}
      />

      {/* Liquidity */}
      <StatCard
        title="Liquidez Total"
        value={formatBRL(stats?.totalLiquidity ?? 0)}
        subtitle="Em mercados abertos"
        icon={DollarSign}
        isLoading={isLoading}
      />

      {/* User Balances */}
      <StatCard
        title="Saldo dos Usuários"
        value={formatBRL(stats?.totalUserBalances ?? 0)}
        subtitle="Disponível em conta"
        icon={Wallet}
        variant={stats?.totalUserBalances && stats.totalUserBalances > 0 ? 'success' : 'default'}
        isLoading={isLoading}
      />
    </div>
  )
}

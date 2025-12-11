'use client'

import { RefreshCw, Plus, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsGrid } from '@/components/admin/dashboard/StatsGrid'
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity'
import { useAdminStats } from '@/lib/hooks/use-admin-stats'
import { useMarkets } from '@/lib/hooks'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminDashboardPage() {
  const { stats, recentActivity, isLoading, refresh } = useAdminStats()
  const { markets } = useMarkets()

  // Get pending resolution markets
  const pendingMarkets = markets
    .filter(m => m.outcome === null && new Date(m.ends_at) < new Date())
    .slice(0, 5)

  // Get recently created markets
  const recentMarkets = markets
    .filter(m => m.outcome === null)
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de mercados de previsão
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button asChild>
            <Link href="/admin/mercados/criar">
              <Plus className="h-4 w-4 mr-2" />
              Criar Mercado
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} isLoading={isLoading} />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Resolution Alert */}
        {pendingMarkets.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5 lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg">Mercados Pendentes de Resolução</CardTitle>
                </div>
                <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                  {pendingMarkets.length} pendente{pendingMarkets.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingMarkets.map((market) => (
                  <Link
                    key={market.id}
                    href={`/mercados/${market.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{market.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Encerrou {formatDistanceToNow(new Date(market.ends_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Resolver
                    </Button>
                  </Link>
                ))}
              </div>
              {stats?.pendingResolution && stats.pendingResolution > 5 && (
                <div className="mt-3 pt-3 border-t">
                  <Link
                    href="/admin/mercados/pendentes"
                    className="text-sm text-amber-500 hover:underline"
                  >
                    Ver todos os {stats.pendingResolution} mercados pendentes →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <RecentActivity activities={recentActivity} isLoading={isLoading} />

        {/* Quick Actions + Recent Markets */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link
                href="/admin/mercados/criar"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Criar Novo Mercado</p>
                  <p className="text-xs text-muted-foreground">Adicionar mercado de previsão</p>
                </div>
              </Link>
              <Link
                href="/admin/mercados/pendentes"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Resolver Mercados</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.pendingResolution || 0} mercados pendentes
                  </p>
                </div>
              </Link>
              <Link
                href="/admin/financeiro/pagamentos"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Relatório de Pagamentos</p>
                  <p className="text-xs text-muted-foreground">Ver payouts e finanças</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Markets */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Mercados Recentes</CardTitle>
                <Link href="/admin/mercados" className="text-xs text-primary hover:underline">
                  Ver todos
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentMarkets.length > 0 ? (
                <div className="space-y-2">
                  {recentMarkets.map((market) => (
                    <Link
                      key={market.id}
                      href={`/mercados/${market.id}`}
                      className="block p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <p className="font-medium text-sm truncate">{market.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {market.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Encerra {formatDistanceToNow(new Date(market.ends_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Nenhum mercado aberto
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

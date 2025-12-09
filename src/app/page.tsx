'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Zap,
  Shield,
  BarChart3,
  Flame,
  Clock,
  Landmark,
  DollarSign,
  Trophy,
  Tv,
  Cpu,
  Globe,
  MoreHorizontal,
  Activity,
  ArrowRight,
  ChevronRight,
  Target,
  LineChart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarketCard } from '@/components/markets/MarketCard'
import { MarketSearch } from '@/components/markets/MarketSearch'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkets } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/utils/format'
import type { MarketCategory } from '@/lib/types/database.types'

// Categorias temáticas
const THEME_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: BarChart3 },
  { id: 'politica', label: 'Política', icon: Landmark },
  { id: 'economia', label: 'Economia', icon: DollarSign },
  { id: 'esportes', label: 'Esportes', icon: Trophy },
  { id: 'entretenimento', label: 'Entretenimento', icon: Tv },
  { id: 'tecnologia', label: 'Tecnologia', icon: Cpu },
  { id: 'internacional', label: 'Internacional', icon: Globe },
  { id: 'outros', label: 'Outros', icon: MoreHorizontal },
] as const

// Filtros especiais
const SPECIAL_FILTERS = [
  { id: 'trending', label: 'Em Alta', icon: Flame },
  { id: 'ending', label: 'Encerrando', icon: Clock },
] as const

type ThemeCategoryId = typeof THEME_CATEGORIES[number]['id']
type SpecialFilterId = typeof SPECIAL_FILTERS[number]['id'] | null

export default function HomePage() {
  const { markets, isLoading, error } = useMarkets()
  const [activeCategory, setActiveCategory] = useState<ThemeCategoryId>('all')
  const [specialFilter, setSpecialFilter] = useState<SpecialFilterId>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate stats
  const totalVolume = markets.reduce((sum, m) => sum + m.total_liquidity, 0)
  const activeMarkets = markets.filter(m => m.outcome === null).length
  const totalTraders = Math.floor(totalVolume / 50) // Estimate

  // Get featured markets (highest volume)
  const featuredMarkets = useMemo(() => {
    return [...markets]
      .filter(m => m.outcome === null)
      .sort((a, b) => b.total_liquidity - a.total_liquidity)
      .slice(0, 2)
  }, [markets])

  // Get trending markets
  const trendingMarkets = useMemo(() => {
    return [...markets]
      .filter(m => m.outcome === null && m.total_liquidity > 1000)
      .sort((a, b) => b.total_liquidity - a.total_liquidity)
      .slice(0, 4)
  }, [markets])

  // Filter markets based on category, special filters, and search query
  const filteredMarkets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    return markets.filter(market => {
      // Filtro de busca por texto
      if (query) {
        const matchesTitle = market.title.toLowerCase().includes(query)
        const matchesDescription = market.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) {
          return false
        }
      }

      // Filtro por categoria temática
      if (activeCategory !== 'all' && market.category !== activeCategory) {
        return false
      }

      // Filtros especiais
      if (specialFilter === 'trending' && market.total_liquidity <= 2000) {
        return false
      }
      if (specialFilter === 'ending') {
        const endsAt = new Date(market.ends_at).getTime()
        const threeDays = 3 * 24 * 60 * 60 * 1000
        if (endsAt - Date.now() >= threeDays) {
          return false
        }
      }

      return true
    })
  }, [markets, searchQuery, activeCategory, specialFilter])

  return (
    <div className="space-y-8">
      {/* Hero Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Mercado ativo</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <StatItem
            icon={<Activity className="w-4 h-4 text-emerald-500" />}
            label="Volume Total"
            value={formatBRL(totalVolume)}
          />
          <div className="w-px h-4 bg-border" />
          <StatItem
            icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
            label="Teses Ativas"
            value={activeMarkets.toString()}
          />
          <div className="w-px h-4 bg-border hidden sm:block" />
          <StatItem
            icon={<Target className="w-4 h-4 text-amber-500" />}
            label="Traders"
            value={totalTraders.toString()}
            className="hidden sm:flex"
          />
        </div>
      </div>

      {/* Featured Section */}
      {!isLoading && featuredMarkets.length > 0 && !searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold">Destaque</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground gap-1">
              <Link href="/">
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {featuredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} variant="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Quick Access - Trending Row */}
      {!isLoading && trendingMarkets.length > 0 && !searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-bold">Mais Negociados</h2>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {trendingMarkets.map((market) => (
              <MarketCard key={market.id} market={market} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* Main Markets Section */}
      <section className="space-y-6">
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <MarketSearch
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1 max-w-lg"
            placeholder="Buscar teses..."
          />

          {/* Special filters */}
          <div className="flex items-center gap-2">
            {SPECIAL_FILTERS.map((filter) => {
              const Icon = filter.icon
              const isActive = specialFilter === filter.id

              return (
                <Button
                  key={filter.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSpecialFilter(isActive ? null : filter.id)}
                  className={cn(
                    'gap-1.5 whitespace-nowrap',
                    isActive && 'bg-emerald-500 hover:bg-emerald-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Header with filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Todas as Teses</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredMarkets.length} {filteredMarkets.length === 1 ? 'tese encontrada' : 'teses encontradas'}
                {searchQuery && (
                  <span className="ml-1">
                    para &quot;{searchQuery}&quot;
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Theme category filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {THEME_CATEGORIES.map((category) => {
              const Icon = category.icon
              const isActive = activeCategory === category.id
              const count = category.id === 'all'
                ? markets.length
                : markets.filter(m => m.category === category.id).length

              return (
                <Button
                  key={category.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'gap-1.5 whitespace-nowrap',
                    isActive && 'bg-emerald-500 hover:bg-emerald-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                  {count > 0 && (
                    <span className={cn(
                      'text-xs',
                      isActive ? 'text-white/70' : 'text-muted-foreground'
                    )}>
                      ({count})
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Market grid */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="py-12 text-center">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : filteredMarkets.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Nenhuma tese encontrada</p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  Limpar busca
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </section>

      {/* How it works - Minimal */}
      <section className="py-8 border-t border-border/50" id="como-funciona">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <h2 className="text-lg font-bold mb-2">Como funciona</h2>
            <p className="text-sm text-muted-foreground">
              Negocie teses com precisão institucional.
            </p>
          </div>
          <div className="md:col-span-3 grid sm:grid-cols-3 gap-4">
            <HowItWorksStep
              icon={<Target className="w-5 h-5" />}
              title="Analise"
              description="Explore teses sobre eventos futuros"
            />
            <HowItWorksStep
              icon={<LineChart className="w-5 h-5" />}
              title="Posicione"
              description="Compre SIM ou NAO pelo preco atual"
            />
            <HowItWorksStep
              icon={<TrendingUp className="w-5 h-5" />}
              title="Realize"
              description="Ganhe R$ 1,00 por contrato correto"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function StatItem({
  icon,
  label,
  value,
  className
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {icon}
      <div className="flex items-baseline gap-1.5">
        <span className="font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
      </div>
    </div>
  )
}

function HowItWorksStep({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function MarketCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50">
      <Skeleton className="h-32 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <div className="flex justify-between pt-2 border-t border-border/50">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </Card>
  )
}

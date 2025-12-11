'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  BarChart3,
  Landmark,
  DollarSign,
  Cpu,
  Globe,
  Activity,
  ArrowRight,
  ChevronRight,
  Target,
  LineChart,
  Zap,
  Flame
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MarketCard } from '@/components/markets/MarketCard'
import { MarketSearch } from '@/components/markets/MarketSearch'
import { HeroMarket } from '@/components/markets/HeroMarket'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkets, useMultipleOddsHistory, getSparklineData, calculate24hChange } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/utils/format'

// Categorias temáticas profissionais
const THEME_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: BarChart3 },
  { id: 'macroeconomia', label: 'Macro', icon: TrendingUp },
  { id: 'politica_monetaria', label: 'Pol. Monetária', icon: DollarSign },
  { id: 'politica_fiscal', label: 'Pol. Fiscal', icon: Landmark },
  { id: 'politica', label: 'Eleições', icon: Landmark },
  { id: 'cripto', label: 'Cripto', icon: Cpu },
  { id: 'tecnologia', label: 'Tech', icon: Cpu },
  { id: 'geopolitica', label: 'Geopolítica', icon: Globe },
] as const

// Opções de ordenação profissional
const SORT_OPTIONS = [
  { id: 'volume', label: 'Maior Volume' },
  { id: 'return', label: 'Maior Retorno' },
  { id: 'probable', label: 'Mais Prováveis' },
  { id: 'ending', label: 'Encerrando' },
  { id: 'recent', label: 'Recentes' },
] as const

type ThemeCategoryId = typeof THEME_CATEGORIES[number]['id']
type SortOptionId = typeof SORT_OPTIONS[number]['id']

export default function HomePage() {
  const { markets, isLoading, error } = useMarkets()
  const [activeCategory, setActiveCategory] = useState<ThemeCategoryId>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOptionId>('volume')
  const [now, setNow] = useState(() => Date.now())

  // Update timestamp periodically for time-based filters
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Fetch odds history for all markets
  const marketIds = useMemo(() => markets.map(m => m.id), [markets])
  const oddsHistoryMap = useMultipleOddsHistory(marketIds)

  // Helper to get sparkline data for a market
  const getMarketSparkline = (marketId: string) => {
    const history = oddsHistoryMap.get(marketId)
    if (!history || history.length === 0) return undefined
    return getSparklineData(history, 12)
  }

  // Helper to get 24h change for a market
  const getMarketChange24h = (marketId: string) => {
    const history = oddsHistoryMap.get(marketId)
    if (!history || history.length === 0) return undefined
    return calculate24hChange(history)
  }

  // Calculate stats
  const totalVolume = markets.reduce((sum, m) => sum + m.total_liquidity, 0)
  const activeMarkets = markets.filter(m => m.outcome === null).length
  const totalTraders = Math.floor(totalVolume / 50) // Estimate

  // Get hero market (highest volume single market)
  const heroMarket = useMemo(() => {
    const sorted = [...markets]
      .filter(m => m.outcome === null)
      .sort((a, b) => b.total_liquidity - a.total_liquidity)
    return sorted[0] || null
  }, [markets])

  // Get featured markets (2nd and 3rd highest volume, excluding hero)
  const featuredMarkets = useMemo(() => {
    return [...markets]
      .filter(m => m.outcome === null && m.id !== heroMarket?.id)
      .sort((a, b) => b.total_liquidity - a.total_liquidity)
      .slice(0, 2)
  }, [markets, heroMarket])

  // Get trending markets (excluding hero and featured)
  const trendingMarkets = useMemo(() => {
    const excludeIds = new Set([heroMarket?.id, ...featuredMarkets.map(m => m.id)])
    return [...markets]
      .filter(m => m.outcome === null && !excludeIds.has(m.id) && m.total_liquidity > 500)
      .sort((a, b) => b.total_liquidity - a.total_liquidity)
      .slice(0, 4)
  }, [markets, heroMarket, featuredMarkets])

  // Simulated recent trades count - using state to avoid hydration mismatch
  const [recentTradesCount, setRecentTradesCount] = useState(0)
  useEffect(() => {
    // Set random count only on client to avoid SSR/client mismatch
    setRecentTradesCount(Math.floor(Math.random() * 20) + 5)
  }, [])

  // Filter and sort markets based on category, search query, and sort option
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const filteredMarkets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    const filtered = markets.filter(market => {
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

      return true
    })

    // Aplicar ordenação
    const sorted = [...filtered]
    switch (sortBy) {
      case 'volume':
        sorted.sort((a, b) => b.total_liquidity - a.total_liquidity)
        break
      case 'return':
        // Menor preço = maior retorno potencial
        sorted.sort((a, b) => {
          const minA = Math.min(a.odds_yes, a.odds_no)
          const minB = Math.min(b.odds_yes, b.odds_no)
          return minA - minB
        })
        break
      case 'probable':
        // Maior probabilidade SIM primeiro
        sorted.sort((a, b) => b.odds_yes - a.odds_yes)
        break
      case 'ending':
        // Mais próximo de encerrar primeiro
        sorted.sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())
        break
      case 'recent':
        sorted.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        break
    }

    return sorted
  }, [markets, searchQuery, activeCategory, sortBy])

  return (
    <div className="space-y-8">
      {/* Hero Market Section */}
      {!isLoading && heroMarket ? (
        <section className="pt-4">
          <HeroMarket
            market={heroMarket}
            sparklineData={getMarketSparkline(heroMarket.id)}
            change24h={getMarketChange24h(heroMarket.id)}
            recentTrades={recentTradesCount}
          />
        </section>
      ) : isLoading ? (
        <section className="pt-4">
          <HeroMarketSkeleton />
        </section>
      ) : (
        /* Fallback Hero if no markets */
        <section className="py-8 md:py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Dados, nao apostas.{' '}
              <span className="text-emerald-500">Teses.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl">
              Plataforma profissional de analise preditiva para politica, economia e mercados.
              Negocie teses com precisao institucional.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 gap-2" asChild>
                <Link href="#todas-teses">
                  Explorar Teses
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#como-funciona">
                  Como funciona
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Stats Bar - With Live Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <span className="text-sm font-medium text-emerald-500">Ao Vivo</span>
          </div>
          {recentTradesCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium text-foreground">{recentTradesCount}</span>
              <span className="hidden sm:inline">trades/hora</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <StatItem
            icon={<Activity className="w-4 h-4 text-muted-foreground" />}
            label="Volume"
            value={formatBRL(totalVolume)}
          />
          <div className="w-px h-4 bg-border" />
          <StatItem
            icon={<BarChart3 className="w-4 h-4 text-muted-foreground" />}
            label="Teses"
            value={activeMarkets.toString()}
          />
          <div className="w-px h-4 bg-border hidden sm:block" />
          <StatItem
            icon={<Target className="w-4 h-4 text-muted-foreground" />}
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
              <Flame className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-bold">Destaque</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground gap-1">
              <Link href="/">
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 items-stretch">
            {featuredMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                variant="featured"
                sparklineData={getMarketSparkline(market.id)}
                change24h={getMarketChange24h(market.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick Access - Trending Row */}
      {!isLoading && trendingMarkets.length > 0 && !searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-bold">Mais Negociados</h2>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {trendingMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                variant="compact"
                sparklineData={getMarketSparkline(market.id)}
                change24h={getMarketChange24h(market.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Markets Section */}
      <section className="space-y-6" id="todas-teses">
        {/* Sticky filter bar on mobile */}
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border/50 sm:relative sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <MarketSearch
              value={searchQuery}
              onChange={setSearchQuery}
              className="flex-1 max-w-lg"
              placeholder="Buscar teses..."
            />

            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOptionId)}>
              <SelectTrigger className="h-9 w-[160px] text-sm">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Header with filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Todas as Teses</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                {filteredMarkets.length} {filteredMarkets.length === 1 ? 'tese' : 'teses'}
                {searchQuery && (
                  <span className="ml-1">
                    para &quot;{searchQuery}&quot;
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Theme category filters - horizontal scroll on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
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
                    'gap-1 sm:gap-1.5 whitespace-nowrap flex-shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3',
                    isActive && 'bg-emerald-500 hover:bg-emerald-600'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{category.label}</span>
                  <span className="sm:hidden">{category.label.slice(0, 4)}</span>
                  {count > 0 && (
                    <span className={cn(
                      'text-[10px] sm:text-xs',
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

        {/* Market grid - responsive with mobile-optimized spacing */}
        {isLoading ? (
          <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="py-8 sm:py-12 text-center">
              <p className="text-destructive text-sm sm:text-base">{error}</p>
            </CardContent>
          </Card>
        ) : filteredMarkets.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-8 sm:py-12 text-center">
              <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <p className="text-muted-foreground mb-2 text-sm sm:text-base">Nenhuma tese encontrada</p>
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
          <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                sparklineData={getMarketSparkline(market.id)}
                change24h={getMarketChange24h(market.id)}
              />
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
      <div className="p-4 space-y-4">
        {/* Badge */}
        <Skeleton className="h-5 w-24" />
        {/* Title */}
        <Skeleton className="h-12 w-full" />
        {/* Probability bar */}
        <Skeleton className="h-3 w-full rounded-full" />
        {/* Odds row */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
        {/* Footer */}
        <div className="flex justify-between pt-3 border-t border-border/50">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </Card>
  )
}

function HeroMarketSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8">
      <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
        {/* Left */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        {/* Right */}
        <div className="space-y-4">
          <div className="flex justify-end">
            <Skeleton className="h-16 w-32" />
          </div>
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

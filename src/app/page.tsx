'use client'

import { useState, useMemo } from 'react'
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
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarketList } from '@/components/markets/MarketList'
import { MarketSearch } from '@/components/markets/MarketSearch'
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
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 bg-hero-pattern rounded-2xl">
        <div className="max-w-3xl mx-auto text-center space-y-6 px-4">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <Zap className="w-3 h-3" />
            Mercado de Teses Brasileiro
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Dados, não apostas.{' '}
            <span className="text-emerald-500">
              Teses.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Plataforma profissional de análise preditiva para política, economia e mercados.
            Negocie teses com precisão institucional.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 pt-6">
            <StatCard
              icon={<BarChart3 className="w-5 h-5 text-emerald-500" />}
              value={formatBRL(totalVolume)}
              label="Volume Total"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
              value={activeMarkets.toString()}
              label="Teses Ativas"
            />
            <StatCard
              icon={<Shield className="w-5 h-5 text-emerald-500" />}
              value="PIX"
              label="Depósito Instantâneo"
            />
          </div>
        </div>
      </section>

      {/* Markets Section */}
      <section className="space-y-6">
        {/* Search bar */}
        <MarketSearch
          value={searchQuery}
          onChange={setSearchQuery}
          className="max-w-md"
          placeholder="Buscar por nome ou descrição..."
        />

        {/* Header with filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Teses</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredMarkets.length} {filteredMarkets.length === 1 ? 'tese encontrada' : 'teses encontradas'}
                {searchQuery && (
                  <span className="ml-1">
                    para &quot;{searchQuery}&quot;
                  </span>
                )}
              </p>
            </div>

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
                      'gap-1.5 whitespace-nowrap transition-smooth',
                      isActive && 'shadow-md'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                    {filter.id === 'trending' && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/20 text-amber-500 border-0">
                        HOT
                      </Badge>
                    )}
                  </Button>
                )
              })}
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
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'gap-1.5 whitespace-nowrap transition-smooth',
                    isActive && 'bg-secondary shadow-sm'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                  {count > 0 && (
                    <span className="text-xs text-muted-foreground">({count})</span>
                  )}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Market grid */}
        <MarketList
          markets={filteredMarkets}
          isLoading={isLoading}
          error={error}
        />
      </section>

      {/* How it works */}
      <section className="py-12 border-t border-border/50" id="como-funciona">
        <h2 className="text-2xl font-bold text-center mb-3">Como funciona</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Negocie teses sobre eventos futuros com a precisão de um trader profissional.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <HowItWorksCard
            step={1}
            title="Analise a tese"
            description="Explore teses sobre política, economia e mercados. Cada tese representa uma previsão binária."
          />
          <HowItWorksCard
            step={2}
            title="Posicione-se"
            description="Compre contratos SIM ou NÃO. O preço reflete a probabilidade implícita do mercado."
          />
          <HowItWorksCard
            step={3}
            title="Realize o lucro"
            description="Contratos vencedores valem R$ 1,00. Seu retorno = Contratos x R$ 1,00 - Custo de entrada."
          />
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode, value: string, label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card/50 border border-border/50">
      {icon}
      <div className="text-left">
        <p className="font-bold text-lg">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function HowItWorksCard({ step, title, description }: { step: number, title: string, description: string }) {
  return (
    <div className="relative p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-smooth">
      <div className="absolute -top-3 left-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
        {step}
      </div>
      <h3 className="font-semibold text-lg mt-2 mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

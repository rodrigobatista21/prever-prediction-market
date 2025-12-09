'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, TrendingUp, TrendingDown, Users, Flame, Landmark, DollarSign, Trophy, Tv, Cpu, Globe, MoreHorizontal, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkline } from '@/components/ui/sparkline'
import type { MarketWithOdds, MarketCategory } from '@/lib/types/database.types'
import { formatRelativeDate, formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

const CATEGORY_CONFIG: Record<MarketCategory, { label: string; icon: typeof Landmark; color: string }> = {
  politica: { label: 'Politica', icon: Landmark, color: 'text-blue-400' },
  economia: { label: 'Economia', icon: DollarSign, color: 'text-emerald-400' },
  esportes: { label: 'Esportes', icon: Trophy, color: 'text-orange-400' },
  entretenimento: { label: 'Entretenimento', icon: Tv, color: 'text-pink-400' },
  tecnologia: { label: 'Tecnologia', icon: Cpu, color: 'text-purple-400' },
  internacional: { label: 'Internacional', icon: Globe, color: 'text-cyan-400' },
  outros: { label: 'Outros', icon: MoreHorizontal, color: 'text-gray-400' },
}

interface MarketCardProps {
  market: MarketWithOdds
  className?: string
  variant?: 'default' | 'compact' | 'featured'
  sparklineData?: number[]
  change24h?: number
}

function checkIsEnding(endsAt: string): boolean {
  const endsAtTime = new Date(endsAt).getTime()
  const oneDayMs = 24 * 60 * 60 * 1000
  return endsAtTime - Date.now() < oneDayMs
}

function checkIsTrending(liquidity: number): boolean {
  return liquidity > 2500
}

export function MarketCard({ market, className, variant = 'default', sparklineData: propSparklineData, change24h: propChange24h }: MarketCardProps) {
  const isEnding = checkIsEnding(market.ends_at)
  const isTrending = checkIsTrending(market.total_liquidity)
  const categoryConfig = CATEGORY_CONFIG[market.category || 'outros']
  const CategoryIcon = categoryConfig.icon

  // Use prop data if available, otherwise generate placeholder
  const sparklineData = useMemo(() => {
    if (propSparklineData && propSparklineData.length > 0) {
      return propSparklineData
    }
    // Fallback: simple line at current odds if no real data
    return [market.odds_yes, market.odds_yes]
  }, [propSparklineData, market.odds_yes])

  // Use prop change or calculate from sparkline
  const change24h = useMemo(() => {
    if (propChange24h !== undefined) {
      return propChange24h
    }
    if (sparklineData.length >= 2) {
      const first = sparklineData[0]
      const last = sparklineData[sparklineData.length - 1]
      if (first > 0) {
        return ((last - first) / first) * 100
      }
    }
    return 0
  }, [propChange24h, sparklineData])

  // Featured variant - Large card for hero section
  if (variant === 'featured') {
    return (
      <Link href={`/mercado/${market.id}`}>
        <Card className={cn(
          'overflow-hidden transition-all duration-300 group cursor-pointer',
          'hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5',
          'border-border/50 bg-card/50 backdrop-blur-sm',
          className
        )}>
          <div className="flex flex-col md:flex-row">
            {/* Image Section */}
            <div className="relative w-full md:w-72 h-48 md:h-auto bg-muted flex-shrink-0">
              {market.image_url ? (
                <Image
                  src={market.image_url}
                  alt={market.title}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                  <TrendingUp className="w-16 h-16 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/80 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent md:hidden" />

              {isTrending && (
                <Badge className="absolute top-3 left-3 bg-amber-500/90 text-white border-0 gap-1">
                  <Flame className="w-3 h-3" />
                  Popular
                </Badge>
              )}
            </div>

            {/* Content Section */}
            <CardContent className="flex-1 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryIcon className={cn('w-4 h-4', categoryConfig.color)} />
                    <span className={cn('text-xs font-medium', categoryConfig.color)}>
                      {categoryConfig.label}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeDate(market.ends_at)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold group-hover:text-emerald-500 transition-colors">
                    {market.title}
                  </h3>
                </div>
                <Sparkline data={sparklineData} width={100} height={40} />
              </div>

              {/* Odds and Stats Row */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <OddsPill outcome="yes" odds={market.odds_yes} />
                  <OddsPill outcome="no" odds={market.odds_no} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    <span className="font-medium text-foreground">{formatBRL(market.total_liquidity)}</span>
                    <span className="text-xs">vol.</span>
                  </div>
                  <Change24h value={change24h} />
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Link href={`/mercado/${market.id}`}>
        <Card className={cn(
          'overflow-hidden transition-all duration-200 hover:bg-accent/50 cursor-pointer border-border/50',
          className
        )}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Mini image */}
              <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                {market.image_url ? (
                  <Image
                    src={market.image_url}
                    alt={market.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-1">
                  {market.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-emerald-500 font-semibold">{Math.round(market.odds_yes)}%</span>
                  <span>SIM</span>
                </div>
              </div>

              {/* Sparkline */}
              <Sparkline data={sparklineData} width={48} height={20} showArea={false} />
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Default variant - Trading card style
  return (
    <Link href={`/mercado/${market.id}`}>
      <Card
        className={cn(
          'overflow-hidden transition-all duration-200 group cursor-pointer',
          'hover:border-emerald-500/30 hover:bg-accent/30',
          'border-border/50',
          className
        )}
      >
        <CardContent className="p-0">
          {/* Header with image and badges */}
          <div className="relative h-32 bg-muted overflow-hidden">
            {market.image_url ? (
              <Image
                src={market.image_url}
                alt={market.title}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-transparent">
                <TrendingUp className="w-10 h-10 text-muted-foreground/20" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

            {/* Category & Trending badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm border-0 gap-1">
                <CategoryIcon className={cn('w-3 h-3', categoryConfig.color)} />
                {categoryConfig.label}
              </Badge>
              {isTrending && (
                <Badge className="text-[10px] px-1.5 py-0.5 bg-amber-500/90 text-white border-0">
                  <Flame className="w-3 h-3" />
                </Badge>
              )}
            </div>

            {/* Time badge */}
            <Badge
              variant={isEnding ? 'destructive' : 'secondary'}
              className={cn(
                'absolute top-2 right-2 text-[10px] px-1.5 py-0.5',
                !isEnding && 'bg-background/80 backdrop-blur-sm border-0'
              )}
            >
              <Clock className="w-3 h-3 mr-1" />
              {formatRelativeDate(market.ends_at)}
            </Badge>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-emerald-500 transition-colors min-h-[40px]">
              {market.title}
            </h3>

            {/* Sparkline + Current odds */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-500">
                    {Math.round(market.odds_yes)}%
                  </span>
                  <span className="text-xs text-muted-foreground">SIM</span>
                </div>
                <Change24h value={change24h} size="sm" />
              </div>
              <Sparkline data={sparklineData} width={72} height={28} />
            </div>

            {/* Trade buttons */}
            <div className="flex items-center gap-2 pt-1">
              <TradeButton outcome="yes" odds={market.odds_yes} />
              <TradeButton outcome="no" odds={market.odds_no} />
            </div>

            {/* Footer stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>{formatBRL(market.total_liquidity)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{Math.floor(market.total_liquidity / 50)} traders</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

interface OddsPillProps {
  outcome: 'yes' | 'no'
  odds: number
}

function OddsPill({ outcome, odds }: OddsPillProps) {
  const isYes = outcome === 'yes'

  return (
    <div className={cn(
      'px-4 py-2 rounded-lg font-semibold text-center min-w-[80px]',
      isYes
        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
    )}>
      <div className="text-xs opacity-70 mb-0.5">{isYes ? 'SIM' : 'NAO'}</div>
      <div className="text-lg">{Math.round(odds)}%</div>
    </div>
  )
}

interface TradeButtonProps {
  outcome: 'yes' | 'no'
  odds: number
}

function TradeButton({ outcome, odds }: TradeButtonProps) {
  const isYes = outcome === 'yes'

  return (
    <button
      className={cn(
        'flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all duration-200',
        'flex items-center justify-center gap-1',
        isYes
          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 hover:border-emerald-500'
          : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-500'
      )}
      onClick={(e) => e.preventDefault()}
    >
      {isYes ? 'Sim' : 'Nao'}
      <span className="font-bold">{Math.round(odds)}%</span>
    </button>
  )
}

interface Change24hProps {
  value: number
  size?: 'sm' | 'md'
}

function Change24h({ value, size = 'md' }: Change24hProps) {
  const isPositive = value >= 0
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight

  return (
    <div className={cn(
      'flex items-center gap-0.5',
      size === 'sm' ? 'text-[10px]' : 'text-xs',
      isPositive ? 'text-emerald-500' : 'text-rose-500'
    )}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="font-medium">
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
      <span className="text-muted-foreground ml-0.5">24h</span>
    </div>
  )
}

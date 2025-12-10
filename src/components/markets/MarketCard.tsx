'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, TrendingUp, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkline } from '@/components/ui/sparkline'
import { ProbabilityBar, ProbabilityBarCompact } from '@/components/ui/probability-bar'
import type { MarketWithOdds } from '@/lib/types/database.types'
import { formatRelativeDate, formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

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

export function MarketCard({ market, className, variant = 'default', sparklineData: propSparklineData, change24h: propChange24h }: MarketCardProps) {
  const isEnding = checkIsEnding(market.ends_at)

  // Use prop data if available, otherwise generate placeholder
  const sparklineData = useMemo(() => {
    if (propSparklineData && propSparklineData.length > 0) {
      return propSparklineData
    }
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

  // Featured variant - Large card with image for hero section
  if (variant === 'featured') {
    return (
      <Link href={`/mercado/${market.id}`}>
        <Card className={cn(
          'overflow-hidden transition-all duration-300 group cursor-pointer h-full',
          'hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5',
          'border-border/50 bg-card/50 backdrop-blur-sm',
          className
        )}>
          <div className="flex flex-col h-full">
            {/* Image Section - Only for featured */}
            <div className="relative w-full h-36 bg-muted flex-shrink-0">
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
                  <TrendingUp className="w-12 h-12 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

              {/* Single badge - time only */}
              <Badge
                variant={isEnding ? 'destructive' : 'secondary'}
                className={cn(
                  'absolute top-3 right-3 text-[10px] px-2 py-0.5',
                  !isEnding && 'bg-background/80 backdrop-blur-sm border-0'
                )}
              >
                <Clock className="w-3 h-3 mr-1" />
                {formatRelativeDate(market.ends_at)}
              </Badge>
            </div>

            {/* Content Section */}
            <CardContent className="flex-1 p-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Title */}
                <h3 className="text-lg font-bold group-hover:text-emerald-500 transition-colors line-clamp-2 min-h-[56px]">
                  {market.title}
                </h3>

                {/* Probability Bar - Main visual element */}
                <ProbabilityBar yesPercent={market.odds_yes} size="lg" />

                {/* Sparkline row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-foreground">
                      {Math.round(market.odds_yes)}%
                    </span>
                    <Change24h value={change24h} />
                  </div>
                  <Sparkline data={sparklineData} width={80} height={32} />
                </div>
              </div>

              {/* Footer stats */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium text-foreground">{formatBRL(market.total_liquidity)}</span>
                  <span>volume</span>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    )
  }

  // Compact variant - For trending row
  if (variant === 'compact') {
    return (
      <Link href={`/mercado/${market.id}`}>
        <Card className={cn(
          'overflow-hidden transition-all duration-200 hover:bg-accent/50 cursor-pointer border-border/50 h-full',
          className
        )}>
          <CardContent className="p-3 space-y-2">
            {/* Title */}
            <h3 className="font-medium text-sm line-clamp-2 min-h-[40px]">
              {market.title}
            </h3>

            {/* Probability bar compact */}
            <ProbabilityBarCompact yesPercent={market.odds_yes} />

            {/* Stats row */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-emerald-500">
                {Math.round(market.odds_yes)}%
              </span>
              <Sparkline data={sparklineData} width={48} height={20} showArea={false} />
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Default variant - Clean card without image
  return (
    <Link href={`/mercado/${market.id}`}>
      <Card
        className={cn(
          'overflow-hidden transition-all duration-200 group cursor-pointer h-full',
          'hover:border-emerald-500/30 hover:bg-accent/30',
          'border-border/50',
          className
        )}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header: Title + Badge */}
          <div className="space-y-2">
            {/* Single badge row */}
            <div className="flex items-center justify-between">
              <Badge
                variant={isEnding ? 'destructive' : 'secondary'}
                className={cn(
                  'text-[10px] px-2 py-0.5',
                  !isEnding && 'bg-muted border-0'
                )}
              >
                <Clock className="w-3 h-3 mr-1" />
                {formatRelativeDate(market.ends_at)}
              </Badge>
            </div>

            {/* Title - Larger and prominent */}
            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-emerald-500 transition-colors min-h-[48px]">
              {market.title}
            </h3>
          </div>

          {/* Probability Bar - The main visual element */}
          <ProbabilityBar yesPercent={market.odds_yes} size="md" />

          {/* Odds + Sparkline row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-foreground">
                {Math.round(market.odds_yes)}%
              </span>
              <Change24h value={change24h} size="sm" />
            </div>
            <Sparkline data={sparklineData} width={72} height={28} />
          </div>

          {/* Footer stats - Minimal */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>{formatBRL(market.total_liquidity)}</span>
            </div>
            <span className="text-emerald-500 font-medium">Negociar →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

interface Change24hProps {
  value: number
  size?: 'sm' | 'md'
}

function Change24h({ value, size = 'md' }: Change24hProps) {
  const isPositive = value >= 0
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight

  if (Math.abs(value) < 0.1) return null

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
    </div>
  )
}

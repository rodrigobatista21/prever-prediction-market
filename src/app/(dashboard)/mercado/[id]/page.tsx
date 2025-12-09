'use client'

import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  AlertCircle,
  Users,
  BarChart3,
  Calendar,
  Info,
  ExternalLink,
  Share2,
  Bookmark,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { OddsBar } from '@/components/markets/OddsBar'
import { OddsChart } from '@/components/markets/OddsChart'
import { MarketTradeHistory } from '@/components/markets/MarketTradeHistory'
import { TradePanel } from '@/components/trading/TradePanel'
import { useMarket, useAuth, useBalance } from '@/lib/hooks'
import { formatBRL, formatDate, formatRelativeDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface MarketPageProps {
  params: Promise<{ id: string }>
}

export default function MarketPage({ params }: MarketPageProps) {
  const { id } = use(params)
  const { market, isLoading, error, refetch } = useMarket(id)
  const { user } = useAuth()
  const { balance, refetch: refetchBalance } = useBalance(user)

  const handleTradeSuccess = () => {
    refetch()
    refetchBalance()
  }

  if (isLoading) {
    return <MarketPageSkeleton />
  }

  if (error || !market) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Mercado não encontrado</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {error || 'Este mercado não existe ou foi removido.'}
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos mercados
          </Link>
        </Button>
      </div>
    )
  }

  const isResolved = market.outcome !== null
  const isExpired = new Date(market.ends_at) < new Date()
  const canTrade = !isResolved && !isExpired && user

  // Check if ending soon (within 24h)
  const endsAt = new Date(market.ends_at).getTime()
  const isEndingSoon = !isResolved && !isExpired && (endsAt - Date.now()) < 24 * 60 * 60 * 1000

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            Mercados
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Main content - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Market Header Card */}
          <Card className="overflow-hidden border-border/50">
            {/* Image with overlay */}
            <div className="relative h-48 md:h-56 bg-muted">
              {market.image_url ? (
                <Image
                  src={market.image_url}
                  alt={market.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
                  <TrendingUp className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

              {/* Status badge */}
              <div className="absolute top-4 left-4 flex gap-2">
                {isResolved ? (
                  <Badge
                    className={cn(
                      'text-sm font-semibold gap-1',
                      market.outcome
                        ? 'bg-emerald-500/90 text-white border-0'
                        : 'bg-rose-500/90 text-white border-0'
                    )}
                  >
                    {market.outcome ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {market.outcome ? 'SIM venceu' : 'NÃO venceu'}
                  </Badge>
                ) : isExpired ? (
                  <Badge variant="secondary" className="bg-amber-500/90 text-white border-0">
                    <Clock className="w-3 h-3 mr-1" />
                    Aguardando resolução
                  </Badge>
                ) : isEndingSoon ? (
                  <Badge variant="destructive" className="animate-pulse">
                    <Clock className="w-3 h-3 mr-1" />
                    Encerrando em breve
                  </Badge>
                ) : null}
              </div>
            </div>

            <CardContent className="p-6 space-y-6 -mt-12 relative">
              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {market.title}
              </h1>

              {/* Quick Stats Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  <span className="font-medium text-foreground">{formatBRL(market.total_liquidity)}</span>
                  <span>volume</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Encerra {formatRelativeDate(market.ends_at)}</span>
                </div>
              </div>

              {/* Odds Bar */}
              <div className="space-y-3">
                <OddsBar
                  oddsYes={market.odds_yes}
                  oddsNo={market.odds_no}
                  size="lg"
                />
              </div>

              {/* Description */}
              {market.description && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-muted-foreground leading-relaxed">
                    {market.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Details */}
          <Card className="border-border/50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Detalhes do Mercado
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <DetailItem
                  label="Pool SIM"
                  value={formatBRL(market.pool_yes)}
                  color="emerald"
                />
                <DetailItem
                  label="Pool NÃO"
                  value={formatBRL(market.pool_no)}
                  color="rose"
                />
                <DetailItem
                  label="Liquidez Total"
                  value={formatBRL(market.total_liquidity)}
                />
                <DetailItem
                  label="Data de Encerramento"
                  value={formatDate(market.ends_at)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Odds Chart */}
          <OddsChart marketId={market.id} className="border-border/50" />

          {/* How It Works */}
          <Card className="border-border/50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Como funciona</h3>
              <div className="space-y-4">
                <HowItWorksStep
                  step={1}
                  title="Escolha SIM ou NÃO"
                  description="Aposte no resultado que você acredita que vai acontecer."
                />
                <HowItWorksStep
                  step={2}
                  title="Compre ações"
                  description="O preço é definido pela probabilidade atual. Quanto menor a probabilidade, mais ações você recebe."
                />
                <HowItWorksStep
                  step={3}
                  title="Aguarde o resultado"
                  description="Se você acertar, cada ação que você possui vale R$ 1,00. Seu lucro = Ações × R$ 1,00 - Custo."
                />
              </div>
            </CardContent>
          </Card>

          {/* Trade History */}
          <MarketTradeHistory marketId={market.id} />
        </div>

        {/* Sidebar - Trade Panel - 2 columns */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            {canTrade ? (
              <TradePanel
                marketId={market.id}
                poolYes={market.pool_yes}
                poolNo={market.pool_no}
                balance={balance}
                onTradeSuccess={handleTradeSuccess}
              />
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-6 text-center space-y-4">
                  {!user ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Users className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Entre para operar</p>
                        <p className="text-sm text-muted-foreground">
                          Faça login para participar deste mercado
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Button asChild className="w-full">
                          <Link href={`/login?redirect=/mercado/${market.id}`}>
                            Entrar
                          </Link>
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                          <Link href="/register">
                            Criar conta
                          </Link>
                        </Button>
                      </div>
                    </>
                  ) : isResolved ? (
                    <>
                      <div className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center mx-auto',
                        market.outcome ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                      )}>
                        {market.outcome ? (
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <XCircle className="w-8 h-8 text-rose-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-lg">
                          {market.outcome ? 'SIM' : 'NÃO'} venceu!
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Este mercado foi resolvido
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                        <Clock className="w-7 h-7 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold">Mercado encerrado</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Aguardando resolução do resultado
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Info Card */}
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  Cada ação vencedora vale R$ 1,00 no final
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({
  label,
  value,
  color
}: {
  label: string
  value: string
  color?: 'emerald' | 'rose'
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn(
        'font-semibold',
        color === 'emerald' && 'text-emerald-500',
        color === 'rose' && 'text-rose-500'
      )}>
        {value}
      </p>
    </div>
  )
}

function HowItWorksStep({
  step,
  title,
  description
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
        {step}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function MarketPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-24" />
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <Card className="overflow-hidden border-border/50">
            <Skeleton className="h-56 w-full" />
            <div className="p-6 space-y-6 -mt-12">
              <Skeleton className="h-10 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </Card>
          <Card className="border-border/50">
            <div className="p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    </div>
  )
}

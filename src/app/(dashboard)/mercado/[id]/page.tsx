'use client'

import { use, useState, useEffect } from 'react'
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
  Share2,
  Bookmark,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CountdownTimer } from '@/components/markets/CountdownTimer'
import { OutcomeCards } from '@/components/markets/OutcomeCards'
import { ActivityFeed } from '@/components/markets/ActivityFeed'
import { MarketOrderBook } from '@/components/markets/MarketOrderBook'
import { OddsChart } from '@/components/markets/OddsChart'
import { TradePanel } from '@/components/trading/TradePanel'
import { useMarket, useAuth, useBalance } from '@/lib/hooks'
import { formatBRL, formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface MarketPageProps {
  params: Promise<{ id: string }>
}

export default function MarketPage({ params }: MarketPageProps) {
  const { id } = use(params)
  const { market, isLoading, error, refetch } = useMarket(id)
  const { user } = useAuth()
  const { balance, refetch: refetchBalance } = useBalance(user)

  const [now, setNow] = useState(() => Date.now())
  const [showDescription, setShowDescription] = useState(false)
  const [showOrderBook, setShowOrderBook] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

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
  const isExpired = new Date(market.ends_at) < new Date(now)
  const canTrade = !isResolved && !isExpired && user

  const endsAt = new Date(market.ends_at).getTime()
  const isEndingSoon = !isResolved && !isExpired && (endsAt - now) < 24 * 60 * 60 * 1000

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            Voltar
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

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Hero Section */}
          <Card className="overflow-hidden border-border/50">
            {/* Image Banner */}
            <div className="relative h-40 md:h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
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
                  <TrendingUp className="w-16 h-16 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

              {/* Status Badge */}
              <div className="absolute top-4 left-4 flex gap-2">
                {isResolved ? (
                  <Badge className={cn(
                    'font-semibold gap-1',
                    market.outcome
                      ? 'bg-emerald-500/90 text-white border-0'
                      : 'bg-rose-500/90 text-white border-0'
                  )}>
                    {market.outcome ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
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

            <CardContent className="p-5 -mt-10 relative space-y-4">
              {/* Title */}
              <h1 className="text-xl md:text-2xl font-bold leading-tight">
                {market.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  <span>Vol Total:</span>
                  <span className="font-semibold text-foreground">{formatBRL(market.total_liquidity)}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Fim:</span>
                  <span className="font-medium text-foreground">{formatDate(market.ends_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outcome Cards */}
          <OutcomeCards
            marketId={market.id}
            poolYes={market.pool_yes}
            poolNo={market.pool_no}
            isResolved={isResolved}
            outcome={market.outcome}
          />

          {/* Odds History Chart */}
          <OddsChart marketId={market.id} className="border-border/50" />

          {/* Countdown Timer */}
          {!isResolved && (
            <Card className="border-border/50">
              <CardContent className="p-5">
                <CountdownTimer endsAt={market.ends_at} />
              </CardContent>
            </Card>
          )}

          {/* Description - Collapsible */}
          {market.description && (
            <Collapsible open={showDescription} onOpenChange={setShowDescription}>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <span className="font-semibold">Regras e Detalhes do Mercado</span>
                      {showDescription ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {market.description}
                      </p>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          )}

          {/* Activity Feed */}
          <ActivityFeed marketId={market.id} />
        </div>

        {/* Sidebar - 2 columns */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            {/* Trade Panel */}
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

            {/* Order Book - Collapsible */}
            <Collapsible open={showOrderBook} onOpenChange={setShowOrderBook}>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <span className="font-semibold flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Order Book
                      </span>
                      {showOrderBook ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <MarketOrderBook marketId={market.id} className="border-0 shadow-none" />
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  )
}

function MarketPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-24" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <Card className="overflow-hidden border-border/50">
            <Skeleton className="h-48 w-full" />
            <div className="p-5 space-y-4 -mt-10">
              <Skeleton className="h-8 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    </div>
  )
}

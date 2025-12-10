'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrderBook } from '@/components/trading/OrderBook'
import { useOrderBook } from '@/lib/hooks/use-orderbook'
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketOrderBookProps {
  marketId: string
  className?: string
}

export function MarketOrderBook({ marketId, className }: MarketOrderBookProps) {
  const [activeOutcome, setActiveOutcome] = useState<'yes' | 'no'>('yes')

  const {
    orderBook: yesOrderBook,
    bestPrices: yesPrices,
    isLoading: yesLoading
  } = useOrderBook(marketId, true)

  const {
    orderBook: noOrderBook,
    bestPrices: noPrices,
    isLoading: noLoading
  } = useOrderBook(marketId, false)

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5 text-primary" />
          Order Book
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeOutcome} onValueChange={(v) => setActiveOutcome(v as 'yes' | 'no')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger
              value="yes"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500"
            >
              <TrendingUp className="w-4 h-4" />
              SIM
              {yesPrices?.best_ask && (
                <span className="text-xs font-bold ml-1">
                  {(yesPrices.best_ask * 100).toFixed(1)}¢
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="no"
              className="flex items-center gap-2 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-500"
            >
              <TrendingDown className="w-4 h-4" />
              NÃO
              {noPrices?.best_ask && (
                <span className="text-xs font-bold ml-1">
                  {(noPrices.best_ask * 100).toFixed(1)}¢
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="yes" className="mt-0">
            <OrderBook
              orderBook={yesOrderBook}
              isLoading={yesLoading}
              outcome={true}
              maxDepth={5}
            />
          </TabsContent>

          <TabsContent value="no" className="mt-0">
            <OrderBook
              orderBook={noOrderBook}
              isLoading={noLoading}
              outcome={false}
              maxDepth={5}
            />
          </TabsContent>
        </Tabs>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">SIM</p>
              <div className="flex justify-between">
                <span className="text-emerald-500">Bid</span>
                <span className="font-medium">
                  {yesPrices?.best_bid ? `${(yesPrices.best_bid * 100).toFixed(1)}¢` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-500">Ask</span>
                <span className="font-medium">
                  {yesPrices?.best_ask ? `${(yesPrices.best_ask * 100).toFixed(1)}¢` : '-'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">NÃO</p>
              <div className="flex justify-between">
                <span className="text-emerald-500">Bid</span>
                <span className="font-medium">
                  {noPrices?.best_bid ? `${(noPrices.best_bid * 100).toFixed(1)}¢` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-500">Ask</span>
                <span className="font-medium">
                  {noPrices?.best_ask ? `${(noPrices.best_ask * 100).toFixed(1)}¢` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

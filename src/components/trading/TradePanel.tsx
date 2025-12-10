'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Info, Sparkles } from 'lucide-react'
import { formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useOrderBook, usePlaceOrder } from '@/lib/hooks/use-orderbook'
import {
  calculatePotentialReturn,
  calculateMultiplier,
  calculateOrderCost,
  formatPrice
} from '@/lib/utils/orderbook'

interface TradePanelProps {
  marketId: string
  poolYes: number // Mantido para compatibilidade/exibição
  poolNo: number
  balance: number
  onTradeSuccess?: () => void
}

type OrderType = 'market' | 'limit'

export function TradePanel({
  marketId,
  poolYes,
  poolNo,
  balance,
  onTradeSuccess,
}: TradePanelProps) {
  const [outcome, setOutcome] = useState<boolean>(true) // true=YES, false=NO
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [price, setPrice] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')

  // Hooks do Order Book
  const { bestPrices: yesPrices, isLoading: yesLoading } = useOrderBook(marketId, true)
  const { bestPrices: noPrices, isLoading: noLoading } = useOrderBook(marketId, false)
  const { placeOrder, isLoading: orderLoading, error, clearError } = usePlaceOrder()

  const isLoading = yesLoading || noLoading || orderLoading

  const priceNumber = parseFloat(price) || 0
  const quantityNumber = parseFloat(quantity) || 0

  // Obter melhores preços para o outcome selecionado
  const currentPrices = outcome ? yesPrices : noPrices
  const bestAsk = currentPrices?.best_ask
  const bestBid = currentPrices?.best_bid

  // Calcular preço efetivo (para market orders, usa o best ask)
  const effectivePrice = orderType === 'market'
    ? bestAsk
    : (priceNumber > 0 ? priceNumber : null)

  // Preview da operação
  const preview = useMemo(() => {
    if (quantityNumber <= 0 || !effectivePrice || effectivePrice <= 0 || effectivePrice >= 1) {
      return null
    }

    const cost = calculateOrderCost(effectivePrice, quantityNumber)
    const potentialReturn = calculatePotentialReturn(effectivePrice)
    const multiplier = calculateMultiplier(effectivePrice)
    const winnings = quantityNumber // Cada ação vale R$1 se ganhar

    return {
      effectivePrice,
      cost,
      potentialReturn,
      multiplier,
      winnings,
      profit: winnings - cost,
      roi: (winnings - cost) / cost
    }
  }, [effectivePrice, quantityNumber])

  // Quick amounts baseados em quantidade de ações
  const quickAmounts = useMemo(() => {
    const price = effectivePrice || 0.5
    return [25, 50, 100, 250]
      .map(qty => ({
        quantity: qty,
        cost: qty * price
      }))
      .filter(q => q.cost <= balance)
  }, [balance, effectivePrice])

  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/[^\d,\.]/g, '').replace(',', '.')
    setPrice(cleaned)
    clearError()
  }

  const handleQuantityChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '')
    setQuantity(cleaned)
    clearError()
  }

  const handleQuickAmount = (qty: number) => {
    setQuantity(qty.toString())
    clearError()
  }

  const handleSubmit = async () => {
    if (!preview || quantityNumber <= 0) return

    const orderPrice = orderType === 'limit' ? priceNumber : null

    const result = await placeOrder(
      marketId,
      outcome,
      'buy',
      orderType,
      orderPrice,
      quantityNumber
    )

    if (result.success) {
      setQuantity('')
      setPrice('')
      onTradeSuccess?.()
    }
  }

  const isDisabled = Boolean(
    isLoading ||
    quantityNumber <= 0 ||
    (orderType === 'limit' && (priceNumber <= 0 || priceNumber >= 1)) ||
    (orderType === 'market' && !bestAsk) ||
    (preview && preview.cost > balance)
  )

  const outcomeName = outcome ? 'SIM' : 'NÃO'

  // Calcular probabilidade baseada no mid-price do order book
  const yesMidPrice = yesPrices?.best_bid && yesPrices?.best_ask
    ? (yesPrices.best_bid + yesPrices.best_ask) / 2
    : poolYes / (poolYes + poolNo)
  const noMidPrice = noPrices?.best_bid && noPrices?.best_ask
    ? (noPrices.best_bid + noPrices.best_ask) / 2
    : poolNo / (poolYes + poolNo)

  return (
    <Card className="overflow-hidden border-border/50">
      {/* Outcome selector tabs */}
      <div className="grid grid-cols-2 border-b border-border/50">
        <button
          onClick={() => setOutcome(true)}
          className={cn(
            'py-4 px-4 font-semibold transition-smooth flex items-center justify-center gap-2',
            outcome
              ? 'bg-emerald-500/10 text-emerald-500 border-b-2 border-emerald-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Sim
          <span className="text-lg font-bold">
            {yesPrices?.best_ask ? formatPrice(yesPrices.best_ask) : `${Math.round(yesMidPrice * 100)}%`}
          </span>
        </button>
        <button
          onClick={() => setOutcome(false)}
          className={cn(
            'py-4 px-4 font-semibold transition-smooth flex items-center justify-center gap-2',
            !outcome
              ? 'bg-rose-500/10 text-rose-500 border-b-2 border-rose-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <TrendingDown className="w-4 h-4" />
          Não
          <span className="text-lg font-bold">
            {noPrices?.best_ask ? formatPrice(noPrices.best_ask) : `${Math.round(noMidPrice * 100)}%`}
          </span>
        </button>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Order type toggle */}
        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="limit">Limit</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Price input (for limit orders) */}
        {orderType === 'limit' && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Preço por ação</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.50"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Quick price buttons */}
            {currentPrices && (
              <div className="flex gap-1 flex-wrap">
                {currentPrices.best_bid && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrice(currentPrices.best_bid!.toFixed(2))}
                    className="text-xs h-7"
                  >
                    Bid {formatPrice(currentPrices.best_bid)}
                  </Button>
                )}
                {currentPrices.best_ask && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrice(currentPrices.best_ask!.toFixed(2))}
                    className="text-xs h-7"
                  >
                    Ask {formatPrice(currentPrices.best_ask)}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Market order info */}
        {orderType === 'market' && (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            <p className="font-medium text-foreground mb-1">Ordem a mercado</p>
            <p>Executar imediatamente ao melhor preço disponível</p>
            {bestAsk && (
              <p className="mt-2 font-medium text-foreground">
                Melhor preço: {formatPrice(bestAsk)}/ação
              </p>
            )}
            {!bestAsk && !isLoading && (
              <p className="mt-2 text-amber-500">
                Sem liquidez disponível no momento
              </p>
            )}
          </div>
        )}

        {/* Quantity input */}
        <div className="space-y-3">
          <label className="text-sm text-muted-foreground">Quantidade de ações</label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="100"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="h-14 text-2xl font-bold bg-muted/50 border-border/50 focus:border-primary"
          />
          {/* Quick quantity buttons */}
          {quickAmounts.length > 0 && (
            <div className="flex gap-2">
              {quickAmounts.map(({ quantity: qty }) => (
                <Button
                  key={qty}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(qty)}
                  className={cn(
                    'flex-1 h-9 text-xs font-medium border-border/50',
                    quantity === qty.toString() && 'border-primary bg-primary/10'
                  )}
                >
                  {qty} ações
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Saldo disponível</span>
          <span className="font-medium">{formatBRL(balance)}</span>
        </div>

        {/* Preview */}
        {preview && (
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              Previsão
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preço</span>
                <span className="font-medium">{formatPrice(preview.effectivePrice)}/ação</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo total</span>
                <span className="font-medium">{formatBRL(preview.cost)}</span>
              </div>
              <div className="h-px bg-border/50 my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Se ganhar</span>
                <span className="font-bold text-lg">{formatBRL(preview.winnings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lucro potencial</span>
                <span className={cn(
                  'font-bold',
                  preview.profit > 0 ? 'text-emerald-500' : 'text-rose-500'
                )}>
                  {preview.profit > 0 ? '+' : ''}{formatBRL(preview.profit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Multiplicador</span>
                <span className="font-medium">{preview.multiplier.toFixed(2)}x</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-rose-500 text-sm bg-rose-500/10 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={isDisabled}
          size="lg"
          className={cn(
            'w-full h-14 text-base font-bold transition-smooth',
            outcome
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-rose-500 hover:bg-rose-600 text-white'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Comprar {outcomeName}
              {preview && (
                <span className="ml-2 opacity-80">
                  • {quantityNumber} ações
                </span>
              )}
            </>
          )}
        </Button>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Info className="w-3 h-3" />
          Cada ação vencedora vale R$ 1,00
        </p>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Info, Sparkles } from 'lucide-react'
import { formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { usePlaceOrder } from '@/lib/hooks/use-orderbook'
import {
  calculatePotentialReturn,
  calculateMultiplier,
  calculateOrderCost,
  formatPrice,
  type BestPrices
} from '@/lib/utils/orderbook'

interface OrderFormProps {
  marketId: string
  balance: number
  bestPrices: {
    yes: BestPrices | null
    no: BestPrices | null
  }
  onOrderPlaced?: () => void
}

type OrderType = 'market' | 'limit'
type Side = 'buy' | 'sell'

export function OrderForm({
  marketId,
  balance,
  bestPrices,
  onOrderPlaced
}: OrderFormProps) {
  const [outcome, setOutcome] = useState<boolean>(true) // true=YES, false=NO
  const [orderType, setOrderType] = useState<OrderType>('limit')
  const [side, setSide] = useState<Side>('buy')
  const [price, setPrice] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')

  const { placeOrder, isLoading, error, clearError } = usePlaceOrder()

  const priceNumber = parseFloat(price) || 0
  const quantityNumber = parseFloat(quantity) || 0

  // Calcular custo/recebimento e retorno potencial
  const preview = useMemo(() => {
    if (quantityNumber <= 0) return null

    const effectivePrice = orderType === 'market'
      ? (side === 'buy'
        ? bestPrices[outcome ? 'yes' : 'no']?.best_ask
        : bestPrices[outcome ? 'yes' : 'no']?.best_bid)
      : priceNumber

    if (!effectivePrice || effectivePrice <= 0 || effectivePrice >= 1) return null

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
  }, [orderType, side, outcome, priceNumber, quantityNumber, bestPrices])

  // Quick amounts baseados em % do saldo
  const quickAmounts = useMemo(() => {
    if (side === 'sell') return [] // Para venda, não faz sentido
    const effectivePrice = preview?.effectivePrice || 0.5
    return [25, 50, 100, 250]
      .map(qty => ({
        quantity: qty,
        cost: qty * effectivePrice
      }))
      .filter(q => q.cost <= balance)
  }, [balance, preview?.effectivePrice, side])

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
      side,
      orderType,
      orderPrice,
      quantityNumber
    )

    if (result.success) {
      setQuantity('')
      setPrice('')
      onOrderPlaced?.()
    }
  }

  const isDisabled = Boolean(
    isLoading ||
    quantityNumber <= 0 ||
    (orderType === 'limit' && (priceNumber <= 0 || priceNumber >= 1)) ||
    (side === 'buy' && preview && preview.cost > balance)
  )

  const currentBestPrices = bestPrices[outcome ? 'yes' : 'no']
  const outcomeName = outcome ? 'SIM' : 'NÃO'

  return (
    <Card className="overflow-hidden border-border/50">
      {/* Outcome selector tabs */}
      <div className="grid grid-cols-2 border-b border-border/50">
        <button
          onClick={() => setOutcome(true)}
          className={cn(
            'py-3 px-4 font-semibold transition-smooth flex items-center justify-center gap-2',
            outcome
              ? 'bg-emerald-500/10 text-emerald-500 border-b-2 border-emerald-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Sim
          {bestPrices.yes?.best_ask && (
            <span className="text-sm font-bold">
              {formatPrice(bestPrices.yes.best_ask)}
            </span>
          )}
        </button>
        <button
          onClick={() => setOutcome(false)}
          className={cn(
            'py-3 px-4 font-semibold transition-smooth flex items-center justify-center gap-2',
            !outcome
              ? 'bg-rose-500/10 text-rose-500 border-b-2 border-rose-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <TrendingDown className="w-4 h-4" />
          Não
          {bestPrices.no?.best_ask && (
            <span className="text-sm font-bold">
              {formatPrice(bestPrices.no.best_ask)}
            </span>
          )}
        </button>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Order type toggle */}
        <div className="flex gap-2">
          <Button
            variant={orderType === 'limit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrderType('limit')}
            className="flex-1"
          >
            Limit
          </Button>
          <Button
            variant={orderType === 'market' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrderType('market')}
            className="flex-1"
          >
            Market
          </Button>
        </div>

        {/* Buy/Sell toggle */}
        <div className="flex gap-2">
          <Button
            variant={side === 'buy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSide('buy')}
            className={cn(
              'flex-1',
              side === 'buy' && 'bg-emerald-500 hover:bg-emerald-600'
            )}
          >
            Comprar
          </Button>
          <Button
            variant={side === 'sell' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSide('sell')}
            className={cn(
              'flex-1',
              side === 'sell' && 'bg-rose-500 hover:bg-rose-600'
            )}
          >
            Vender
          </Button>
        </div>

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
            {currentBestPrices && (
              <div className="flex gap-1 flex-wrap">
                {currentBestPrices.best_bid && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrice(currentBestPrices.best_bid!.toFixed(2))}
                    className="text-xs h-7"
                  >
                    Bid {formatPrice(currentBestPrices.best_bid)}
                  </Button>
                )}
                {currentBestPrices.best_ask && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrice(currentBestPrices.best_ask!.toFixed(2))}
                    className="text-xs h-7"
                  >
                    Ask {formatPrice(currentBestPrices.best_ask)}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Market order info */}
        {orderType === 'market' && (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded p-2">
            Executar ao melhor preço disponível
            {currentBestPrices && side === 'buy' && currentBestPrices.best_ask && (
              <span className="block font-medium text-foreground">
                Best ask: {formatPrice(currentBestPrices.best_ask)}
              </span>
            )}
            {currentBestPrices && side === 'sell' && currentBestPrices.best_bid && (
              <span className="block font-medium text-foreground">
                Best bid: {formatPrice(currentBestPrices.best_bid)}
              </span>
            )}
          </div>
        )}

        {/* Quantity input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Quantidade de ações</label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="100"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
          />
          {/* Quick quantity buttons */}
          {side === 'buy' && quickAmounts.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {quickAmounts.map(({ quantity: qty }) => (
                <Button
                  key={qty}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(qty)}
                  className="text-xs h-7"
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
          <div className="rounded-lg bg-muted/30 border border-border/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              Previsão
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço</span>
                <span className="font-medium">{formatPrice(preview.effectivePrice)}/ação</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {side === 'buy' ? 'Custo total' : 'Você recebe'}
                </span>
                <span className="font-medium">{formatBRL(preview.cost)}</span>
              </div>
              {side === 'buy' && (
                <>
                  <div className="h-px bg-border/50 my-1" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Se ganhar</span>
                    <span className="font-bold">{formatBRL(preview.winnings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lucro</span>
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
                </>
              )}
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
            'w-full text-base font-bold',
            side === 'buy'
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
              {side === 'buy' ? 'Comprar' : 'Vender'} {outcomeName}
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

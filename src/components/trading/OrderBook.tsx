'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { type OrderBook as OrderBookType, formatPrice } from '@/lib/utils/orderbook'
import { Loader2 } from 'lucide-react'

interface OrderBookProps {
  orderBook: OrderBookType | null
  isLoading?: boolean
  outcome: boolean // true=YES, false=NO
  onPriceClick?: (price: number, side: 'buy' | 'sell') => void
  maxDepth?: number
}

export function OrderBook({
  orderBook,
  isLoading,
  outcome,
  onPriceClick,
  maxDepth = 5
}: OrderBookProps) {
  // Processar dados para exibição
  const { bids, asks, maxQuantity } = useMemo(() => {
    if (!orderBook) return { bids: [], asks: [], maxQuantity: 0 }

    const bidsSlice = orderBook.bids.slice(0, maxDepth)
    const asksSlice = orderBook.asks.slice(0, maxDepth)

    // Reverter asks para mostrar do maior pro menor (mais perto do spread no meio)
    const asksReversed = [...asksSlice].reverse()

    const allQuantities = [
      ...bidsSlice.map(b => b.quantity),
      ...asksSlice.map(a => a.quantity)
    ]
    const max = Math.max(...allQuantities, 1)

    return {
      bids: bidsSlice,
      asks: asksReversed,
      maxQuantity: max
    }
  }, [orderBook, maxDepth])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!orderBook || (bids.length === 0 && asks.length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Sem ordens no book
      </div>
    )
  }

  const outcomeName = outcome ? 'SIM' : 'NÃO'

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground px-2 pb-1 border-b border-border/50">
        <span>Preço</span>
        <span className="text-right">Qtd</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (vendas) - vermelho */}
      <div className="space-y-0.5">
        {asks.map((level, i) => (
          <OrderBookRow
            key={`ask-${level.price}`}
            price={level.price}
            quantity={level.quantity}
            cumulativeQuantity={level.cumulative_quantity}
            maxQuantity={maxQuantity}
            side="sell"
            onClick={() => onPriceClick?.(level.price, 'buy')} // Clicar em ask = quero comprar
          />
        ))}
      </div>

      {/* Spread */}
      {orderBook.spread !== null && orderBook.midPrice !== null && (
        <div className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded text-xs">
          <span className="text-muted-foreground">Spread</span>
          <span className="font-medium">{formatPrice(orderBook.spread)}</span>
          <span className="text-muted-foreground">Mid</span>
          <span className="font-medium">{formatPrice(orderBook.midPrice)}</span>
        </div>
      )}

      {/* Bids (compras) - verde */}
      <div className="space-y-0.5">
        {bids.map((level, i) => (
          <OrderBookRow
            key={`bid-${level.price}`}
            price={level.price}
            quantity={level.quantity}
            cumulativeQuantity={level.cumulative_quantity}
            maxQuantity={maxQuantity}
            side="buy"
            onClick={() => onPriceClick?.(level.price, 'sell')} // Clicar em bid = quero vender
          />
        ))}
      </div>

      {/* Footer com info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
        <span>Ações {outcomeName}</span>
        <span>
          {bids.length} bids / {orderBook.asks.length} asks
        </span>
      </div>
    </div>
  )
}

interface OrderBookRowProps {
  price: number
  quantity: number
  cumulativeQuantity: number
  maxQuantity: number
  side: 'buy' | 'sell'
  onClick?: () => void
}

function OrderBookRow({
  price,
  quantity,
  cumulativeQuantity,
  maxQuantity,
  side,
  onClick
}: OrderBookRowProps) {
  const barWidth = (quantity / maxQuantity) * 100
  const isBuy = side === 'buy'

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full grid grid-cols-3 gap-2 px-2 py-0.5 text-xs rounded transition-colors',
        'hover:bg-muted/50 cursor-pointer',
        isBuy ? 'text-emerald-500' : 'text-rose-500'
      )}
    >
      {/* Background bar */}
      <div
        className={cn(
          'absolute inset-y-0 h-full opacity-20 rounded',
          isBuy ? 'bg-emerald-500 right-0' : 'bg-rose-500 left-0'
        )}
        style={{
          width: `${barWidth}%`,
          [isBuy ? 'right' : 'left']: 0
        }}
      />

      {/* Content */}
      <span className="relative font-medium">{formatPrice(price)}</span>
      <span className="relative text-right font-mono">{quantity.toFixed(0)}</span>
      <span className="relative text-right font-mono text-muted-foreground">
        {cumulativeQuantity.toFixed(0)}
      </span>
    </button>
  )
}

/**
 * Versão compacta do order book para mostrar apenas best bid/ask
 */
export function OrderBookCompact({
  bestBid,
  bestAsk,
  bidQuantity,
  askQuantity,
  outcome,
  onBidClick,
  onAskClick
}: {
  bestBid: number | null
  bestAsk: number | null
  bidQuantity: number | null
  askQuantity: number | null
  outcome: boolean
  onBidClick?: () => void
  onAskClick?: () => void
}) {
  const spread = bestBid && bestAsk ? bestAsk - bestBid : null
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : null

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Best Bid */}
      <button
        onClick={onBidClick}
        disabled={!bestBid}
        className={cn(
          'flex flex-col items-center px-3 py-1 rounded',
          'bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors',
          !bestBid && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="text-xs text-muted-foreground">Compra</span>
        <span className="font-bold text-emerald-500">
          {bestBid ? formatPrice(bestBid) : '-'}
        </span>
        {bidQuantity && (
          <span className="text-xs text-muted-foreground">{bidQuantity} ações</span>
        )}
      </button>

      {/* Spread indicator */}
      <div className="flex flex-col items-center text-xs text-muted-foreground">
        {spread !== null && (
          <>
            <span>Spread</span>
            <span className="font-medium">{formatPrice(spread)}</span>
          </>
        )}
      </div>

      {/* Best Ask */}
      <button
        onClick={onAskClick}
        disabled={!bestAsk}
        className={cn(
          'flex flex-col items-center px-3 py-1 rounded',
          'bg-rose-500/10 hover:bg-rose-500/20 transition-colors',
          !bestAsk && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="text-xs text-muted-foreground">Venda</span>
        <span className="font-bold text-rose-500">
          {bestAsk ? formatPrice(bestAsk) : '-'}
        </span>
        {askQuantity && (
          <span className="text-xs text-muted-foreground">{askQuantity} ações</span>
        )}
      </button>
    </div>
  )
}

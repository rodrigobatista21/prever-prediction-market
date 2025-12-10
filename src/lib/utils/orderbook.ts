/**
 * Order Book utilities and types
 * Sistema de order book para mercados de previsão
 */

// =====================================================
// TYPES
// =====================================================

export interface Order {
  id: string
  market_id: string
  user_id: string
  outcome: boolean // true=YES, false=NO
  side: 'buy' | 'sell'
  order_type: 'limit' | 'market'
  price: number | null
  quantity: number
  filled_quantity: number
  avg_fill_price: number | null
  status: 'open' | 'partial' | 'filled' | 'cancelled'
  is_platform_order: boolean
  created_at: string
  updated_at: string
}

export interface OrderFill {
  id: string
  market_id: string
  buy_order_id: string
  sell_order_id: string
  buyer_id: string
  seller_id: string
  outcome: boolean
  price: number
  quantity: number
  created_at: string
}

export interface UserShares {
  id: string
  market_id: string
  user_id: string
  outcome: boolean
  quantity: number
  avg_cost: number | null
  realized_pnl: number
}

export interface OrderBookLevel {
  price: number
  quantity: number
  cumulative_quantity: number
  order_count: number
}

export interface OrderBook {
  bids: OrderBookLevel[] // Ordenado por preço DESC
  asks: OrderBookLevel[] // Ordenado por preço ASC
  spread: number | null
  midPrice: number | null
}

export interface BestPrices {
  best_bid: number | null
  best_ask: number | null
  bid_quantity: number | null
  ask_quantity: number | null
}

export interface PlaceOrderResult {
  success: boolean
  error?: string
  order_id?: string
  filled_quantity?: number
  remaining_quantity?: number
  avg_price?: number
  total_cost?: number
  status?: 'open' | 'partial' | 'filled'
}

export interface UserPosition {
  market_id: string
  market_title: string
  market_status: 'open' | 'won' | 'lost'
  outcome: boolean
  quantity: number
  avg_cost: number | null
  current_value: number
  unrealized_pnl: number
}

export interface TradeHistoryItem {
  id: string
  market_id: string
  market_title: string
  outcome: boolean
  side: 'buy' | 'sell'
  price: number
  quantity: number
  total: number
  created_at: string
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calcula o spread do order book
 */
export function calculateSpread(bestBid: number | null, bestAsk: number | null): number | null {
  if (bestBid === null || bestAsk === null) return null
  return bestAsk - bestBid
}

/**
 * Calcula o mid price
 */
export function calculateMidPrice(bestBid: number | null, bestAsk: number | null): number | null {
  if (bestBid === null || bestAsk === null) return null
  return (bestBid + bestAsk) / 2
}

/**
 * Formata preço para exibição (em centavos)
 */
export function formatPrice(price: number): string {
  return `${(price * 100).toFixed(1)}¢`
}

/**
 * Formata preço em reais
 */
export function formatPriceBRL(price: number): string {
  return `R$ ${price.toFixed(2)}`
}

/**
 * Calcula retorno potencial
 * Se comprar a $0.80 e ganhar, recebe $1.00
 * ROI = (1 - 0.80) / 0.80 = 25%
 */
export function calculatePotentialReturn(price: number): number {
  if (price <= 0 || price >= 1) return 0
  return (1 - price) / price
}

/**
 * Calcula multiplicador (payout)
 * Se comprar a $0.80, multiplicador = 1/0.80 = 1.25x
 */
export function calculateMultiplier(price: number): number {
  if (price <= 0) return 0
  return 1 / price
}

/**
 * Calcula custo total de uma ordem
 */
export function calculateOrderCost(price: number, quantity: number): number {
  return price * quantity
}

/**
 * Calcula quanto você ganha se o outcome for correto
 */
export function calculatePotentialWinnings(quantity: number): number {
  // Cada ação vale R$1 se ganhar
  return quantity
}

/**
 * Estima execução de ordem market
 * Simula quanto você pagaria/receberia dado o order book atual
 */
export function estimateMarketOrder(
  orderBook: OrderBook,
  side: 'buy' | 'sell',
  quantity: number
): {
  feasible: boolean
  avgPrice: number
  totalCost: number
  filledQuantity: number
} {
  const levels = side === 'buy' ? orderBook.asks : orderBook.bids

  let remaining = quantity
  let totalCost = 0
  let filledQuantity = 0

  for (const level of levels) {
    if (remaining <= 0) break

    const fillQty = Math.min(remaining, level.quantity)
    totalCost += fillQty * level.price
    filledQuantity += fillQty
    remaining -= fillQty
  }

  return {
    feasible: remaining <= 0,
    avgPrice: filledQuantity > 0 ? totalCost / filledQuantity : 0,
    totalCost,
    filledQuantity
  }
}

/**
 * Transforma dados brutos do Supabase em OrderBook estruturado
 */
export function parseOrderBookData(
  data: Array<{
    side: string
    price: number
    quantity: number
    cumulative_quantity: number
    order_count: number
  }>
): OrderBook {
  const bids: OrderBookLevel[] = []
  const asks: OrderBookLevel[] = []

  for (const row of data) {
    const level: OrderBookLevel = {
      price: Number(row.price),
      quantity: Number(row.quantity),
      cumulative_quantity: Number(row.cumulative_quantity),
      order_count: Number(row.order_count)
    }

    if (row.side === 'buy') {
      bids.push(level)
    } else {
      asks.push(level)
    }
  }

  // Ordenar: bids DESC, asks ASC
  bids.sort((a, b) => b.price - a.price)
  asks.sort((a, b) => a.price - b.price)

  const bestBid = bids.length > 0 ? bids[0].price : null
  const bestAsk = asks.length > 0 ? asks[0].price : null

  return {
    bids,
    asks,
    spread: calculateSpread(bestBid, bestAsk),
    midPrice: calculateMidPrice(bestBid, bestAsk)
  }
}

/**
 * Converte preço YES para preço NO
 * Se YES = 0.80, NO = 0.20
 */
export function yesToNoPrice(yesPrice: number): number {
  return 1 - yesPrice
}

/**
 * Converte preço NO para preço YES
 */
export function noToYesPrice(noPrice: number): number {
  return 1 - noPrice
}

/**
 * Calculos CPMM (Constant Product Market Maker)
 *
 * IMPORTANTE: Estes calculos devem ser IDENTICOS aos do servidor (stored procedures).
 * A logica real de transacao roda no PostgreSQL, mas o preview deve mostrar valores exatos.
 *
 * Modelo: Constant Product AMM
 * - k = pool_yes * pool_no (constante durante trade)
 * - Comprar SIM: adiciona ao pool_yes, remove do pool_no (mantendo k)
 * - Comprar NAO: adiciona ao pool_no, remove do pool_yes (mantendo k)
 * - Shares recebidas = diferenca no pool oposto
 *
 * Formula de preco (probabilidade):
 * - Preco SIM = pool_yes / (pool_yes + pool_no)
 * - Preco NAO = pool_no / (pool_yes + pool_no)
 */

export interface MarketPools {
  poolYes: number
  poolNo: number
}

export interface TradePreview {
  sharesOut: number
  pricePerShare: number
  priceImpact: number
  newOdds: {
    yes: number
    no: number
  }
  estimatedReturn: number
  roi: number
  /** Slippage: diferenca percentual entre preco spot e preco medio efetivo */
  slippage: number
  /** Nivel de severidade do slippage */
  slippageLevel: 'low' | 'medium' | 'high' | 'extreme'
}

/** Limites de slippage para avisos */
export const SLIPPAGE_THRESHOLDS = {
  low: 0.05,      // 5% - normal
  medium: 0.15,   // 15% - aviso amarelo
  high: 0.30,     // 30% - aviso vermelho
  extreme: 0.50,  // 50% - bloquear ou aviso forte
} as const

/**
 * Determina o nivel de severidade do slippage
 */
export function getSlippageLevel(slippage: number): 'low' | 'medium' | 'high' | 'extreme' {
  const absSlippage = Math.abs(slippage)
  if (absSlippage >= SLIPPAGE_THRESHOLDS.extreme) return 'extreme'
  if (absSlippage >= SLIPPAGE_THRESHOLDS.high) return 'high'
  if (absSlippage >= SLIPPAGE_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/**
 * Calcula a probabilidade/preco do SIM
 * Preco SIM = pool_yes / (pool_yes + pool_no)
 *
 * Logica: Quanto mais dinheiro apostado em SIM, maior a probabilidade de SIM.
 */
export function calculateYesPrice(pools: MarketPools): number {
  const { poolYes, poolNo } = pools
  const total = poolYes + poolNo
  if (total === 0) return 0.5
  return poolYes / total
}

/**
 * Calcula a probabilidade/preco do NAO
 * Preco NAO = pool_no / (pool_yes + pool_no)
 *
 * Logica: Quanto mais dinheiro apostado em NAO, maior a probabilidade de NAO.
 */
export function calculateNoPrice(pools: MarketPools): number {
  const { poolYes, poolNo } = pools
  const total = poolYes + poolNo
  if (total === 0) return 0.5
  return poolNo / total
}

/**
 * Calcula ambas as probabilidades
 */
export function calculateOdds(pools: MarketPools): { yes: number; no: number } {
  return {
    yes: calculateYesPrice(pools),
    no: calculateNoPrice(pools),
  }
}

/**
 * Calcula o valor de k (constante do CPMM)
 */
export function calculateK(pools: MarketPools): number {
  return pools.poolYes * pools.poolNo
}

/**
 * Calcula liquidez total do mercado
 */
export function calculateTotalLiquidity(pools: MarketPools): number {
  return pools.poolYes + pools.poolNo
}

/**
 * Preview de compra de acoes SIM usando Constant Product AMM
 *
 * Logica identica ao servidor (rpc_buy_shares):
 * 1. k = pool_yes * pool_no (constante)
 * 2. new_pool_yes = pool_yes + amount
 * 3. new_pool_no = k / new_pool_yes
 * 4. shares_out = pool_no - new_pool_no
 *
 * @param pools Estado atual dos pools
 * @param amount Valor em BRL a investir
 * @returns Preview da transacao
 */
export function previewBuyYes(pools: MarketPools, amount: number): TradePreview {
  const { poolYes, poolNo } = pools

  // Preco spot antes (para calculo de slippage)
  const spotPrice = calculateYesPrice(pools)

  // Constant Product: k = x * y
  const k = poolYes * poolNo

  // Novos pools apos a compra (mantendo k constante)
  const newPoolYes = poolYes + amount
  const newPoolNo = k / newPoolYes

  // Shares = diferenca no pool oposto
  const sharesOut = poolNo - newPoolNo

  // Preco medio efetivo (quanto pagou por share)
  const pricePerShare = sharesOut > 0 ? amount / sharesOut : 0

  // Novo preco apos a compra
  const newTotal = newPoolYes + newPoolNo
  const priceAfter = newPoolYes / newTotal

  // Cada share vale R$ 1,00 se ganhar
  const estimatedReturn = sharesOut
  const roi = amount > 0 ? (estimatedReturn - amount) / amount : 0

  // Slippage: diferenca entre preco spot e preco medio efetivo
  // Se spot = 0.80 e pricePerShare = 0.95, slippage = (0.95 - 0.80) / 0.80 = 18.75%
  const slippage = spotPrice > 0 ? (pricePerShare - spotPrice) / spotPrice : 0

  return {
    sharesOut,
    pricePerShare,
    priceImpact: priceAfter - spotPrice,
    newOdds: {
      yes: priceAfter,
      no: newPoolNo / newTotal,
    },
    estimatedReturn,
    roi,
    slippage,
    slippageLevel: getSlippageLevel(slippage),
  }
}

/**
 * Preview de compra de acoes NAO usando Constant Product AMM
 *
 * Logica identica ao servidor (rpc_buy_shares com p_outcome=false):
 * 1. k = pool_yes * pool_no (constante)
 * 2. new_pool_no = pool_no + amount
 * 3. new_pool_yes = k / new_pool_no
 * 4. shares_out = pool_yes - new_pool_yes
 */
export function previewBuyNo(pools: MarketPools, amount: number): TradePreview {
  const { poolYes, poolNo } = pools

  // Preco spot antes (para calculo de slippage)
  const spotPrice = calculateNoPrice(pools)

  // Constant Product: k = x * y
  const k = poolYes * poolNo

  // Novos pools apos a compra (mantendo k constante)
  const newPoolNo = poolNo + amount
  const newPoolYes = k / newPoolNo

  // Shares = diferenca no pool oposto
  const sharesOut = poolYes - newPoolYes

  // Preco medio efetivo
  const pricePerShare = sharesOut > 0 ? amount / sharesOut : 0

  // Novo preco apos a compra
  const newTotal = newPoolYes + newPoolNo
  const priceAfter = newPoolNo / newTotal

  // Cada share vale R$ 1,00 se ganhar
  const estimatedReturn = sharesOut
  const roi = amount > 0 ? (estimatedReturn - amount) / amount : 0

  // Slippage: diferenca entre preco spot e preco medio efetivo
  const slippage = spotPrice > 0 ? (pricePerShare - spotPrice) / spotPrice : 0

  return {
    sharesOut,
    pricePerShare,
    priceImpact: priceAfter - spotPrice,
    newOdds: {
      yes: newPoolYes / newTotal,
      no: priceAfter,
    },
    estimatedReturn,
    roi,
    slippage,
    slippageLevel: getSlippageLevel(slippage),
  }
}

/**
 * Preview de compra generica
 */
export function previewBuy(
  pools: MarketPools,
  outcome: boolean,
  amount: number
): TradePreview {
  return outcome
    ? previewBuyYes(pools, amount)
    : previewBuyNo(pools, amount)
}

/**
 * Preview de venda de acoes SIM usando Constant Product AMM
 *
 * Logica identica ao servidor (rpc_sell_shares com p_outcome=true):
 * 1. k = pool_yes * pool_no (constante)
 * 2. new_pool_no = pool_no + shares (devolve shares ao pool)
 * 3. new_pool_yes = k / new_pool_no
 * 4. amount_out = pool_yes - new_pool_yes (recebe BRL)
 */
export function previewSellYes(pools: MarketPools, shares: number): TradePreview {
  const { poolYes, poolNo } = pools

  // Preco spot antes
  const spotPrice = calculateYesPrice(pools)

  // Constant Product: k = x * y
  const k = poolYes * poolNo

  // Vender SIM = adicionar shares ao pool_no
  const newPoolNo = poolNo + shares
  const newPoolYes = k / newPoolNo

  // Valor recebido = diferenca no pool_yes
  const amountOut = poolYes - newPoolYes

  // Preco medio efetivo de venda
  const pricePerShare = shares > 0 ? amountOut / shares : 0

  // Novo preco apos a venda
  const newTotal = newPoolYes + newPoolNo
  const priceAfter = newTotal > 0 ? newPoolYes / newTotal : 0

  // Slippage na venda (negativo = vendeu mais barato que spot)
  const slippage = spotPrice > 0 ? (pricePerShare - spotPrice) / spotPrice : 0

  return {
    sharesOut: amountOut, // Na venda, retorna o BRL recebido
    pricePerShare,
    priceImpact: priceAfter - spotPrice,
    newOdds: {
      yes: priceAfter,
      no: newTotal > 0 ? newPoolNo / newTotal : 0,
    },
    estimatedReturn: amountOut,
    roi: 0, // Nao aplicavel na venda direta
    slippage,
    slippageLevel: getSlippageLevel(slippage),
  }
}

/**
 * Preview de venda de acoes NAO usando Constant Product AMM
 *
 * Logica identica ao servidor (rpc_sell_shares com p_outcome=false):
 * 1. k = pool_yes * pool_no (constante)
 * 2. new_pool_yes = pool_yes + shares (devolve shares ao pool)
 * 3. new_pool_no = k / new_pool_yes
 * 4. amount_out = pool_no - new_pool_no (recebe BRL)
 */
export function previewSellNo(pools: MarketPools, shares: number): TradePreview {
  const { poolYes, poolNo } = pools

  // Preco spot antes
  const spotPrice = calculateNoPrice(pools)

  // Constant Product: k = x * y
  const k = poolYes * poolNo

  // Vender NAO = adicionar shares ao pool_yes
  const newPoolYes = poolYes + shares
  const newPoolNo = k / newPoolYes

  // Valor recebido = diferenca no pool_no
  const amountOut = poolNo - newPoolNo

  // Preco medio efetivo de venda
  const pricePerShare = shares > 0 ? amountOut / shares : 0

  // Novo preco apos a venda
  const newTotal = newPoolYes + newPoolNo
  const priceAfter = newTotal > 0 ? newPoolNo / newTotal : 0

  // Slippage na venda
  const slippage = spotPrice > 0 ? (pricePerShare - spotPrice) / spotPrice : 0

  return {
    sharesOut: amountOut, // Na venda, retorna o BRL recebido
    pricePerShare,
    priceImpact: priceAfter - spotPrice,
    newOdds: {
      yes: newTotal > 0 ? newPoolYes / newTotal : 0,
      no: priceAfter,
    },
    estimatedReturn: amountOut,
    roi: 0,
    slippage,
    slippageLevel: getSlippageLevel(slippage),
  }
}

/**
 * Preview de venda generica
 */
export function previewSell(
  pools: MarketPools,
  outcome: boolean,
  shares: number
): TradePreview {
  return outcome
    ? previewSellYes(pools, shares)
    : previewSellNo(pools, shares)
}

/**
 * Calcula o valor maximo recomendado para manter slippage abaixo do limite
 * Usa busca binaria para encontrar o valor ideal
 *
 * @param pools Estado atual dos pools
 * @param outcome true = SIM, false = NAO
 * @param maxSlippage Slippage maximo aceitavel (ex: 0.15 = 15%)
 * @returns Valor maximo recomendado em BRL
 */
export function calculateMaxRecommendedAmount(
  pools: MarketPools,
  outcome: boolean,
  maxSlippage: number = SLIPPAGE_THRESHOLDS.medium
): number {
  const { poolYes, poolNo } = pools
  const totalLiquidity = poolYes + poolNo

  // Começar com 1% da liquidez e ir aumentando
  let low = 1
  let high = totalLiquidity * 2 // Maximo razoavel
  let result = low

  // Busca binaria para encontrar o maior valor com slippage aceitavel
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const preview = previewBuy(pools, outcome, mid)

    if (preview.slippage <= maxSlippage) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  // Arredondar para valor "bonito"
  if (result >= 1000) {
    return Math.floor(result / 100) * 100 // Arredondar para centena
  } else if (result >= 100) {
    return Math.floor(result / 10) * 10 // Arredondar para dezena
  }
  return Math.floor(result)
}

/**
 * Retorna mensagem de aviso baseada no nivel de slippage
 */
export function getSlippageWarning(slippageLevel: TradePreview['slippageLevel']): {
  title: string
  message: string
  severity: 'info' | 'warning' | 'error'
} | null {
  switch (slippageLevel) {
    case 'low':
      return null // Sem aviso
    case 'medium':
      return {
        title: 'Slippage moderado',
        message: 'O valor é alto para a liquidez disponível. Você pagará um preço médio acima do mercado.',
        severity: 'info'
      }
    case 'high':
      return {
        title: 'Slippage alto',
        message: 'Esta operação tem impacto significativo no preço. Considere reduzir o valor.',
        severity: 'warning'
      }
    case 'extreme':
      return {
        title: 'Slippage muito alto',
        message: 'O preço médio está muito acima do mercado. Recomendamos fortemente reduzir o valor.',
        severity: 'error'
      }
  }
}

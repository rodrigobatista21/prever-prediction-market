'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProbabilityBar } from '@/components/ui/probability-bar'
import { formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useAuth, useBalance } from '@/lib/hooks'
import { useOrderBook, usePlaceOrder } from '@/lib/hooks/use-orderbook'
import { calculateMultiplier, formatPrice } from '@/lib/utils/orderbook'
import type { MarketWithOdds } from '@/lib/types/database.types'

interface QuickTradeModalProps {
  market: MarketWithOdds
  isOpen: boolean
  onClose: () => void
  initialOutcome?: boolean
}

export function QuickTradeModal({
  market,
  isOpen,
  onClose,
  initialOutcome = true,
}: QuickTradeModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { balance } = useBalance(user ?? null)

  const [outcome, setOutcome] = useState<boolean>(initialOutcome)
  const [amount, setAmount] = useState<string>('')

  const { bestPrices: yesPrices, isLoading: yesLoading } = useOrderBook(market.id, true)
  const { bestPrices: noPrices, isLoading: noLoading } = useOrderBook(market.id, false)
  const { placeOrder, isLoading: orderLoading, error, clearError } = usePlaceOrder()

  const isLoading = yesLoading || noLoading || orderLoading
  const amountNumber = parseFloat(amount) || 0

  const currentPrices = outcome ? yesPrices : noPrices
  const bestAsk = currentPrices?.best_ask

  // Debug logging - remove after fix
  console.log('[QuickTradeModal] Debug:', {
    marketId: market.id,
    outcome,
    yesPrices,
    noPrices,
    currentPrices,
    bestAsk,
    yesLoading,
    noLoading,
    user: user?.id,
    balance
  })

  // Calculate preview
  const preview = useMemo(() => {
    if (amountNumber <= 0 || !bestAsk || bestAsk <= 0 || bestAsk >= 1) {
      return null
    }

    const cost = amountNumber
    const shares = cost / bestAsk
    const multiplier = calculateMultiplier(bestAsk)
    const potentialReturn = shares

    return {
      effectivePrice: bestAsk,
      cost,
      shares,
      multiplier,
      potentialReturn,
    }
  }, [bestAsk, amountNumber])

  const quickAmounts = [10, 25, 50, 100]

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^\d,\.]/g, '').replace(',', '.')
    setAmount(cleaned)
    clearError()
  }

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString())
    clearError()
  }

  const handleSubmit = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!preview || !bestAsk) return

    const quantity = amountNumber / bestAsk

    const result = await placeOrder(
      market.id,
      outcome,
      'buy',
      'market',
      null,
      quantity
    )

    if (result.success) {
      setAmount('')
      onClose()
    }
  }

  const isDisabled = Boolean(
    isLoading ||
    !user ||
    amountNumber <= 0 ||
    amountNumber > (balance || 0) ||
    !bestAsk
  )

  // Calculate prices for display
  const yesPrice = yesPrices?.best_ask ?? market.odds_yes / 100
  const noPrice = noPrices?.best_ask ?? market.odds_no / 100

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-start justify-between">
            <DialogTitle className="text-base font-semibold leading-tight pr-4">
              {market.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Probability Bar */}
          <ProbabilityBar yesPercent={market.odds_yes} size="md" />

          {/* Outcome Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOutcome(true)}
              className={cn(
                'flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all',
                outcome
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500'
              )}
            >
              <TrendingUp className="w-4 h-4" />
              SIM
              <span className="text-sm opacity-80">
                {formatPrice(yesPrice)}
              </span>
            </button>
            <button
              onClick={() => setOutcome(false)}
              className={cn(
                'flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all',
                !outcome
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500'
              )}
            >
              <TrendingDown className="w-4 h-4" />
              NAO
              <span className="text-sm opacity-80">
                {formatPrice(noPrice)}
              </span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-10 h-12 text-xl font-bold bg-muted/30 border-border/50"
              />
            </div>
            {user && (
              <p className="text-xs text-muted-foreground">
                Saldo: {formatBRL(balance || 0)}
              </p>
            )}
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2">
            {quickAmounts.map((value) => (
              <Button
                key={value}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(value)}
                disabled={user ? value > (balance || 0) : false}
                className={cn(
                  'flex-1 h-9 text-sm font-medium',
                  amount === value.toString() && 'border-primary bg-primary/10'
                )}
              >
                R${value}
              </Button>
            ))}
          </div>

          {/* Preview */}
          {preview && (
            <div className={cn(
              'rounded-lg p-3 space-y-1.5',
              outcome ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            )}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contratos</span>
                <span className="font-medium">{preview.shares.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Multiplicador</span>
                <span className={cn(
                  'font-bold',
                  outcome ? 'text-emerald-500' : 'text-rose-500'
                )}>
                  {preview.multiplier.toFixed(2)}x
                </span>
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-between">
                <span className="text-muted-foreground text-sm">Se ganhar</span>
                <span className="font-bold text-lg">{formatBRL(preview.potentialReturn)}</span>
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

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isDisabled}
            size="lg"
            className={cn(
              'w-full h-12 text-base font-bold transition-all',
              outcome
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-rose-500 hover:bg-rose-600 text-white'
            )}
          >
            {!user ? (
              'Fazer Login para Negociar'
            ) : isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                Comprar {outcome ? 'SIM' : 'NAO'}
                {preview && (
                  <span className="ml-2 opacity-80">
                    • {formatBRL(preview.cost)}
                  </span>
                )}
              </>
            )}
          </Button>

          {/* View Full Market Link */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              onClose()
              router.push(`/mercado/${market.id}`)
            }}
          >
            Ver mercado completo →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

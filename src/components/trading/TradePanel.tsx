'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Info, Sparkles } from 'lucide-react'
import { formatBRL, formatROI, formatShares } from '@/lib/utils/format'
import { previewBuy, type MarketPools } from '@/lib/utils/cpmm'
import { useTrade } from '@/lib/hooks/use-trade'
import { cn } from '@/lib/utils'

interface TradePanelProps {
  marketId: string
  poolYes: number
  poolNo: number
  balance: number
  onTradeSuccess?: () => void
}

const QUICK_AMOUNTS = [10, 25, 50, 100]

export function TradePanel({
  marketId,
  poolYes,
  poolNo,
  balance,
  onTradeSuccess,
}: TradePanelProps) {
  const [outcome, setOutcome] = useState<boolean>(true)
  const [amount, setAmount] = useState<string>('')
  const { buyShares, isLoading, error, clearError } = useTrade()

  const amountNumber = parseFloat(amount) || 0

  const preview = useMemo(() => {
    if (amountNumber < 1) return null
    const pools: MarketPools = { poolYes, poolNo }
    return previewBuy(pools, outcome, amountNumber)
  }, [poolYes, poolNo, outcome, amountNumber])

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
    if (!preview || amountNumber < 1) return

    const result = await buyShares(marketId, outcome, amountNumber)

    if (result?.success) {
      setAmount('')
      onTradeSuccess?.()
    }
  }

  const isDisabled = isLoading || amountNumber < 1 || amountNumber > balance

  // Calculate current price per share (modelo "apostas": mais em SIM = maior prob SIM)
  const currentPrice = outcome
    ? poolYes / (poolYes + poolNo)
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
            {Math.round(poolYes / (poolYes + poolNo) * 100)}%
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
            {Math.round(poolNo / (poolYes + poolNo) * 100)}%
          </span>
        </button>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Amount input */}
        <div className="space-y-3">
          <label className="text-sm text-muted-foreground">Valor</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              R$
            </span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="pl-12 h-14 text-2xl font-bold bg-muted/50 border-border/50 focus:border-primary"
            />
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <Button
                key={value}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(value)}
                disabled={value > balance}
                className={cn(
                  'flex-1 h-9 text-xs font-medium border-border/50',
                  amount === value.toString() && 'border-primary bg-primary/10'
                )}
              >
                R$ {value}
              </Button>
            ))}
          </div>

          {/* Available balance */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saldo disponível</span>
            <button
              onClick={() => handleQuickAmount(Math.floor(balance))}
              className="font-medium text-primary hover:underline"
            >
              {formatBRL(balance)}
            </button>
          </div>
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
                <span className="text-muted-foreground">Ações</span>
                <span className="font-medium">{formatShares(preview.sharesOut)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preço médio</span>
                <span className="font-medium">
                  {formatBRL(preview.pricePerShare)}/ação
                </span>
              </div>
              <div className="h-px bg-border/50 my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Se ganhar</span>
                <span className="font-bold text-lg">
                  {formatBRL(preview.estimatedReturn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ROI</span>
                <span
                  className={cn(
                    'font-bold',
                    preview.roi > 0 ? 'text-emerald-500' : 'text-rose-500'
                  )}
                >
                  {formatROI(preview.roi)}
                </span>
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
              Comprar {outcome ? 'SIM' : 'NÃO'}
              {preview && (
                <span className="ml-2 opacity-80">
                  • {formatShares(preview.sharesOut)} ações
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

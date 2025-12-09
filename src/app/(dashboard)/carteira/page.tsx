'use client'

import { useEffect, useState } from 'react'
import { Wallet, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BalanceDisplay } from '@/components/wallet/BalanceDisplay'
import { DepositModal } from '@/components/wallet/DepositModal'
import { useAuth, useBalance } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import type { LedgerEntry } from '@/lib/types/database.types'
import { formatBRL, formatDateTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

export default function CarteiraPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { balance, isLoading: balanceLoading, refetch } = useBalance(user)
  const [transactions, setTransactions] = useState<LedgerEntry[]>([])
  const [loadingTx, setLoadingTx] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setTransactions(data || [])
      setLoadingTx(false)
    }

    fetchTransactions()
  }, [user, supabase])

  if (authLoading) {
    return <CarteiraSkeleton />
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Faça login para ver sua carteira</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Carteira</h1>

      {/* Balance Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <BalanceDisplay
              balance={balance}
              isLoading={balanceLoading}
              size="lg"
            />
            <DepositModal userId={user.id} onSuccess={refetch} />
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Transações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma transação ainda</p>
              <p className="text-sm text-muted-foreground">
                Faça um depósito para começar a operar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: LedgerEntry }) {
  const isCredit = transaction.amount > 0

  const categoryLabels: Record<string, string> = {
    DEPOSIT: 'Depósito',
    WITHDRAW: 'Saque',
    TRADE: 'Trade',
    PAYOUT: 'Pagamento',
  }

  const categoryColors: Record<string, string> = {
    DEPOSIT: 'bg-emerald-500/10 text-emerald-500',
    WITHDRAW: 'bg-rose-500/10 text-rose-500',
    TRADE: 'bg-blue-500/10 text-blue-500',
    PAYOUT: 'bg-yellow-500/10 text-yellow-500',
  }

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isCredit ? 'bg-emerald-500/10' : 'bg-rose-500/10'
          )}
        >
          {isCredit ? (
            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-rose-500" />
          )}
        </div>
        <div>
          <p className="font-medium">
            {transaction.description || categoryLabels[transaction.category]}
          </p>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn('text-xs', categoryColors[transaction.category])}
            >
              {categoryLabels[transaction.category]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(transaction.created_at)}
            </span>
          </div>
        </div>
      </div>
      <p
        className={cn(
          'font-semibold',
          isCredit ? 'text-emerald-500' : 'text-rose-500'
        )}
      >
        {isCredit ? '+' : ''}{formatBRL(transaction.amount)}
      </p>
    </div>
  )
}

function CarteiraSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-32" />
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

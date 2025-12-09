'use client'

import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Receipt,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PaymentsSummaryCards } from '@/components/admin/PaymentsSummaryCards'
import { ResolvedMarketCard } from '@/components/admin/ResolvedMarketCard'
import { useAuth } from '@/lib/hooks'
import { useAdminPayments } from '@/lib/hooks/use-admin-payments'

export default function AdminPaymentsPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const {
    summary,
    markets,
    isLoading: dataLoading,
    error,
    refetch,
    systemProfit,
    profitMargin,
  } = useAdminPayments()

  // Loading state
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando permissoes...</p>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Voce precisa estar logado para acessar esta pagina.
        </p>
      </div>
    )
  }

  // Not admin
  if (!profile?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Esta area e restrita para administradores.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Relatorio de Pagamentos</h1>
              <p className="text-sm text-muted-foreground">
                Detalhes de todos os mercados resolvidos
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={dataLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {dataLoading && !summary && (
        <Card className="border-border/50">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Carregando relatorio...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <PaymentsSummaryCards
          summary={summary}
          systemProfit={systemProfit}
          profitMargin={profitMargin}
        />
      )}

      {/* Profit Warning */}
      {summary && systemProfit < 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <AlertTitle className="text-amber-500">Atencao: Sistema deficitario</AlertTitle>
          <AlertDescription>
            O sistema pagou mais do que recebeu em apostas. Isso pode indicar um problema
            no calculo CPMM ou que o sistema esta em fase inicial de operacao.
            Prejuizo atual: <strong>{Math.abs(systemProfit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Resolved Markets */}
      {markets.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">
              Mercados Resolvidos ({markets.length})
            </h2>
          </div>
          <div className="space-y-4">
            {markets.map((market) => (
              <ResolvedMarketCard key={market.id} market={market} />
            ))}
          </div>
        </div>
      ) : !dataLoading && (
        <Card className="border-border/50">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum mercado resolvido</h3>
              <p className="text-muted-foreground max-w-md">
                Quando voce resolver mercados, os detalhes de pagamento aparecerao aqui.
              </p>
              <Link href="/admin">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Painel Admin
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

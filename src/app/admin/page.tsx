'use client'

import { ShieldAlert, ShieldCheck, Loader2, Info, Receipt } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CreateMarketForm } from '@/components/admin/CreateMarketForm'
import { AdminMarketList } from '@/components/admin/AdminMarketList'
import { useAuth } from '@/lib/hooks'

export default function AdminPage() {
  const { user, profile, isLoading } = useAuth()

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando permissões...</p>
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
          Você precisa estar logado para acessar esta página.
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
          Esta área é restrita para administradores.
        </p>
        <Card className="mt-4 max-w-md">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Para se tornar admin:</strong>
            </p>
            <p>
              Execute no Supabase SQL Editor:
            </p>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
              UPDATE profiles{'\n'}
              SET is_admin = true{'\n'}
              WHERE id = '{user.id}';
            </pre>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin access granted
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie mercados de previsão
            </p>
          </div>
        </div>
        <Link href="/admin/pagamentos">
          <Card className="border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Receipt className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Relatório de Pagamentos</p>
                <p className="text-xs text-muted-foreground">Ver todos os payouts</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Info Alert */}
      <Alert className="border-primary/50 bg-primary/5">
        <Info className="w-4 h-4 text-primary" />
        <AlertTitle>Como testar o sistema de pagamentos</AlertTitle>
        <AlertDescription className="text-sm space-y-1">
          <p>1. Crie um mercado de teste abaixo</p>
          <p>2. Faça apostas como usuário normal (use outra conta ou aba anônima)</p>
          <p>3. Resolva o mercado clicando em "Resolver SIM" ou "Resolver NÃO"</p>
          <p>4. Verifique se o saldo do usuário vencedor aumentou</p>
        </AlertDescription>
      </Alert>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Create Market */}
        <div>
          <CreateMarketForm />
        </div>

        {/* Market List */}
        <div>
          <AdminMarketList />
        </div>
      </div>
    </div>
  )
}

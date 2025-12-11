'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw, Shield, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataTable, type Column, type Filter } from '@/components/admin/shared/DataTable'
import { useAdminUsers, type AdminUser } from '@/lib/hooks/use-admin-users'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function UsuariosPage() {
  const router = useRouter()
  const { users, isLoading, refresh } = useAdminUsers()

  const columns: Column<AdminUser>[] = [
    {
      key: 'full_name',
      header: 'Usuário',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {(row.full_name || row.email)?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {row.full_name || 'Sem nome'}
              {row.is_admin && (
                <Badge variant="default" className="ml-2 text-[10px]">
                  Admin
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Saldo',
      sortable: true,
      render: (row) => (
        <span
          className={
            row.balance > 0
              ? 'text-emerald-500 font-medium'
              : row.balance < 0
              ? 'text-rose-500 font-medium'
              : ''
          }
        >
          {formatBRL(row.balance)}
        </span>
      ),
    },
    {
      key: 'total_trades',
      header: 'Trades',
      sortable: true,
      render: (row) => (
        <div className="text-sm">
          <p className="font-medium">{row.total_trades}</p>
          <p className="text-xs text-muted-foreground">
            {formatBRL(row.total_volume)} volume
          </p>
        </div>
      ),
    },
    {
      key: 'last_activity',
      header: 'Última Atividade',
      sortable: true,
      render: (row) =>
        row.last_activity ? (
          <div className="text-sm">
            <p>
              {formatDistanceToNow(new Date(row.last_activity), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Nunca</span>
        ),
    },
    {
      key: 'created_at',
      header: 'Cadastro',
      sortable: true,
      render: (row) => (
        <div className="text-sm">
          <p>{format(new Date(row.created_at), 'dd/MM/yyyy')}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(row.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      ),
    },
    {
      key: 'is_admin',
      header: 'Role',
      sortable: true,
      render: (row) =>
        row.is_admin ? (
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <ShieldOff className="h-3 w-3" />
            Usuário
          </Badge>
        ),
    },
  ]

  const filters: Filter[] = [
    {
      key: 'is_admin',
      label: 'Role',
      options: [
        { value: 'true', label: 'Admin' },
        { value: 'false', label: 'Usuário' },
      ],
    },
  ]

  // Transform for filter compatibility
  const rows = users.map((u) => ({
    ...u,
    is_admin: String(u.is_admin),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie todos os usuários da plataforma
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total de Usuários</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold">{users.filter((u) => u.is_admin).length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Saldo Total</p>
          <p className="text-2xl font-bold text-emerald-500">
            {formatBRL(users.reduce((sum, u) => sum + u.balance, 0))}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Volume Total</p>
          <p className="text-2xl font-bold">
            {formatBRL(users.reduce((sum, u) => sum + u.total_volume, 0))}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={rows as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        filters={filters}
        searchPlaceholder="Buscar por nome ou email..."
        searchKeys={['full_name', 'email']}
        isLoading={isLoading}
        emptyMessage="Nenhum usuário encontrado"
      />
    </div>
  )
}

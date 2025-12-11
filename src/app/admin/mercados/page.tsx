'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ExternalLink, Gavel, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, type Column, type Filter } from '@/components/admin/shared/DataTable'
import { useMarkets } from '@/lib/hooks'
import { useAdmin } from '@/lib/hooks/use-admin'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface MarketRow {
  id: string
  title: string
  category: string
  status: 'open' | 'pending' | 'resolved_yes' | 'resolved_no'
  ends_at: string
  created_at: string | null
  pool_yes: number
  pool_no: number
  outcome: boolean | null
  probability: number
}

const categoryLabels: Record<string, string> = {
  politica: 'Política',
  economia: 'Economia',
  esportes: 'Esportes',
  entretenimento: 'Entretenimento',
  tecnologia: 'Tecnologia',
  internacional: 'Internacional',
  outros: 'Outros',
}

function getStatusInfo(market: MarketRow) {
  if (market.outcome === true) {
    return { label: 'SIM', variant: 'default' as const, color: 'text-emerald-500' }
  }
  if (market.outcome === false) {
    return { label: 'NÃO', variant: 'destructive' as const, color: 'text-rose-500' }
  }
  if (new Date(market.ends_at) < new Date()) {
    return { label: 'Pendente', variant: 'secondary' as const, color: 'text-amber-500' }
  }
  return { label: 'Aberto', variant: 'outline' as const, color: 'text-blue-500' }
}

export default function MercadosPage() {
  const router = useRouter()
  const { markets, isLoading: marketsLoading, refetch } = useMarkets()
  const { resolveMarket, isLoading: resolving } = useAdmin()
  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean
    marketId: string
    title: string
    outcome: boolean | null
  }>({ open: false, marketId: '', title: '', outcome: null })

  // Transform markets to table rows
  const rows: MarketRow[] = markets.map((m) => {
    const poolTotal = m.pool_yes + m.pool_no
    return {
      id: m.id,
      title: m.title,
      category: m.category || 'outros',
      status:
        m.outcome === true
          ? 'resolved_yes'
          : m.outcome === false
          ? 'resolved_no'
          : new Date(m.ends_at) < new Date()
          ? 'pending'
          : 'open',
      ends_at: m.ends_at,
      created_at: m.created_at,
      pool_yes: m.pool_yes,
      pool_no: m.pool_no,
      outcome: m.outcome,
      probability: poolTotal > 0 ? Math.round((m.pool_yes / poolTotal) * 100) : 50,
    }
  })

  const handleResolve = async (outcome: boolean) => {
    const result = await resolveMarket(resolveDialog.marketId, outcome)
    if (result) {
      toast.success(`Mercado resolvido como ${outcome ? 'SIM' : 'NÃO'}`)
      refetch()
    }
    setResolveDialog({ open: false, marketId: '', title: '', outcome: null })
  }

  const columns: Column<MarketRow>[] = [
    {
      key: 'title',
      header: 'Mercado',
      sortable: true,
      render: (row) => (
        <div className="max-w-[300px]">
          <p className="font-medium truncate">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            Criado {row.created_at ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ptBR }) : 'N/A'}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {categoryLabels[row.category] || row.category}
        </Badge>
      ),
    },
    {
      key: 'probability',
      header: 'Probabilidade',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${row.probability}%` }}
            />
          </div>
          <span className="text-sm font-medium">{row.probability}%</span>
        </div>
      ),
    },
    {
      key: 'ends_at',
      header: 'Encerra',
      sortable: true,
      render: (row) => (
        <div className="text-sm">
          <p>{format(new Date(row.ends_at), 'dd/MM/yyyy HH:mm')}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(row.ends_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const info = getStatusInfo(row)
        return (
          <Badge variant={info.variant} className={info.color}>
            {info.label}
          </Badge>
        )
      },
    },
  ]

  const filters: Filter[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'open', label: 'Aberto' },
        { value: 'pending', label: 'Pendente' },
        { value: 'resolved_yes', label: 'Resolvido SIM' },
        { value: 'resolved_no', label: 'Resolvido NÃO' },
      ],
    },
    {
      key: 'category',
      label: 'Categoria',
      options: Object.entries(categoryLabels).map(([value, label]) => ({
        value,
        label,
      })),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mercados</h1>
          <p className="text-muted-foreground">
            Gerencie todos os mercados de previsão
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/mercados/criar">
            <Plus className="h-4 w-4 mr-2" />
            Criar Mercado
          </Link>
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={rows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Buscar mercados..."
        searchKeys={['title']}
        isLoading={marketsLoading}
        emptyMessage="Nenhum mercado encontrado"
        onRowClick={(row) => router.push(`/mercados/${row.id}`)}
        rowClassName={(row) =>
          row.status === 'pending' ? 'bg-amber-500/5' : ''
        }
        actions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/mercados/${row.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Mercado
                </Link>
              </DropdownMenuItem>
              {row.outcome === null && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      setResolveDialog({
                        open: true,
                        marketId: row.id,
                        title: row.title,
                        outcome: true,
                      })
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                    Resolver SIM
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setResolveDialog({
                        open: true,
                        marketId: row.id,
                        title: row.title,
                        outcome: false,
                      })
                    }
                  >
                    <XCircle className="h-4 w-4 mr-2 text-rose-500" />
                    Resolver NÃO
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Resolve Dialog */}
      <AlertDialog
        open={resolveDialog.open}
        onOpenChange={(open) =>
          setResolveDialog({ ...resolveDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolver Mercado</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a resolver o mercado:</p>
              <p className="font-medium text-foreground">&quot;{resolveDialog.title}&quot;</p>
              <p>
                Resultado:{' '}
                <span
                  className={
                    resolveDialog.outcome
                      ? 'text-emerald-500 font-bold'
                      : 'text-rose-500 font-bold'
                  }
                >
                  {resolveDialog.outcome ? 'SIM' : 'NÃO'}
                </span>
              </p>
              <p className="text-amber-500 mt-4">
                Esta ação é irreversível. Os vencedores receberão seus pagamentos automaticamente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResolve(resolveDialog.outcome!)}
              disabled={resolving}
              className={
                resolveDialog.outcome
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-rose-500 hover:bg-rose-600'
              }
            >
              {resolving ? 'Resolvendo...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

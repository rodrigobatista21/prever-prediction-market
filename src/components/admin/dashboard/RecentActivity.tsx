'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Gavel, PlusCircle } from 'lucide-react'
import type { RecentActivity as RecentActivityType } from '@/lib/hooks/use-admin-stats'
import { cn } from '@/lib/utils'

interface RecentActivityProps {
  activities: RecentActivityType[]
  isLoading: boolean
}

const typeConfig = {
  trade: {
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Trade',
  },
  deposit: {
    icon: ArrowDownRight,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    label: 'Depósito',
  },
  withdrawal: {
    icon: ArrowUpRight,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    label: 'Saque',
  },
  market_created: {
    icon: PlusCircle,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    label: 'Mercado Criado',
  },
  market_resolved: {
    icon: Gavel,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: 'Mercado Resolvido',
  },
}

function ActivityItem({ activity }: { activity: RecentActivityType }) {
  const config = typeConfig[activity.type]
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className={cn('p-2 rounded-lg shrink-0', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{activity.userName}</span>
          <Badge variant="outline" className="text-[10px] px-1.5">
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(activity.createdAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
      {activity.amount !== undefined && (
        <div className={cn(
          'text-sm font-medium shrink-0',
          activity.amount > 0 ? 'text-emerald-500' : 'text-rose-500'
        )}>
          {activity.amount > 0 ? '+' : ''}
          R$ {Math.abs(activity.amount).toFixed(2)}
        </div>
      )}
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {isLoading ? (
            <>
              {[...Array(8)].map((_, i) => (
                <ActivitySkeleton key={i} />
              ))}
            </>
          ) : activities.length > 0 ? (
            activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface OddsHistoryPoint {
  id: string
  market_id: string
  odds_yes: number
  odds_no: number
  pool_yes: number
  pool_no: number
  recorded_at: string
}

interface ChartDataPoint {
  time: string
  fullTime: string
  sim: number
  nao: number
}

interface OddsChartProps {
  marketId: string
  className?: string
}

export function OddsChart({ marketId, className }: OddsChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchHistory = async () => {
      setIsLoading(true)
      setError(null)

      const { data: history, error: fetchError } = await supabase
        .from('odds_history')
        .select('*')
        .eq('market_id', marketId)
        .order('recorded_at', { ascending: true })
        .limit(100)

      if (fetchError) {
        setError('Erro ao carregar histórico')
        setIsLoading(false)
        return
      }

      const chartData: ChartDataPoint[] = (history as OddsHistoryPoint[]).map((point) => ({
        time: formatTimeLabel(point.recorded_at),
        fullTime: formatDate(point.recorded_at),
        sim: Math.round(Number(point.odds_yes) * 100),
        nao: Math.round(Number(point.odds_no) * 100),
      }))

      setData(chartData)
      setIsLoading(false)
    }

    fetchHistory()

    // Real-time subscription
    subscriptionRef.current = supabase
      .channel(`odds_history_${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'odds_history',
          filter: `market_id=eq.${marketId}`,
        },
        (payload) => {
          const newPoint = payload.new as OddsHistoryPoint
          setData((prev) => [
            ...prev,
            {
              time: formatTimeLabel(newPoint.recorded_at),
              fullTime: formatDate(newPoint.recorded_at),
              sim: Math.round(Number(newPoint.odds_yes) * 100),
              nao: Math.round(Number(newPoint.odds_no) * 100),
            },
          ])
        }
      )
      .subscribe()

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [marketId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Histórico de Probabilidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Histórico de Probabilidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length < 2) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Histórico de Probabilidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm text-center">
            O gráfico aparecerá após mais negociações neste mercado.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-4 h-4 text-primary" />
          Histórico de Probabilidades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullTime
                }
                return ''
              }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === 'sim' ? 'SIM' : 'NÃO'
              ]}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (value === 'sim' ? 'SIM' : 'NÃO')}
            />
            <Line
              type="monotone"
              dataKey="sim"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(142, 76%, 36%)' }}
            />
            <Line
              type="monotone"
              dataKey="nao"
              stroke="hsl(346, 77%, 50%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(346, 77%, 50%)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function formatTimeLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
}

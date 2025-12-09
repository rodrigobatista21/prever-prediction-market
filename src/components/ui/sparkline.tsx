'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  className?: string
  color?: 'green' | 'red' | 'auto'
  showArea?: boolean
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  className,
  color = 'auto',
  showArea = true,
}: SparklineProps) {
  const { path, areaPath, strokeColor, fillColor, trend } = useMemo(() => {
    if (!data.length) return { path: '', areaPath: '', strokeColor: '', fillColor: '', trend: 0 }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    // Normalize data to fit in the height
    const padding = 2
    const effectiveHeight = height - padding * 2
    const stepX = width / (data.length - 1 || 1)

    const points = data.map((value, index) => {
      const x = index * stepX
      const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight
      return { x, y }
    })

    // Create SVG path
    const linePath = points
      .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ')

    // Create area path (for gradient fill)
    const areaPathStr = `${linePath} L ${width} ${height} L 0 ${height} Z`

    // Determine color based on trend
    const firstValue = data[0]
    const lastValue = data[data.length - 1]
    const trendValue = ((lastValue - firstValue) / firstValue) * 100

    let stroke = ''
    let fill = ''

    if (color === 'auto') {
      if (trendValue >= 0) {
        stroke = 'stroke-emerald-500'
        fill = 'fill-emerald-500/20'
      } else {
        stroke = 'stroke-rose-500'
        fill = 'fill-rose-500/20'
      }
    } else if (color === 'green') {
      stroke = 'stroke-emerald-500'
      fill = 'fill-emerald-500/20'
    } else {
      stroke = 'stroke-rose-500'
      fill = 'fill-rose-500/20'
    }

    return {
      path: linePath,
      areaPath: areaPathStr,
      strokeColor: stroke,
      fillColor: fill,
      trend: trendValue,
    }
  }, [data, width, height, color])

  if (!data.length || data.length < 2) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-foreground/50', className)}
        style={{ width, height }}
      >
        <svg width={width} height={height} className="opacity-30">
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        </svg>
      </div>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      {showArea && (
        <path
          d={areaPath}
          className={cn(fillColor, 'transition-all duration-300')}
        />
      )}
      <path
        d={path}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(strokeColor, 'transition-all duration-300')}
      />
    </svg>
  )
}

// Generate mock sparkline data for demo purposes
export function generateMockSparklineData(baseValue: number, points: number = 12): number[] {
  const data: number[] = []
  let current = baseValue

  for (let i = 0; i < points; i++) {
    // Random walk with slight trend towards current value
    const change = (Math.random() - 0.5) * 10
    current = Math.max(5, Math.min(95, current + change))
    data.push(current)
  }

  // End closer to the base value
  data[data.length - 1] = baseValue + (Math.random() - 0.5) * 5

  return data
}

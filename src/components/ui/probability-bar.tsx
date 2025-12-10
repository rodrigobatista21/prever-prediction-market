'use client'

import { cn } from '@/lib/utils'

interface ProbabilityBarProps {
  yesPercent: number
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  animated?: boolean
  className?: string
}

export function ProbabilityBar({
  yesPercent,
  size = 'md',
  showLabels = true,
  animated = true,
  className,
}: ProbabilityBarProps) {
  const noPercent = 100 - yesPercent
  const yesRounded = Math.round(yesPercent)
  const noRounded = Math.round(noPercent)

  const heights = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Labels above bar */}
      {showLabels && (
        <div className="flex justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className={cn('font-bold text-emerald-500', textSizes[size])}>
              Sim {yesRounded}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('font-bold text-rose-500', textSizes[size])}>
              {noRounded}% Nao
            </span>
          </div>
        </div>
      )}

      {/* Bar */}
      <div className={cn('w-full rounded-full overflow-hidden flex', heights[size], 'bg-muted')}>
        {/* Yes portion */}
        <div
          className={cn(
            'bg-emerald-500 rounded-l-full',
            animated && 'transition-all duration-500 ease-out',
            yesPercent >= 100 && 'rounded-r-full'
          )}
          style={{ width: `${yesPercent}%` }}
        />
        {/* No portion */}
        <div
          className={cn(
            'bg-rose-500 rounded-r-full',
            animated && 'transition-all duration-500 ease-out',
            noPercent >= 100 && 'rounded-l-full'
          )}
          style={{ width: `${noPercent}%` }}
        />
      </div>
    </div>
  )
}

// Compact version for card headers
interface ProbabilityBarCompactProps {
  yesPercent: number
  className?: string
}

export function ProbabilityBarCompact({ yesPercent, className }: ProbabilityBarCompactProps) {
  return (
    <div className={cn('w-full h-1.5 rounded-full overflow-hidden flex bg-muted/50', className)}>
      <div
        className="bg-emerald-500 transition-all duration-500 ease-out"
        style={{ width: `${yesPercent}%` }}
      />
      <div
        className="bg-rose-500 transition-all duration-500 ease-out"
        style={{ width: `${100 - yesPercent}%` }}
      />
    </div>
  )
}

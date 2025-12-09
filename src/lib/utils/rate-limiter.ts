/**
 * Simple in-memory rate limiter for client-side protection
 * For production, consider using Upstash Ratelimit with Redis
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
}

// Different limits for different actions
export const RATE_LIMITS = {
  trade: { maxRequests: 10, windowMs: 60000 },      // 10 trades/min
  deposit: { maxRequests: 5, windowMs: 60000 },     // 5 deposits/min
  auth: { maxRequests: 5, windowMs: 300000 },       // 5 auth attempts/5min
  general: { maxRequests: 30, windowMs: 60000 },    // 30 requests/min
} as const

export type RateLimitAction = keyof typeof RATE_LIMITS

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
}

export function checkRateLimit(
  identifier: string,
  action: RateLimitAction = 'general'
): RateLimitResult {
  const config = RATE_LIMITS[action] || DEFAULT_CONFIG
  const key = `${action}:${identifier}`
  const now = Date.now()

  // Clean up expired entries periodically
  if (Math.random() < 0.1) {
    cleanupExpiredEntries()
  }

  const entry = rateLimitStore.get(key)

  // No entry or expired - create new
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    }
  }

  // Increment counter
  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  }
}

function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Helper hook for React components
export function formatRateLimitError(resetIn: number): string {
  const seconds = Math.ceil(resetIn / 1000)
  if (seconds < 60) {
    return `Muitas tentativas. Aguarde ${seconds} segundos.`
  }
  const minutes = Math.ceil(seconds / 60)
  return `Muitas tentativas. Aguarde ${minutes} minuto${minutes > 1 ? 's' : ''}.`
}

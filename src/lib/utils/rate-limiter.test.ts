import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkRateLimit,
  formatRateLimitError,
  RATE_LIMITS,
  type RateLimitAction,
} from './rate-limiter'

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit('user-123', 'trade')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMITS.trade.maxRequests - 1)
    })

    it('should track requests per identifier', () => {
      // User 1 makes requests
      checkRateLimit('user-1', 'trade')
      checkRateLimit('user-1', 'trade')
      const user1Result = checkRateLimit('user-1', 'trade')

      // User 2 should have fresh limit
      const user2Result = checkRateLimit('user-2', 'trade')

      expect(user1Result.remaining).toBe(RATE_LIMITS.trade.maxRequests - 3)
      expect(user2Result.remaining).toBe(RATE_LIMITS.trade.maxRequests - 1)
    })

    it('should block when limit exceeded', () => {
      const identifier = 'user-block-test'
      const maxRequests = RATE_LIMITS.trade.maxRequests

      // Make max requests
      for (let i = 0; i < maxRequests; i++) {
        const result = checkRateLimit(identifier, 'trade')
        expect(result.allowed).toBe(true)
      }

      // Next request should be blocked
      const blockedResult = checkRateLimit(identifier, 'trade')
      expect(blockedResult.allowed).toBe(false)
      expect(blockedResult.remaining).toBe(0)
    })

    it('should reset after window expires', () => {
      const identifier = 'user-reset-test'
      const windowMs = RATE_LIMITS.trade.windowMs

      // Use all requests
      for (let i = 0; i < RATE_LIMITS.trade.maxRequests; i++) {
        checkRateLimit(identifier, 'trade')
      }

      // Should be blocked
      expect(checkRateLimit(identifier, 'trade').allowed).toBe(false)

      // Advance time past window
      vi.advanceTimersByTime(windowMs + 1)

      // Should be allowed again
      const result = checkRateLimit(identifier, 'trade')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMITS.trade.maxRequests - 1)
    })

    it('should use correct limits for different actions', () => {
      const actions: RateLimitAction[] = ['trade', 'deposit', 'auth', 'general']

      actions.forEach((action) => {
        const result = checkRateLimit(`user-${action}`, action)
        expect(result.remaining).toBe(RATE_LIMITS[action].maxRequests - 1)
      })
    })

    it('should separate limits by action type', () => {
      const identifier = 'user-multi-action'

      // Trade action
      checkRateLimit(identifier, 'trade')
      checkRateLimit(identifier, 'trade')

      // Deposit action should have separate counter
      const depositResult = checkRateLimit(identifier, 'deposit')
      expect(depositResult.remaining).toBe(RATE_LIMITS.deposit.maxRequests - 1)

      // Trade should still reflect 2 requests
      const tradeResult = checkRateLimit(identifier, 'trade')
      expect(tradeResult.remaining).toBe(RATE_LIMITS.trade.maxRequests - 3)
    })

    it('should return correct resetIn time', () => {
      const identifier = 'user-reset-time'
      const windowMs = RATE_LIMITS.trade.windowMs

      const result = checkRateLimit(identifier, 'trade')
      expect(result.resetIn).toBe(windowMs)

      // Advance time by half window
      vi.advanceTimersByTime(windowMs / 2)

      const result2 = checkRateLimit(identifier, 'trade')
      expect(result2.resetIn).toBeCloseTo(windowMs / 2, -2) // ~30000ms
    })

    it('should handle trade rate limit (10/min)', () => {
      const identifier = 'trade-limit-test'

      // Should allow 10 trades
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(identifier, 'trade').allowed).toBe(true)
      }

      // 11th should be blocked
      expect(checkRateLimit(identifier, 'trade').allowed).toBe(false)
    })

    it('should handle deposit rate limit (5/min)', () => {
      const identifier = 'deposit-limit-test'

      // Should allow 5 deposits
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(identifier, 'deposit').allowed).toBe(true)
      }

      // 6th should be blocked
      expect(checkRateLimit(identifier, 'deposit').allowed).toBe(false)
    })

    it('should handle auth rate limit (5/5min)', () => {
      const identifier = 'auth-limit-test'

      // Should allow 5 auth attempts
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(identifier, 'auth').allowed).toBe(true)
      }

      // 6th should be blocked
      expect(checkRateLimit(identifier, 'auth').allowed).toBe(false)

      // After 1 minute, still blocked (window is 5 min)
      vi.advanceTimersByTime(60000)
      expect(checkRateLimit(identifier, 'auth').allowed).toBe(false)

      // After 5 minutes total, should be allowed
      vi.advanceTimersByTime(240001) // 4 more minutes + 1ms
      expect(checkRateLimit(identifier, 'auth').allowed).toBe(true)
    })

    it('should use general limit as default', () => {
      const identifier = 'general-test'
      const result = checkRateLimit(identifier, 'general')

      expect(result.remaining).toBe(RATE_LIMITS.general.maxRequests - 1)
    })
  })

  describe('formatRateLimitError', () => {
    it('should format seconds correctly', () => {
      expect(formatRateLimitError(5000)).toBe('Muitas tentativas. Aguarde 5 segundos.')
      expect(formatRateLimitError(30000)).toBe('Muitas tentativas. Aguarde 30 segundos.')
      expect(formatRateLimitError(59000)).toBe('Muitas tentativas. Aguarde 59 segundos.')
    })

    it('should format single minute correctly', () => {
      expect(formatRateLimitError(60000)).toBe('Muitas tentativas. Aguarde 1 minuto.')
      expect(formatRateLimitError(61000)).toBe('Muitas tentativas. Aguarde 2 minutos.')
    })

    it('should format multiple minutes correctly', () => {
      expect(formatRateLimitError(120000)).toBe('Muitas tentativas. Aguarde 2 minutos.')
      expect(formatRateLimitError(180000)).toBe('Muitas tentativas. Aguarde 3 minutos.')
      expect(formatRateLimitError(300000)).toBe('Muitas tentativas. Aguarde 5 minutos.')
    })

    it('should round up seconds', () => {
      expect(formatRateLimitError(1500)).toBe('Muitas tentativas. Aguarde 2 segundos.')
      expect(formatRateLimitError(100)).toBe('Muitas tentativas. Aguarde 1 segundos.')
    })

    it('should round up minutes', () => {
      expect(formatRateLimitError(90000)).toBe('Muitas tentativas. Aguarde 2 minutos.')
    })
  })

  describe('RATE_LIMITS configuration', () => {
    it('should have correct trade limits', () => {
      expect(RATE_LIMITS.trade).toEqual({
        maxRequests: 10,
        windowMs: 60000,
      })
    })

    it('should have correct deposit limits', () => {
      expect(RATE_LIMITS.deposit).toEqual({
        maxRequests: 5,
        windowMs: 60000,
      })
    })

    it('should have correct auth limits', () => {
      expect(RATE_LIMITS.auth).toEqual({
        maxRequests: 5,
        windowMs: 300000,
      })
    })

    it('should have correct general limits', () => {
      expect(RATE_LIMITS.general).toEqual({
        maxRequests: 30,
        windowMs: 60000,
      })
    })
  })
})

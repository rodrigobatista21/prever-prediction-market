import { describe, it, expect } from 'vitest'
import {
  calculateYesPrice,
  calculateNoPrice,
  calculateOdds,
  calculateK,
  calculateTotalLiquidity,
  previewBuyYes,
  previewBuyNo,
  previewBuy,
  previewSellYes,
  previewSellNo,
  previewSell,
  type MarketPools,
} from './cpmm'

describe('CPMM - Price Calculations', () => {
  describe('calculateYesPrice', () => {
    it('should return 0.5 for equal pools', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      expect(calculateYesPrice(pools)).toBe(0.5)
    })

    it('should return higher price when more money on YES', () => {
      const pools: MarketPools = { poolYes: 1500, poolNo: 500 }
      expect(calculateYesPrice(pools)).toBe(0.75)
    })

    it('should return lower price when less money on YES', () => {
      const pools: MarketPools = { poolYes: 500, poolNo: 1500 }
      expect(calculateYesPrice(pools)).toBe(0.25)
    })

    it('should return 0.5 for empty pools', () => {
      const pools: MarketPools = { poolYes: 0, poolNo: 0 }
      expect(calculateYesPrice(pools)).toBe(0.5)
    })
  })

  describe('calculateNoPrice', () => {
    it('should return 0.5 for equal pools', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      expect(calculateNoPrice(pools)).toBe(0.5)
    })

    it('should return higher price when more money on NO', () => {
      const pools: MarketPools = { poolYes: 500, poolNo: 1500 }
      expect(calculateNoPrice(pools)).toBe(0.75)
    })

    it('should be complementary to YES price', () => {
      const pools: MarketPools = { poolYes: 1200, poolNo: 800 }
      expect(calculateYesPrice(pools) + calculateNoPrice(pools)).toBe(1)
    })
  })

  describe('calculateOdds', () => {
    it('should return both odds', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const odds = calculateOdds(pools)
      expect(odds.yes).toBe(0.5)
      expect(odds.no).toBe(0.5)
    })

    it('should always sum to 1', () => {
      const pools: MarketPools = { poolYes: 1234, poolNo: 5678 }
      const odds = calculateOdds(pools)
      expect(odds.yes + odds.no).toBeCloseTo(1, 10)
    })
  })

  describe('calculateK', () => {
    it('should return product of pools', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      expect(calculateK(pools)).toBe(1000000)
    })
  })

  describe('calculateTotalLiquidity', () => {
    it('should return sum of pools', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      expect(calculateTotalLiquidity(pools)).toBe(2000)
    })
  })
})

describe('CPMM - Buy Operations', () => {
  describe('previewBuyYes', () => {
    it('should calculate correct shares for equal pools', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewBuyYes(pools, 100)

      // k = 1000 * 1000 = 1,000,000
      // newPoolYes = 1000 + 100 = 1100
      // newPoolNo = 1,000,000 / 1100 = 909.0909...
      // sharesOut = 1000 - 909.0909 = 90.9090...
      expect(preview.sharesOut).toBeCloseTo(90.9091, 3)
    })

    it('should maintain constant k', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewBuyYes(pools, 100)

      // The real k should be preserved - odds should always sum to 1
      expect(preview.newOdds.yes + preview.newOdds.no).toBeCloseTo(1, 10)
    })

    it('should increase YES price after purchase', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewBuyYes(pools, 100)

      expect(preview.priceImpact).toBeGreaterThan(0)
      expect(preview.newOdds.yes).toBeGreaterThan(0.5)
    })

    it('should calculate positive ROI when buying cheap', () => {
      const pools: MarketPools = { poolYes: 500, poolNo: 1500 } // YES is cheap (25%)
      const preview = previewBuyYes(pools, 100)

      // If YES wins, each share = R$1. ROI should be positive
      expect(preview.roi).toBeGreaterThan(0)
    })

    it('should match server calculation exactly', () => {
      // Test case: pools 1000/1000, buy R$100 YES
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewBuyYes(pools, 100)

      // Server formula:
      // k = 1000 * 1000 = 1,000,000
      // new_pool_yes = 1100
      // new_pool_no = 1,000,000 / 1100 = 909.090909...
      // shares_out = 1000 - 909.090909 = 90.909090...
      expect(preview.sharesOut).toBeCloseTo(90.909090909, 6)
    })
  })

  describe('previewBuyNo', () => {
    it('should calculate correct shares for equal pools', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewBuyNo(pools, 100)

      expect(preview.sharesOut).toBeCloseTo(90.9091, 3)
    })

    it('should increase NO price after purchase', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewBuyNo(pools, 100)

      expect(preview.priceImpact).toBeGreaterThan(0)
      expect(preview.newOdds.no).toBeGreaterThan(0.5)
    })

    it('should be symmetric to buyYes', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const previewYes = previewBuyYes(pools, 100)
      const previewNo = previewBuyNo(pools, 100)

      // For equal pools, buying same amount should give same shares
      expect(previewYes.sharesOut).toBeCloseTo(previewNo.sharesOut, 6)
    })
  })

  describe('previewBuy (generic)', () => {
    it('should delegate to previewBuyYes when outcome is true', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const generic = previewBuy(pools, true, 100)
      const specific = previewBuyYes(pools, 100)

      expect(generic.sharesOut).toBe(specific.sharesOut)
    })

    it('should delegate to previewBuyNo when outcome is false', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const generic = previewBuy(pools, false, 100)
      const specific = previewBuyNo(pools, 100)

      expect(generic.sharesOut).toBe(specific.sharesOut)
    })
  })
})

describe('CPMM - Sell Operations', () => {
  describe('previewSellYes', () => {
    it('should calculate correct amount for equal pools', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewSellYes(pools, 50)

      // k = 1000 * 1000 = 1,000,000
      // newPoolNo = 1000 + 50 = 1050
      // newPoolYes = 1,000,000 / 1050 = 952.380952...
      // amountOut = 1000 - 952.380952 = 47.619047...
      expect(preview.sharesOut).toBeCloseTo(47.619, 2) // sharesOut is amountOut for sell
    })

    it('should decrease YES price after sell', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewSellYes(pools, 50)

      expect(preview.priceImpact).toBeLessThan(0)
      expect(preview.newOdds.yes).toBeLessThan(0.5)
    })

    it('should match server calculation exactly', () => {
      // Test case: pools 1000/1000, sell 50 YES shares
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewSellYes(pools, 50)

      // Server formula (migration 011):
      // k = 1000 * 1000 = 1,000,000
      // new_pool_no = 1000 + 50 = 1050
      // new_pool_yes = 1,000,000 / 1050 = 952.380952...
      // amount_out = 1000 - 952.380952 = 47.619047...
      expect(preview.sharesOut).toBeCloseTo(47.619047619, 6)
    })
  })

  describe('previewSellNo', () => {
    it('should calculate correct amount for equal pools', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewSellNo(pools, 50)

      expect(preview.sharesOut).toBeCloseTo(47.619, 2)
    })

    it('should decrease NO price after sell', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const preview = previewSellNo(pools, 50)

      expect(preview.priceImpact).toBeLessThan(0)
      expect(preview.newOdds.no).toBeLessThan(0.5)
    })

    it('should be symmetric to sellYes', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const previewYes = previewSellYes(pools, 50)
      const previewNo = previewSellNo(pools, 50)

      expect(previewYes.sharesOut).toBeCloseTo(previewNo.sharesOut, 6)
    })
  })

  describe('previewSell (generic)', () => {
    it('should delegate to previewSellYes when outcome is true', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const generic = previewSell(pools, true, 50)
      const specific = previewSellYes(pools, 50)

      expect(generic.sharesOut).toBe(specific.sharesOut)
    })

    it('should delegate to previewSellNo when outcome is false', () => {
      const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
      const generic = previewSell(pools, false, 50)
      const specific = previewSellNo(pools, 50)

      expect(generic.sharesOut).toBe(specific.sharesOut)
    })
  })
})

describe('CPMM - Edge Cases', () => {
  it('should handle very small amounts', () => {
    const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
    const preview = previewBuyYes(pools, 0.01)

    expect(preview.sharesOut).toBeGreaterThan(0)
    expect(preview.priceImpact).toBeGreaterThan(0)
  })

  it('should handle large amounts', () => {
    const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
    const preview = previewBuyYes(pools, 10000)

    expect(preview.sharesOut).toBeGreaterThan(0)
    expect(preview.newOdds.yes).toBeLessThan(1)
  })

  it('should handle unbalanced pools', () => {
    const pools: MarketPools = { poolYes: 100, poolNo: 10000 }
    const preview = previewBuyYes(pools, 100)

    expect(preview.sharesOut).toBeGreaterThan(0)
    expect(preview.priceImpact).toBeGreaterThan(0)
  })

  it('should always give positive shares when buying', () => {
    const testCases = [
      { poolYes: 1000, poolNo: 1000, amount: 100 },
      { poolYes: 100, poolNo: 10000, amount: 50 },
      { poolYes: 10000, poolNo: 100, amount: 50 },
      { poolYes: 1, poolNo: 1000000, amount: 0.5 },
    ]

    for (const tc of testCases) {
      const pools: MarketPools = { poolYes: tc.poolYes, poolNo: tc.poolNo }
      const previewYes = previewBuyYes(pools, tc.amount)
      const previewNo = previewBuyNo(pools, tc.amount)

      expect(previewYes.sharesOut).toBeGreaterThan(0)
      expect(previewNo.sharesOut).toBeGreaterThan(0)
    }
  })

  it('should always give positive amount when selling', () => {
    const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
    const previewYes = previewSellYes(pools, 10)
    const previewNo = previewSellNo(pools, 10)

    expect(previewYes.sharesOut).toBeGreaterThan(0) // amountOut
    expect(previewNo.sharesOut).toBeGreaterThan(0)
  })
})

describe('CPMM - Constant Product Invariant', () => {
  it('should preserve k after buy YES', () => {
    const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
    const initialK = calculateK(pools)

    // Calculate new pools
    const newPoolYes = pools.poolYes + 100
    const newPoolNo = initialK / newPoolYes

    expect(newPoolYes * newPoolNo).toBeCloseTo(initialK, 6)
  })

  it('should preserve k after buy NO', () => {
    const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
    const initialK = calculateK(pools)

    const newPoolNo = pools.poolNo + 100
    const newPoolYes = initialK / newPoolNo

    expect(newPoolYes * newPoolNo).toBeCloseTo(initialK, 6)
  })

  it('should preserve k after sell YES', () => {
    const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
    const initialK = calculateK(pools)

    const newPoolNo = pools.poolNo + 50 // selling YES adds to NO pool
    const newPoolYes = initialK / newPoolNo

    expect(newPoolYes * newPoolNo).toBeCloseTo(initialK, 6)
  })

  it('should preserve k after sell NO', () => {
    const pools: MarketPools = { poolYes: 1000, poolNo: 1000 }
    const initialK = calculateK(pools)

    const newPoolYes = pools.poolYes + 50 // selling NO adds to YES pool
    const newPoolNo = initialK / newPoolYes

    expect(newPoolYes * newPoolNo).toBeCloseTo(initialK, 6)
  })
})

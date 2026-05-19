import { describe, it, expect } from 'bun:test'
import {
  calculateCommission,
  getCommissionRate,
  monthsBetween,
} from '../src/lib/commission'

describe('getCommissionRate', () => {
  it('returns 10% in year 1', () => {
    expect(getCommissionRate(0)).toBe(0.1)
    expect(getCommissionRate(11)).toBe(0.1)
  })
  it('returns 5% in year 2', () => {
    expect(getCommissionRate(12)).toBe(0.05)
    expect(getCommissionRate(23)).toBe(0.05)
  })
  it('returns 3% in year 3', () => {
    expect(getCommissionRate(24)).toBe(0.03)
    expect(getCommissionRate(35)).toBe(0.03)
  })
  it('returns 1% from year 4 onward', () => {
    expect(getCommissionRate(36)).toBe(0.01)
    expect(getCommissionRate(120)).toBe(0.01)
  })
})

describe('monthsBetween', () => {
  it('counts whole months only', () => {
    expect(
      monthsBetween(new Date('2024-01-15T00:00:00Z'), new Date('2024-02-15T00:00:00Z')),
    ).toBe(1)
    expect(
      monthsBetween(new Date('2024-01-15T00:00:00Z'), new Date('2024-02-14T00:00:00Z')),
    ).toBe(0)
    expect(
      monthsBetween(new Date('2024-01-15T00:00:00Z'), new Date('2025-01-15T00:00:00Z')),
    ).toBe(12)
  })
  it('never returns negative months', () => {
    expect(
      monthsBetween(new Date('2025-01-01T00:00:00Z'), new Date('2024-01-01T00:00:00Z')),
    ).toBe(0)
  })
})

describe('calculateCommission', () => {
  const contractStart = new Date('2024-01-01T00:00:00Z')

  it('takes 10% on a Y1 enterprise deal', () => {
    const b = calculateCommission(
      10_000_00,
      contractStart,
      new Date('2024-06-01T00:00:00Z'),
    )
    expect(b.rate).toBe(0.1)
    expect(b.commissionCents).toBe(1_000_00)
    expect(b.vendorPayoutCents).toBe(9_000_00)
  })

  it('drops to 5% in Y2', () => {
    const b = calculateCommission(
      10_000_00,
      contractStart,
      new Date('2025-06-01T00:00:00Z'),
    )
    expect(b.rate).toBe(0.05)
    expect(b.commissionCents).toBe(500_00)
    expect(b.vendorPayoutCents).toBe(9_500_00)
  })

  it('drops to 3% in Y3', () => {
    const b = calculateCommission(
      10_000_00,
      contractStart,
      new Date('2026-06-01T00:00:00Z'),
    )
    expect(b.rate).toBe(0.03)
  })

  it('drops to 1% in Y4 and beyond', () => {
    const b = calculateCommission(
      10_000_00,
      contractStart,
      new Date('2027-06-01T00:00:00Z'),
    )
    expect(b.rate).toBe(0.01)
    const b2 = calculateCommission(
      10_000_00,
      contractStart,
      new Date('2034-01-01T00:00:00Z'),
    )
    expect(b2.rate).toBe(0.01)
  })

  it('rejects negative or non-integer amounts', () => {
    expect(() => calculateCommission(-1, contractStart)).toThrow()
    expect(() => calculateCommission(1.5, contractStart)).toThrow()
  })

  it('payout + commission always equals total', () => {
    const tests = [100, 1_000, 10_000, 99_99, 1_000_000]
    for (const amount of tests) {
      const b = calculateCommission(amount, contractStart)
      expect(b.commissionCents + b.vendorPayoutCents).toBe(amount)
    }
  })
})

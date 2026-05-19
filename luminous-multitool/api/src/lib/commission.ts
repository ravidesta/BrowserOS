// Luminous marketplace commission engine.
//
// Enterprise deals only. Subscription revenue ($99/yr, $299/mo) pays no
// commission — that's the flat platform fee, not a take rate.
//
// Schedule (months since the vendor's contract start):
//   Y1  (0–12 mo):   10%
//   Y2  (12–24 mo):  5%
//   Y3  (24–36 mo):  3%
//   Y4+ (36+ mo):    1%

export interface CommissionTier {
  readonly months: number
  readonly rate: number
}

export const COMMISSION_SCHEDULE: readonly CommissionTier[] = [
  { months: 12, rate: 0.1 },
  { months: 24, rate: 0.05 },
  { months: 36, rate: 0.03 },
]

export const POST_TERM_RATE = 0.01

export function monthsBetween(start: Date, end: Date): number {
  const yearDiff = end.getUTCFullYear() - start.getUTCFullYear()
  const monthDiff = end.getUTCMonth() - start.getUTCMonth()
  const dayDiff = end.getUTCDate() - start.getUTCDate()
  let months = yearDiff * 12 + monthDiff
  if (dayDiff < 0) months -= 1
  return Math.max(0, months)
}

export function getCommissionRate(monthsSinceContractStart: number): number {
  for (const tier of COMMISSION_SCHEDULE) {
    if (monthsSinceContractStart < tier.months) return tier.rate
  }
  return POST_TERM_RATE
}

export interface CommissionBreakdown {
  amountCents: number
  rate: number
  commissionCents: number
  vendorPayoutCents: number
  monthsSinceContractStart: number
}

export function calculateCommission(
  amountCents: number,
  contractStart: Date,
  dealAt: Date = new Date(),
): CommissionBreakdown {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error('amountCents must be a non-negative integer')
  }
  const monthsSinceContractStart = monthsBetween(contractStart, dealAt)
  const rate = getCommissionRate(monthsSinceContractStart)
  const commissionCents = Math.floor(amountCents * rate)
  return {
    amountCents,
    rate,
    commissionCents,
    vendorPayoutCents: amountCents - commissionCents,
    monthsSinceContractStart,
  }
}

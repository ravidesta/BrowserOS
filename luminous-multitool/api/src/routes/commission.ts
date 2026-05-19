import { Hono } from 'hono'
import { z } from 'zod'
import { calculateCommission } from '../lib/commission'
import { sql } from '../lib/db'

export const commission = new Hono()

const PreviewSchema = z.object({
  vendorId: z.string().uuid(),
  amountCents: z.number().int().nonnegative(),
  dealAt: z.string().datetime().optional(),
})

commission.post('/preview', async (c) => {
  const body = await c.req.json()
  const parsed = PreviewSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const [vendor] = await sql`
    SELECT contract_start_at FROM vendors WHERE id = ${parsed.data.vendorId} LIMIT 1
  `
  if (!vendor) return c.json({ error: 'vendor not found' }, 404)

  const dealAt = parsed.data.dealAt ? new Date(parsed.data.dealAt) : new Date()
  const breakdown = calculateCommission(
    parsed.data.amountCents,
    new Date(vendor.contract_start_at),
    dealAt,
  )
  return c.json(breakdown)
})

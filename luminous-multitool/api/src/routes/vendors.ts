import { Hono } from 'hono'
import { z } from 'zod'
import { sql } from '../lib/db'

export const vendors = new Hono()

const CreateSchema = z.object({
  displayName: z.string().min(1).max(200),
  forgejoUserId: z.number().int().positive().optional(),
})

vendors.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)
  const [row] = await sql`
    INSERT INTO vendors (display_name, forgejo_user_id)
    VALUES (${parsed.data.displayName}, ${parsed.data.forgejoUserId ?? null})
    RETURNING *
  `
  return c.json({ vendor: row }, 201)
})

vendors.get('/', async (c) => {
  const rows = await sql`SELECT * FROM vendors ORDER BY created_at DESC LIMIT 100`
  return c.json({ vendors: rows })
})

vendors.get('/:id', async (c) => {
  const [row] = await sql`SELECT * FROM vendors WHERE id = ${c.req.param('id')} LIMIT 1`
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json({ vendor: row })
})

vendors.get('/:id/dashboard', async (c) => {
  const id = c.req.param('id')
  const [vendor] = await sql`SELECT * FROM vendors WHERE id = ${id} LIMIT 1`
  if (!vendor) return c.json({ error: 'not found' }, 404)

  const listings = await sql`
    SELECT * FROM listings WHERE vendor_id = ${id} ORDER BY created_at DESC LIMIT 100
  `
  const deals = await sql`
    SELECT id, listing_id, buyer_email, amount_cents, commission_rate,
           commission_cents, vendor_payout_cents, status, completed_at, created_at
    FROM deals WHERE vendor_id = ${id} ORDER BY created_at DESC LIMIT 50
  `
  const [totals] = await sql`
    SELECT
      COALESCE(SUM(amount_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS gross_cents,
      COALESCE(SUM(commission_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS commission_cents,
      COALESCE(SUM(vendor_payout_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS payout_cents,
      COUNT(*) FILTER (WHERE status = 'completed') AS deal_count
    FROM deals WHERE vendor_id = ${id}
  `
  return c.json({ vendor, listings, deals, totals })
})

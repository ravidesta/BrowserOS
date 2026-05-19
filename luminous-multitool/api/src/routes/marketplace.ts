import { Hono } from 'hono'
import { z } from 'zod'
import { sql } from '../lib/db'

export const marketplace = new Hono()

const CreateListingSchema = z.object({
  vendorId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  isEnterprise: z.boolean().default(false),
  forgejoRepoUrl: z.string().url().optional(),
})

const UpdateListingSchema = CreateListingSchema.partial().extend({
  active: z.boolean().optional(),
})

marketplace.get('/listings', async (c) => {
  const onlyActive = c.req.query('active') !== 'false'
  const rows = await sql`
    SELECT l.*, v.display_name AS vendor_name
    FROM listings l
    JOIN vendors v ON v.id = l.vendor_id
    ${onlyActive ? sql`WHERE l.active = TRUE` : sql``}
    ORDER BY l.created_at DESC
    LIMIT 100
  `
  return c.json({ listings: rows })
})

marketplace.get('/listings/:id', async (c) => {
  const rows = await sql`
    SELECT l.*, v.display_name AS vendor_name
    FROM listings l
    JOIN vendors v ON v.id = l.vendor_id
    WHERE l.id = ${c.req.param('id')}
    LIMIT 1
  `
  if (rows.length === 0) return c.json({ error: 'not found' }, 404)
  return c.json({ listing: rows[0] })
})

marketplace.post('/listings', async (c) => {
  const body = await c.req.json()
  const parsed = CreateListingSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }
  const data = parsed.data
  const [row] = await sql`
    INSERT INTO listings (vendor_id, title, description, price_cents, is_enterprise, forgejo_repo_url)
    VALUES (
      ${data.vendorId},
      ${data.title},
      ${data.description ?? null},
      ${data.priceCents},
      ${data.isEnterprise},
      ${data.forgejoRepoUrl ?? null}
    )
    RETURNING *
  `
  return c.json({ listing: row }, 201)
})

marketplace.patch('/listings/:id', async (c) => {
  const body = await c.req.json()
  const parsed = UpdateListingSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }
  const data = parsed.data
  const [row] = await sql`
    UPDATE listings SET
      title = COALESCE(${data.title ?? null}, title),
      description = COALESCE(${data.description ?? null}, description),
      price_cents = COALESCE(${data.priceCents ?? null}, price_cents),
      is_enterprise = COALESCE(${data.isEnterprise ?? null}, is_enterprise),
      forgejo_repo_url = COALESCE(${data.forgejoRepoUrl ?? null}, forgejo_repo_url),
      active = COALESCE(${data.active ?? null}, active)
    WHERE id = ${c.req.param('id')}
    RETURNING *
  `
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json({ listing: row })
})

marketplace.delete('/listings/:id', async (c) => {
  const [row] = await sql`
    UPDATE listings SET active = FALSE
    WHERE id = ${c.req.param('id')}
    RETURNING id
  `
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json({ id: row.id, deactivated: true })
})

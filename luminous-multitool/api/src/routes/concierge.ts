import { Hono } from 'hono'
import { z } from 'zod'
import { calculateCommission } from '../lib/commission'
import { sql } from '../lib/db'
import { stampHash } from '../lib/timestamp'

// HTTP-MCP-style tool surface for the Luminous AI concierge.
// An LLM client lists tools, then invokes them by name with JSON args.
//
//   GET  /concierge/tools          -> { tools: [...] }
//   POST /concierge/invoke/:tool   -> { result } | { error }

export const concierge = new Hono()

const TOOLS = [
  {
    name: 'list_marketplace_listings',
    description:
      'List active marketplace listings, newest first. Use this when the user wants to browse what is for sale.',
    parameters: z.object({
      limit: z.number().int().min(1).max(50).default(20),
    }),
  },
  {
    name: 'get_listing',
    description: 'Get full details for a single listing by id.',
    parameters: z.object({ listingId: z.string().uuid() }),
  },
  {
    name: 'preview_commission',
    description:
      'Show what marketplace commission would apply to a deal of a given size with a given vendor. Use before quoting a deal.',
    parameters: z.object({
      vendorId: z.string().uuid(),
      amountCents: z.number().int().nonnegative(),
    }),
  },
  {
    name: 'get_vendor_summary',
    description:
      'Get a vendor profile plus aggregate stats (active listings, completed deals, total payout).',
    parameters: z.object({ vendorId: z.string().uuid() }),
  },
  {
    name: 'stamp_artifact',
    description:
      'Anchor an artifact hash to the Bitcoin blockchain via OpenTimestamps. Use when the user wants proof-of-existence (legal admissibility, IP protection, contract dates). Final BTC confirmation takes about 6 hours; the proof is returned immediately.',
    parameters: z.object({
      artifactType: z.string().min(1),
      artifactId: z.string().min(1),
      sha256Hex: z.string().regex(/^[0-9a-f]{64}$/i),
    }),
  },
] as const

concierge.get('/tools', (c) =>
  c.json({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries((t.parameters as z.ZodObject<z.ZodRawShape>).shape).map(
            ([k, v]) => [k, { type: zodTypeName(v as z.ZodTypeAny) }],
          ),
        ),
      },
    })),
  }),
)

concierge.post('/invoke/:tool', async (c) => {
  const toolName = c.req.param('tool')
  const tool = TOOLS.find((t) => t.name === toolName)
  if (!tool) return c.json({ error: `unknown tool: ${toolName}` }, 404)

  const body = await c.req.json().catch(() => ({}))
  const parsed = (tool.parameters as z.ZodTypeAny).safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  switch (toolName) {
    case 'list_marketplace_listings': {
      const args = parsed.data as { limit: number }
      const rows = await sql`
        SELECT l.id, l.title, l.description, l.price_cents, l.is_enterprise,
               v.display_name AS vendor_name
        FROM listings l
        JOIN vendors v ON v.id = l.vendor_id
        WHERE l.active = TRUE
        ORDER BY l.created_at DESC
        LIMIT ${args.limit}
      `
      return c.json({ result: { listings: rows } })
    }
    case 'get_listing': {
      const args = parsed.data as { listingId: string }
      const [row] = await sql`
        SELECT l.*, v.display_name AS vendor_name
        FROM listings l JOIN vendors v ON v.id = l.vendor_id
        WHERE l.id = ${args.listingId}
        LIMIT 1
      `
      if (!row) return c.json({ error: 'listing not found' }, 404)
      return c.json({ result: row })
    }
    case 'preview_commission': {
      const args = parsed.data as { vendorId: string; amountCents: number }
      const [vendor] = await sql`
        SELECT contract_start_at FROM vendors WHERE id = ${args.vendorId} LIMIT 1
      `
      if (!vendor) return c.json({ error: 'vendor not found' }, 404)
      const breakdown = calculateCommission(
        args.amountCents,
        new Date(vendor.contract_start_at),
      )
      return c.json({ result: breakdown })
    }
    case 'get_vendor_summary': {
      const args = parsed.data as { vendorId: string }
      const [vendor] = await sql`
        SELECT * FROM vendors WHERE id = ${args.vendorId} LIMIT 1
      `
      if (!vendor) return c.json({ error: 'vendor not found' }, 404)
      const [stats] = await sql`
        SELECT
          (SELECT COUNT(*) FROM listings WHERE vendor_id = ${vendor.id} AND active = TRUE)::int AS active_listings,
          (SELECT COUNT(*) FROM deals WHERE vendor_id = ${vendor.id} AND status = 'completed')::int AS completed_deals,
          COALESCE((SELECT SUM(vendor_payout_cents) FROM deals WHERE vendor_id = ${vendor.id} AND status = 'completed'), 0)::bigint AS total_payout_cents
      `
      return c.json({ result: { vendor, stats } })
    }
    case 'stamp_artifact': {
      const args = parsed.data as {
        artifactType: string
        artifactId: string
        sha256Hex: string
      }
      const otsBytes = await stampHash(args.sha256Hex)
      const [row] = await sql`
        INSERT INTO timestamps (artifact_type, artifact_id, sha256_hex, ots_bytes)
        VALUES (${args.artifactType}, ${args.artifactId}, ${args.sha256Hex}, ${otsBytes})
        ON CONFLICT (artifact_type, artifact_id) DO UPDATE
          SET sha256_hex = EXCLUDED.sha256_hex,
              ots_bytes = EXCLUDED.ots_bytes,
              verified = FALSE,
              btc_height = NULL,
              btc_time = NULL
        RETURNING id, artifact_type, artifact_id, sha256_hex, created_at
      `
      return c.json({
        result: {
          ...row,
          pending: true,
          note: 'Bitcoin confirmation takes ~6 hours. Call /timestamps/verify/:id to refresh.',
        },
      })
    }
  }

  return c.json({ error: 'unimplemented' }, 501)
})

function zodTypeName(t: z.ZodTypeAny): string {
  if (t instanceof z.ZodString) return 'string'
  if (t instanceof z.ZodNumber) return 'number'
  if (t instanceof z.ZodBoolean) return 'boolean'
  if (t instanceof z.ZodArray) return 'array'
  if (t instanceof z.ZodObject) return 'object'
  if (t instanceof z.ZodOptional || t instanceof z.ZodDefault)
    return zodTypeName(t._def.innerType ?? t._def.schema)
  return 'string'
}

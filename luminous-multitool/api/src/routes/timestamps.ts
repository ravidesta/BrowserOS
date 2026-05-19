import { Hono } from 'hono'
import { z } from 'zod'
import { sql } from '../lib/db'
import {
  getCalendarUrl,
  stampHash,
  verifyTimestamp,
} from '../lib/timestamp'

export const timestamps = new Hono()

const StampSchema = z.object({
  artifactType: z.string().min(1),
  artifactId: z.string().min(1),
  sha256Hex: z.string().regex(/^[0-9a-f]{64}$/i),
})

timestamps.post('/stamp', async (c) => {
  const body = await c.req.json()
  const parsed = StampSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const otsBytes = await stampHash(parsed.data.sha256Hex)
  const [row] = await sql`
    INSERT INTO timestamps (artifact_type, artifact_id, sha256_hex, ots_bytes)
    VALUES (
      ${parsed.data.artifactType},
      ${parsed.data.artifactId},
      ${parsed.data.sha256Hex},
      ${otsBytes}
    )
    ON CONFLICT (artifact_type, artifact_id) DO UPDATE
      SET sha256_hex = EXCLUDED.sha256_hex,
          ots_bytes = EXCLUDED.ots_bytes,
          verified = FALSE,
          btc_height = NULL,
          btc_time = NULL
    RETURNING id, artifact_type, artifact_id, sha256_hex, created_at
  `
  return c.json({
    ...row,
    calendarUrl: getCalendarUrl(),
    pending: true,
    note: 'Anchoring to Bitcoin takes ~6 hours. Call /verify later to refresh.',
  })
})

timestamps.post('/verify/:id', async (c) => {
  const [row] = await sql`
    SELECT ots_bytes, sha256_hex FROM timestamps WHERE id = ${c.req.param('id')}
  `
  if (!row) return c.json({ error: 'not found' }, 404)

  const result = await verifyTimestamp(row.ots_bytes)
  if (result.verified) {
    await sql`
      UPDATE timestamps SET
        verified = TRUE,
        btc_height = ${result.btcHeight},
        btc_time = ${result.btcTime}
      WHERE id = ${c.req.param('id')}
    `
  }
  return c.json(result)
})

timestamps.get('/:artifactType/:artifactId', async (c) => {
  const [row] = await sql`
    SELECT id, artifact_type, artifact_id, sha256_hex, verified, btc_height, btc_time, created_at
    FROM timestamps
    WHERE artifact_type = ${c.req.param('artifactType')}
      AND artifact_id = ${c.req.param('artifactId')}
    LIMIT 1
  `
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
})

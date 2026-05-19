import { Hono } from 'hono'
import { sql } from '../lib/db'
import { stampHash } from '../lib/timestamp'

// Forgejo webhook receiver.
// Wire these up in Forgejo: Site Administration > Webhooks (system-wide)
// or per-repo Settings > Webhooks. Point at:
//   http://luminous-api:4000/webhooks/forgejo/user-created
//   http://luminous-api:4000/webhooks/forgejo/push

export const webhooks = new Hono()

webhooks.post('/forgejo/user-created', async (c) => {
  const event = (await c.req.json()) as {
    user?: { id?: number; username?: string; full_name?: string }
    id?: number
    username?: string
    full_name?: string
  }
  const user = event.user ?? event
  const userId = user.id
  const username = user.username ?? ''
  if (!userId || !username) return c.json({ error: 'invalid payload' }, 400)

  const displayName = user.full_name?.trim() || username
  const [vendor] = await sql`
    INSERT INTO vendors (forgejo_user_id, display_name)
    VALUES (${userId}, ${displayName})
    ON CONFLICT (forgejo_user_id) DO NOTHING
    RETURNING id
  `
  return c.json({ created: !!vendor, vendorId: vendor?.id ?? null })
})

webhooks.post('/forgejo/push', async (c) => {
  const event = (await c.req.json()) as {
    commits?: Array<{ id?: string; message?: string }>
    repository?: { full_name?: string }
  }
  const commits = event.commits ?? []
  const repoName = event.repository?.full_name ?? 'unknown'
  const stamped: Array<{ commit: string; sha256: string }> = []
  const failed: Array<{ commit: string; error: string }> = []

  for (const commit of commits) {
    if (!commit.id) continue
    const artifactId = `${repoName}:${commit.id}`
    const sha256Hex = await sha256Hex_(artifactId)
    try {
      const otsBytes = await stampHash(sha256Hex)
      await sql`
        INSERT INTO timestamps (artifact_type, artifact_id, sha256_hex, ots_bytes)
        VALUES ('commit', ${artifactId}, ${sha256Hex}, ${otsBytes})
        ON CONFLICT (artifact_type, artifact_id) DO NOTHING
      `
      stamped.push({ commit: commit.id, sha256: sha256Hex })
    } catch (err) {
      failed.push({ commit: commit.id, error: (err as Error).message })
    }
  }

  return c.json({ stamped: stamped.length, failed: failed.length, results: stamped, failures: failed })
})

async function sha256Hex_(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

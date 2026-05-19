import { Hono } from 'hono'
import { getUserStorageMb } from '../lib/forgejo'

export const quota = new Hono()

const FREE_TIER_MB = 1100
const PRO_TIER_MB = 1024 * 1024 // 1 TB

quota.get('/:username', async (c) => {
  const username = c.req.param('username')
  const usedMb = await getUserStorageMb(username)
  return c.json({
    username,
    usedMb,
    freeTierMb: FREE_TIER_MB,
    proTierMb: PRO_TIER_MB,
    overFreeTier: usedMb > FREE_TIER_MB,
    overByMb: Math.max(0, usedMb - FREE_TIER_MB),
  })
})

import { Hono } from 'hono'
import { z } from 'zod'
import { env } from '../env'
import { sql } from '../lib/db'
import { createSubscriptionCheckout, getStripe } from '../lib/stripe'

export const subscriptions = new Hono()

const TIER_PRICES: Record<'annual' | 'pro', () => string> = {
  annual: () => env.STRIPE_PRICE_ANNUAL,
  pro: () => env.STRIPE_PRICE_PRO,
}

const CheckoutSchema = z.object({
  forgejoUserId: z.number().int().positive(),
  email: z.string().email(),
  tier: z.enum(['annual', 'pro']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

subscriptions.post('/checkout', async (c) => {
  const body = await c.req.json()
  const parsed = CheckoutSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const priceId = TIER_PRICES[parsed.data.tier]()
  if (!priceId) {
    return c.json(
      {
        error: `Stripe price id not configured for ${parsed.data.tier}. Set STRIPE_PRICE_${parsed.data.tier.toUpperCase()}.`,
      },
      503,
    )
  }

  await sql`
    INSERT INTO subscriptions (forgejo_user_id, tier)
    VALUES (${parsed.data.forgejoUserId}, 'free')
    ON CONFLICT (forgejo_user_id) DO NOTHING
  `

  const session = await createSubscriptionCheckout({
    priceId,
    email: parsed.data.email,
    forgejoUserId: parsed.data.forgejoUserId,
    successUrl: parsed.data.successUrl,
    cancelUrl: parsed.data.cancelUrl,
  })

  return c.json({ checkoutUrl: session.url, sessionId: session.id })
})

subscriptions.get('/:forgejoUserId', async (c) => {
  const userId = Number(c.req.param('forgejoUserId'))
  if (!Number.isFinite(userId) || userId <= 0) {
    return c.json({ error: 'invalid user id' }, 400)
  }
  const [row] = await sql`
    SELECT * FROM subscriptions WHERE forgejo_user_id = ${userId} LIMIT 1
  `
  if (!row) {
    return c.json({
      forgejo_user_id: userId,
      tier: 'free',
      status: 'active',
      synthetic: true,
    })
  }
  return c.json(row)
})

subscriptions.post('/:forgejoUserId/cancel', async (c) => {
  const userId = Number(c.req.param('forgejoUserId'))
  if (!Number.isFinite(userId) || userId <= 0) {
    return c.json({ error: 'invalid user id' }, 400)
  }
  const [row] = await sql`
    SELECT stripe_subscription_id FROM subscriptions
    WHERE forgejo_user_id = ${userId} LIMIT 1
  `
  if (!row?.stripe_subscription_id) {
    return c.json({ error: 'no active subscription' }, 404)
  }
  const stripe = getStripe()
  await stripe.subscriptions.update(row.stripe_subscription_id, {
    cancel_at_period_end: true,
  })
  await sql`
    UPDATE subscriptions
    SET cancel_at_period_end = TRUE, updated_at = NOW()
    WHERE forgejo_user_id = ${userId}
  `
  return c.json({ ok: true, cancelAtPeriodEnd: true })
})

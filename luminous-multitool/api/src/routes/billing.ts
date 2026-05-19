import { Hono } from 'hono'
import { z } from 'zod'
import { env, priceIdToTier } from '../env'
import { calculateCommission } from '../lib/commission'
import { sql } from '../lib/db'
import {
  createCheckoutSession,
  createConnectAccount,
  createConnectAccountLink,
  getStripe,
} from '../lib/stripe'

export const billing = new Hono()

const CheckoutSchema = z.object({
  listingId: z.string().uuid(),
  buyerEmail: z.string().email().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

billing.post('/checkout', async (c) => {
  const body = await c.req.json()
  const parsed = CheckoutSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const [listing] = await sql`
    SELECT l.*, v.stripe_connect_account_id, v.contract_start_at
    FROM listings l
    JOIN vendors v ON v.id = l.vendor_id
    WHERE l.id = ${parsed.data.listingId} AND l.active = TRUE
    LIMIT 1
  `
  if (!listing) return c.json({ error: 'listing not found' }, 404)
  if (!listing.stripe_connect_account_id) {
    return c.json({ error: 'vendor has not completed Stripe onboarding' }, 412)
  }

  const breakdown = listing.is_enterprise
    ? calculateCommission(
        listing.price_cents,
        new Date(listing.contract_start_at),
      )
    : {
        amountCents: listing.price_cents,
        rate: 0,
        commissionCents: 0,
        vendorPayoutCents: listing.price_cents,
        monthsSinceContractStart: 0,
      }

  const session = await createCheckoutSession({
    listingId: listing.id,
    listingTitle: listing.title,
    amountCents: breakdown.amountCents,
    vendorPayoutCents: breakdown.vendorPayoutCents,
    commissionCents: breakdown.commissionCents,
    vendorStripeAccountId: listing.stripe_connect_account_id,
    successUrl: parsed.data.successUrl,
    cancelUrl: parsed.data.cancelUrl,
    buyerEmail: parsed.data.buyerEmail,
  })

  await sql`
    INSERT INTO deals (
      listing_id, vendor_id, buyer_email, amount_cents,
      commission_rate, commission_cents, vendor_payout_cents,
      stripe_checkout_session_id, status
    ) VALUES (
      ${listing.id}, ${listing.vendor_id}, ${parsed.data.buyerEmail ?? null},
      ${breakdown.amountCents}, ${breakdown.rate}, ${breakdown.commissionCents},
      ${breakdown.vendorPayoutCents}, ${session.id}, 'pending'
    )
  `

  return c.json({ checkoutUrl: session.url, sessionId: session.id })
})

const OnboardSchema = z.object({
  vendorId: z.string().uuid(),
  email: z.string().email(),
  refreshUrl: z.string().url(),
  returnUrl: z.string().url(),
})

billing.post('/onboard', async (c) => {
  const body = await c.req.json()
  const parsed = OnboardSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const [vendor] = await sql`
    SELECT * FROM vendors WHERE id = ${parsed.data.vendorId} LIMIT 1
  `
  if (!vendor) return c.json({ error: 'vendor not found' }, 404)

  let accountId = vendor.stripe_connect_account_id
  if (!accountId) {
    const account = await createConnectAccount(
      parsed.data.email,
      vendor.display_name,
    )
    accountId = account.id
    await sql`
      UPDATE vendors SET stripe_connect_account_id = ${accountId}
      WHERE id = ${vendor.id}
    `
  }

  const link = await createConnectAccountLink(
    accountId,
    parsed.data.refreshUrl,
    parsed.data.returnUrl,
  )
  return c.json({ onboardingUrl: link.url, accountId })
})

billing.post('/webhook', async (c) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return c.text('Stripe webhook not configured', 503)
  }
  const sig = c.req.header('stripe-signature')
  const raw = await c.req.text()
  if (!sig) return c.text('Missing signature', 400)

  let event
  try {
    event = getStripe().webhooks.constructEvent(
      raw,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    return c.text(`Webhook signature failed: ${(err as Error).message}`, 400)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as {
        id: string
        payment_intent?: string | null
        mode?: string
      }
      if (session.mode === 'payment') {
        await sql`
          UPDATE deals SET
            status = 'completed',
            stripe_payment_intent_id = ${session.payment_intent ?? null},
            completed_at = NOW()
          WHERE stripe_checkout_session_id = ${session.id}
        `
      }
      break
    }
    case 'checkout.session.expired': {
      const session = event.data.object as { id: string }
      await sql`
        UPDATE deals SET status = 'expired'
        WHERE stripe_checkout_session_id = ${session.id} AND status = 'pending'
      `
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as {
        id: string
        customer: string
        status: string
        items: { data: Array<{ price: { id: string } }> }
        current_period_end: number
        cancel_at_period_end: boolean
        metadata: { forgejo_user_id?: string }
      }
      const forgejoUserId = sub.metadata?.forgejo_user_id
        ? Number(sub.metadata.forgejo_user_id)
        : null
      if (!forgejoUserId) break
      const priceId = sub.items.data[0]?.price.id
      const tier = priceIdToTier(priceId)
      const periodEnd = new Date(sub.current_period_end * 1000)
      await sql`
        INSERT INTO subscriptions (
          forgejo_user_id, stripe_customer_id, stripe_subscription_id,
          tier, status, current_period_end, cancel_at_period_end
        ) VALUES (
          ${forgejoUserId}, ${sub.customer}, ${sub.id},
          ${tier}, ${sub.status}, ${periodEnd}, ${sub.cancel_at_period_end}
        )
        ON CONFLICT (forgejo_user_id) DO UPDATE SET
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          tier = EXCLUDED.tier,
          status = EXCLUDED.status,
          current_period_end = EXCLUDED.current_period_end,
          cancel_at_period_end = EXCLUDED.cancel_at_period_end,
          updated_at = NOW()
      `
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string }
      await sql`
        UPDATE subscriptions SET
          tier = 'free',
          status = 'canceled',
          updated_at = NOW()
        WHERE stripe_subscription_id = ${sub.id}
      `
      break
    }
  }

  return c.json({ received: true })
})

import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  FORGEJO_INTERNAL_URL: z.string().url(),
  FORGEJO_PUBLIC_URL: z.string().url(),
  FORGEJO_ADMIN_TOKEN: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional().default(''),
  STRIPE_PRICE_ANNUAL: z.string().optional().default(''),
  STRIPE_PRICE_PRO: z.string().optional().default(''),
  OTS_CALENDAR_URL: z
    .string()
    .url()
    .default('https://alice.btc.calendar.opentimestamps.org'),
})

export const env = schema.parse(process.env)
export type Env = typeof env

export function requireStripe(): void {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.',
    )
  }
}

export function priceIdToTier(priceId: string | undefined): 'free' | 'annual' | 'pro' {
  if (priceId && priceId === env.STRIPE_PRICE_ANNUAL) return 'annual'
  if (priceId && priceId === env.STRIPE_PRICE_PRO) return 'pro'
  return 'free'
}

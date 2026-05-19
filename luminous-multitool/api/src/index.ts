import { Hono } from 'hono'
import { env } from './env'
import { billing } from './routes/billing'
import { commission } from './routes/commission'
import { concierge } from './routes/concierge'
import { marketplace } from './routes/marketplace'
import { quota } from './routes/quota'
import { subscriptions } from './routes/subscriptions'
import { timestamps } from './routes/timestamps'
import { vendors } from './routes/vendors'
import { webhooks } from './routes/webhooks'
import { ui } from './ui'

const app = new Hono()

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'luminous-api',
    stripeConfigured: !!env.STRIPE_SECRET_KEY,
    stripePricesConfigured: {
      annual: !!env.STRIPE_PRICE_ANNUAL,
      pro: !!env.STRIPE_PRICE_PRO,
    },
    forgejoTokenConfigured: !!env.FORGEJO_ADMIN_TOKEN,
  }),
)

app.route('/marketplace', marketplace)
app.route('/billing', billing)
app.route('/commission', commission)
app.route('/timestamps', timestamps)
app.route('/vendors', vendors)
app.route('/subscriptions', subscriptions)
app.route('/concierge', concierge)
app.route('/quota', quota)
app.route('/webhooks', webhooks)
app.route('/', ui)

app.notFound((c) => c.json({ error: 'not found' }, 404))
app.onError((err, c) => {
  console.error(`[luminous-api] ${err.message}`, err.stack)
  return c.json({ error: err.message }, 500)
})

console.log(`[luminous-api] listening on :${env.API_PORT}`)

export default {
  port: env.API_PORT,
  fetch: app.fetch,
}

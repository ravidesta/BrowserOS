import { Hono } from 'hono'
import { env } from './env'
import { billing } from './routes/billing'
import { commission } from './routes/commission'
import { marketplace } from './routes/marketplace'
import { timestamps } from './routes/timestamps'
import { ui } from './ui'

const app = new Hono()

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'luminous-api',
    stripeConfigured: !!env.STRIPE_SECRET_KEY,
  }),
)

app.route('/marketplace', marketplace)
app.route('/billing', billing)
app.route('/commission', commission)
app.route('/timestamps', timestamps)
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

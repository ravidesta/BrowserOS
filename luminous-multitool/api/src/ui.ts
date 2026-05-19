import { Hono } from 'hono'
import { env } from './env'
import { sql } from './lib/db'

export const ui = new Hono()

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Luminous</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Manrope', -apple-system, system-ui, sans-serif; background: #f8f7f5; color: #1a1815; line-height: 1.5; }
  h1, h2, h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; letter-spacing: -0.01em; margin: 0 0 12px; }
  h1 { font-size: clamp(40px, 6vw, 64px); line-height: 1.05; }
  h2 { font-size: 36px; margin-top: 48px; }
  h3 { font-size: 22px; }
  p { color: #4a463f; }
  nav { background: white; border-bottom: 1px solid #e8e4dc; padding: 16px 24px; display: flex; gap: 24px; align-items: center; }
  nav a { color: #1a1815; text-decoration: none; font-size: 13px; font-weight: 500; letter-spacing: 0.02em; }
  nav a:hover { color: #C5A059; }
  nav .brand { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 500; letter-spacing: 0; }
  nav .spacer { flex: 1; }
  .container { max-width: 1100px; margin: 0 auto; padding: 56px 24px; }
  .container.narrow { max-width: 720px; }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .card { background: white; border: 1px solid #e8e4dc; border-radius: 14px; padding: 24px; transition: border-color 0.15s, transform 0.15s; }
  .card:hover { border-color: #C5A059; }
  .card a.title { color: #1a1815; text-decoration: none; }
  .price { color: #C5A059; font-size: 28px; font-weight: 500; font-family: 'Cormorant Garamond', serif; }
  .btn { display: inline-block; padding: 12px 24px; background: #C5A059; color: white; border-radius: 8px; text-decoration: none; font-weight: 500; cursor: pointer; border: none; font-size: 14px; font-family: inherit; transition: background 0.15s; }
  .btn:hover { background: #b08945; }
  .btn.secondary { background: white; color: #1a1815; border: 1px solid #e8e4dc; }
  .btn.secondary:hover { background: #f0ede5; }
  .btn.large { padding: 16px 32px; font-size: 16px; }
  .pricing-table { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin: 32px 0; }
  .tier { background: white; border: 1px solid #e8e4dc; border-radius: 14px; padding: 28px; display: flex; flex-direction: column; }
  .tier.featured { border-color: #C5A059; border-width: 2px; position: relative; }
  .tier.featured::before { content: 'Most Popular'; position: absolute; top: -12px; left: 24px; background: #C5A059; color: white; padding: 4px 12px; border-radius: 999px; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
  .tier h3 { font-size: 26px; margin-bottom: 4px; }
  .tier .amount { font-size: 48px; font-family: 'Cormorant Garamond', serif; color: #C5A059; margin: 16px 0 4px; }
  .tier .interval { color: #6b6862; font-size: 13px; }
  .tier ul { list-style: none; padding: 0; margin: 24px 0; flex: 1; }
  .tier ul li { padding: 6px 0; color: #4a463f; font-size: 14px; display: flex; gap: 8px; }
  .tier ul li::before { content: '✓'; color: #C5A059; font-weight: 600; }
  .meta { color: #6b6862; font-size: 13px; margin-top: 8px; }
  .hero { padding: 80px 0 24px; }
  .hero p.lead { font-size: 20px; color: #4a463f; max-width: 600px; }
  .hero .ctas { margin-top: 32px; display: flex; gap: 12px; flex-wrap: wrap; }
  .empty { text-align: center; padding: 80px 24px; color: #6b6862; }
  .row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .row > * { flex: 1; min-width: 200px; }
  label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: #6b6862; margin-bottom: 6px; }
  input, textarea, select { width: 100%; padding: 10px 12px; border: 1px solid #e8e4dc; border-radius: 8px; font-family: inherit; font-size: 14px; background: white; color: #1a1815; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: #C5A059; }
  .form-section { margin-bottom: 20px; }
  .status { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
  .status.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
  .status.ok { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .feature-grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 32px 0; }
  .feature h3 { font-size: 22px; margin-bottom: 8px; }
  .feature p { font-size: 14px; margin: 0; }
  footer { padding: 48px 24px; text-align: center; color: #6b6862; font-size: 13px; border-top: 1px solid #e8e4dc; background: white; }
</style>
</head>
<body>
<nav>
  <a class="brand" href="/">Luminous</a>
  <a href="/marketplace">Marketplace</a>
  <a href="/pricing">Pricing</a>
  <a href="/vendor">Sell on Luminous</a>
  <div class="spacer"></div>
  <a href="${env.FORGEJO_PUBLIC_URL}" class="btn secondary">Sign in</a>
</nav>
${body}
<footer>Luminous Multitool · Git hosting + marketplace + AI concierge + bitcoin timestamping</footer>
</body>
</html>`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

ui.get('/', (c) =>
  c.html(
    page(
      'Home',
      `
<div class="container hero">
  <h1>The everything-platform.</h1>
  <p class="lead">Git hosting, marketplace, AI concierge, and bitcoin-anchored proof of existence. One subscription, no per-seat games.</p>
  <div class="ctas">
    <a href="/marketplace" class="btn large">Browse Marketplace</a>
    <a href="/pricing" class="btn large secondary">See Pricing</a>
  </div>
</div>
<div class="container">
  <h2>What's in the box</h2>
  <div class="feature-grid">
    <div class="feature">
      <h3>Git hosting</h3>
      <p>Forgejo-based. Repos, issues, PRs, wikis, CI. One-click migration from GitHub.</p>
    </div>
    <div class="feature">
      <h3>Marketplace</h3>
      <p>Sell software and services. Stripe Connect payouts. Standard subscribers pay zero commission.</p>
    </div>
    <div class="feature">
      <h3>Bitcoin timestamps</h3>
      <p>OpenTimestamps anchors every commit and contract to the blockchain. Legally admissible proof of existence.</p>
    </div>
    <div class="feature">
      <h3>AI concierge</h3>
      <p>Warm, intelligent, always-on. Drives the platform on your behalf via the same MCP tools that power BrowserOS.</p>
    </div>
  </div>
</div>`,
    ),
  ),
)

ui.get('/pricing', (c) =>
  c.html(
    page(
      'Pricing',
      `
<div class="container">
  <h1>Pricing</h1>
  <p class="lead">Free like Microsoft. Paid when you need more.</p>

  <div class="pricing-table">
    <div class="tier">
      <h3>Free</h3>
      <div class="amount">$0</div>
      <div class="interval">forever</div>
      <ul>
        <li>Unlimited public &amp; private repos</li>
        <li>Up to 1,100 MB storage</li>
        <li>Marketplace browsing</li>
        <li>Bitcoin timestamps on every commit</li>
      </ul>
      <a href="${env.FORGEJO_PUBLIC_URL}" class="btn secondary">Sign up</a>
    </div>

    <div class="tier">
      <h3>Annual</h3>
      <div class="amount">$99</div>
      <div class="interval">per year</div>
      <ul>
        <li>Everything in Free</li>
        <li>Sales tools</li>
        <li>Vendor storefront</li>
        <li>AI concierge access</li>
      </ul>
      <a href="/vendor" class="btn">Get Annual</a>
    </div>

    <div class="tier featured">
      <h3>Pro</h3>
      <div class="amount">$299</div>
      <div class="interval">per month</div>
      <ul>
        <li>Everything in Annual</li>
        <li>1 TB storage</li>
        <li>Video &amp; audio communication</li>
        <li>Valuations, tech sheets, mockups</li>
        <li>Landing pages &amp; marketing tools</li>
        <li>AI-guided business plan software</li>
      </ul>
      <a href="/vendor" class="btn">Get Pro</a>
    </div>
  </div>

  <h2>Marketplace commission</h2>
  <p>Enterprise deals only. Standard subscribers and their buyers pay zero on transactions.</p>
  <div class="pricing-table" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
    <div class="tier"><h3>Year 1</h3><div class="amount">10%</div></div>
    <div class="tier"><h3>Year 2</h3><div class="amount">5%</div></div>
    <div class="tier"><h3>Year 3</h3><div class="amount">3%</div></div>
    <div class="tier"><h3>Year 4+</h3><div class="amount">1%</div></div>
  </div>
</div>`,
    ),
  ),
)

ui.get('/marketplace', async (c) => {
  const listings = await sql<
    {
      id: string
      title: string
      description: string | null
      price_cents: number
      vendor_name: string
      is_enterprise: boolean
    }[]
  >`
    SELECT l.id, l.title, l.description, l.price_cents, l.is_enterprise, v.display_name AS vendor_name
    FROM listings l
    JOIN vendors v ON v.id = l.vendor_id
    WHERE l.active = TRUE
    ORDER BY l.created_at DESC
    LIMIT 60
  `

  const body =
    listings.length === 0
      ? `<div class="container"><h1>Marketplace</h1><div class="empty">No listings yet. <a href="/vendor">Be the first to sell.</a></div></div>`
      : `<div class="container"><h1>Marketplace</h1><p class="lead">${listings.length} listing${listings.length === 1 ? '' : 's'}.</p><div class="grid">${listings
          .map(
            (l) => `
      <div class="card">
        <a class="title" href="/marketplace/${l.id}"><h3>${esc(l.title)}</h3></a>
        <p class="meta">by ${esc(l.vendor_name)}${l.is_enterprise ? ' · Enterprise' : ''}</p>
        ${l.description ? `<p>${esc(l.description).slice(0, 140)}${l.description.length > 140 ? '…' : ''}</p>` : ''}
        <div class="price">${formatPrice(l.price_cents)}</div>
      </div>`,
          )
          .join('')}</div></div>`

  return c.html(page('Marketplace', body))
})

ui.get('/marketplace/:id', async (c) => {
  const [listing] = await sql<
    {
      id: string
      title: string
      description: string | null
      price_cents: number
      is_enterprise: boolean
      vendor_name: string
      stripe_connect_account_id: string | null
      forgejo_repo_url: string | null
    }[]
  >`
    SELECT l.id, l.title, l.description, l.price_cents, l.is_enterprise,
           l.forgejo_repo_url, v.display_name AS vendor_name,
           v.stripe_connect_account_id
    FROM listings l
    JOIN vendors v ON v.id = l.vendor_id
    WHERE l.id = ${c.req.param('id')} AND l.active = TRUE
    LIMIT 1
  `

  if (!listing) {
    return c.html(
      page(
        'Not found',
        `<div class="container narrow"><h1>Listing not found</h1><p>This listing may have been removed.</p><a href="/marketplace" class="btn">Back to marketplace</a></div>`,
      ),
      404,
    )
  }

  const canCheckout = Boolean(listing.stripe_connect_account_id)
  const baseUrl = env.FORGEJO_PUBLIC_URL.replace(/\/$/, '')

  return c.html(
    page(
      listing.title,
      `
<div class="container narrow">
  <a href="/marketplace" style="font-size:13px; color:#6b6862; text-decoration:none;">← Marketplace</a>
  <h1>${esc(listing.title)}</h1>
  <p class="meta">by ${esc(listing.vendor_name)}${listing.is_enterprise ? ' · Enterprise deal' : ''}</p>
  <div class="price" style="font-size:48px; margin: 16px 0 32px;">${formatPrice(listing.price_cents)}</div>
  ${listing.description ? `<p>${esc(listing.description).replace(/\n/g, '<br>')}</p>` : ''}
  ${listing.forgejo_repo_url ? `<p class="meta">Source: <a href="${esc(listing.forgejo_repo_url)}">${esc(listing.forgejo_repo_url)}</a></p>` : ''}
  <div id="status"></div>
  ${
    canCheckout
      ? `<button id="buy" class="btn large">Buy now</button>`
      : `<p class="meta">This listing is not yet purchasable — the vendor hasn't completed Stripe onboarding.</p>`
  }
</div>
<script>
  (function () {
    var btn = document.getElementById('buy');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      btn.textContent = 'Loading…';
      try {
        var res = await fetch('/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: ${JSON.stringify(listing.id)},
            successUrl: window.location.origin + '/marketplace/${listing.id}?paid=true',
            cancelUrl: window.location.href
          })
        });
        var data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          document.getElementById('status').innerHTML = '<div class="status error">' + (data.error ? JSON.stringify(data.error) : 'Checkout failed') + '</div>';
          btn.disabled = false;
          btn.textContent = 'Buy now';
        }
      } catch (err) {
        document.getElementById('status').innerHTML = '<div class="status error">' + err.message + '</div>';
        btn.disabled = false;
        btn.textContent = 'Buy now';
      }
    });
    if (new URLSearchParams(window.location.search).get('paid') === 'true') {
      document.getElementById('status').innerHTML = '<div class="status ok">Payment received. Vendor has been notified.</div>';
    }
  })();
</script>`,
    ),
  )
})

ui.get('/vendor', (c) =>
  c.html(
    page(
      'Sell on Luminous',
      `
<div class="container narrow">
  <h1>Sell on Luminous</h1>
  <p class="lead">List software, services, or templates. Get paid via Stripe. We take zero commission on standard subscriber sales — only enterprise deals carry our declining 10/5/3/1% schedule.</p>

  <h2>1. Sign up &amp; create a vendor profile</h2>
  <p>First, create your Luminous account on the Git host. We'll spin up your vendor profile automatically.</p>
  <a href="${env.FORGEJO_PUBLIC_URL}user/sign_up" class="btn">Create account</a>

  <h2>2. Connect Stripe</h2>
  <p>Tell us where to send your payouts. Standard Stripe Express onboarding.</p>
  <form id="onboard-form">
    <div class="form-section">
      <label for="email">Email</label>
      <input id="email" type="email" required placeholder="you@example.com">
    </div>
    <div class="form-section">
      <label for="vendor-id">Vendor ID</label>
      <input id="vendor-id" type="text" required placeholder="From your Luminous profile">
    </div>
    <div id="onboard-status"></div>
    <button type="submit" class="btn">Continue to Stripe</button>
  </form>

  <h2>3. List your first product</h2>
  <p>Once you're connected, head to your vendor dashboard and add a listing. Or use the API directly:</p>
  <pre style="background:white; border:1px solid #e8e4dc; border-radius:8px; padding:16px; overflow-x:auto; font-size:13px;">curl -X POST http://localhost:4000/marketplace/listings \\
  -H 'Content-Type: application/json' \\
  -d '{
    "vendorId": "&lt;your-vendor-id&gt;",
    "title": "My Product",
    "description": "What it does",
    "priceCents": 9900,
    "isEnterprise": false
  }'</pre>
</div>
<script>
  document.getElementById('onboard-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = document.getElementById('email').value;
    var vendorId = document.getElementById('vendor-id').value;
    var status = document.getElementById('onboard-status');
    status.innerHTML = '<div class="status">Creating Stripe account…</div>';
    try {
      var res = await fetch('/billing/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: vendorId,
          email: email,
          refreshUrl: window.location.href,
          returnUrl: window.location.origin + '/vendor?onboarded=true'
        })
      });
      var data = await res.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        status.innerHTML = '<div class="status error">' + (data.error ? JSON.stringify(data.error) : 'Onboarding failed') + '</div>';
      }
    } catch (err) {
      status.innerHTML = '<div class="status error">' + err.message + '</div>';
    }
  });
  if (new URLSearchParams(window.location.search).get('onboarded') === 'true') {
    document.getElementById('onboard-status').innerHTML = '<div class="status ok">Stripe onboarding complete. You can now list products.</div>';
  }
</script>`,
    ),
  ),
)

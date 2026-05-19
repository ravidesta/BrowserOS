# Luminous Multitool

A unified platform: Git hosting + marketplace + AI concierge + bitcoin
timestamping. The superior alternative to GitHub, with infrastructure you
already understand.

> **Temporary home:** This scaffold lives inside `ravidesta/browseros` until
> `ravidesta/luminous-multitool` is in the active Claude session's scope.
> Once it is, `git mv luminous-multitool/* ../` over there and everything
> keeps working unchanged.

## What it is

- **Git hosting** built on [Forgejo](https://forgejo.org). Repos, issues,
  PRs, wikis, CI — the works.
- **Marketplace** where vendors sell software and services. Stripe Connect
  handles vendor payouts; we take our cut at the platform layer.
- **Subscription billing** — $99/year and $299/month tiers with full Stripe
  subscription lifecycle (checkout, webhooks, cancellation).
- **Bitcoin timestamping** — every commit and deal artifact anchored to
  the Bitcoin blockchain via OpenTimestamps. Cryptographic proof of
  existence, legally admissible.
- **AI concierge** — warm, intelligent assistant that drives the platform
  on the user's behalf via an MCP-style tool surface. See `CONCIERGE.md`.

## Pricing

| Tier | Price | Storage | What |
|---|---|---|---|
| Free | $0 | ≤ 1,100 MB | Core features, public + private repos |
| Annual | $99/year | — | Everything + sales tools |
| Pro | $299/month | 1 TB | Full suite |

**Marketplace commission (enterprise deals only):**
10% Y1 → 5% Y2 → 3% Y3 → 1% Y4+.

## Quick start

```bash
cd luminous-multitool
cp .env.example .env
docker compose up -d
```

Wait about 30 seconds, then:

- **Web UI**: <http://localhost:4000> — home, pricing, marketplace, vendor
- **Forgejo**: <http://localhost:3000> — first user becomes admin
- **API**: <http://localhost:4000/health>

## Production setup checklist

1. **Forgejo first signup** — register an account; it becomes admin.
2. **Generate Forgejo admin token** — Settings → Applications → Generate.
   Set as `FORGEJO_ADMIN_TOKEN`.
3. **Stripe account** — create at <https://dashboard.stripe.com>. Get the
   secret key, webhook signing secret, and Connect client id.
4. **Stripe subscription products** — create:
   - "Luminous Annual" — $99/year recurring → copy the `price_xxx` id
     into `STRIPE_PRICE_ANNUAL`
   - "Luminous Pro" — $299/month recurring → copy into `STRIPE_PRICE_PRO`
5. **Stripe webhook endpoint** — in Stripe dashboard, add:
   `https://your-domain/billing/webhook`
   Subscribe to events: `checkout.session.completed`,
   `customer.subscription.created/updated/deleted`,
   `checkout.session.expired`.
6. **Forgejo webhooks** — Site Admin → Webhooks → Add:
   - `http://api:4000/webhooks/forgejo/user-created` (User created)
   - `http://api:4000/webhooks/forgejo/push` (Push)
7. **Restart**: `docker compose down && docker compose up -d`

## API surface

### Marketplace
- `GET    /marketplace` — HTML grid
- `GET    /marketplace/:id` — HTML detail + Buy button
- `GET    /marketplace/listings` — JSON list
- `POST   /marketplace/listings` — create
- `PATCH  /marketplace/listings/:id` — update
- `DELETE /marketplace/listings/:id` — deactivate

### Billing (Stripe Connect)
- `POST /billing/onboard` — create Express account, return onboarding URL
- `POST /billing/checkout` — create one-time Checkout with commission split
- `POST /billing/webhook` — receives all Stripe events (subscriptions + payments)

### Subscriptions ($99/yr, $299/mo)
- `POST /subscriptions/checkout` — create subscription Checkout URL
- `GET  /subscriptions/:forgejoUserId` — current tier + status
- `POST /subscriptions/:forgejoUserId/cancel` — cancel at period end

### Commission
- `POST /commission/preview` — calculate what a deal would cost

### Timestamps (OpenTimestamps)
- `POST /timestamps/stamp` — anchor a hash to Bitcoin
- `POST /timestamps/verify/:id` — refresh BTC confirmation status
- `GET  /timestamps/:artifactType/:artifactId` — fetch existing timestamp

### Vendors
- `POST /vendors` — create
- `GET  /vendors/:id` — single vendor
- `GET  /vendors/:id/dashboard` — vendor + listings + deals + totals (JSON)
- `GET  /vendor/:id/dashboard` — same, HTML

### Concierge (MCP-style for the AI)
- `GET  /concierge/tools` — list available tools
- `POST /concierge/invoke/:tool` — call a tool by name

See `CONCIERGE.md` for integration with Claude / GPT / BrowserOS.

### Storage quota
- `GET /quota/:username` — Forgejo storage used vs free-tier limit

### Webhooks (Forgejo → Luminous)
- `POST /webhooks/forgejo/user-created` — auto-create vendor row
- `POST /webhooks/forgejo/push` — auto-stamp every commit

## Architecture

```
luminous-multitool/
├── docker-compose.yml         # Forgejo + Postgres + API
├── .env.example
├── CONCIERGE.md               # LLM integration guide
├── forgejo/custom/            # Forgejo branding
└── api/                       # Bun + Hono backend
    ├── src/
    │   ├── index.ts           # Hono entrypoint
    │   ├── env.ts             # config + tier mapping
    │   ├── ui.ts              # HTML pages
    │   ├── lib/{db,commission,forgejo,stripe,timestamp}.ts
    │   └── routes/
    │       ├── marketplace.ts
    │       ├── vendors.ts
    │       ├── billing.ts        # marketplace + subscription webhooks
    │       ├── subscriptions.ts  # subscription checkout, cancel
    │       ├── commission.ts
    │       ├── timestamps.ts
    │       ├── concierge.ts      # MCP-style AI surface
    │       ├── quota.ts
    │       └── webhooks.ts       # Forgejo → Luminous
    ├── migrations/
    │   ├── 0001_init.sql
    │   └── 0002_subscriptions.sql
    └── tests/commission.test.ts
```

## Status

- [x] Phase 1: Forgejo deployable, branded, Postgres schema, API skeleton, commission engine
- [x] Phase 2: Marketplace UI, vendor onboarding, Stripe Connect checkout
- [x] Phase 3: Vendor dashboard, AI concierge (5 tools), Forgejo webhooks, storage quota
- [x] Phase 4: Subscription billing ($99/yr + $299/mo), full Stripe subscription lifecycle, concierge integration doc
- [ ] Phase 5: Video/audio communication (LiveKit)
- [ ] Phase 5: Business plan / mockup / landing page tooling (AI-driven)
- [ ] Phase 5: One-click GitHub repo migration UI (Forgejo's importer wrapped in a friendlier flow)

**This is a complete v1 backend.** Everything that earns money is wired:
subscription billing, marketplace, commission. Everything that
differentiates is wired: bitcoin timestamps, AI concierge, branded git
hosting. Phase 5 is product polish on top of a working foundation.

## License

Forgejo is GPL-3.0. The Luminous-specific modules will be released under a
Business Source License (BSL) when public. For now, all rights reserved.

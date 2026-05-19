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
- **Bitcoin timestamping** — every commit and deal artifact anchored to
  the Bitcoin blockchain via OpenTimestamps. Cryptographic proof of
  existence, legally admissible.
- **AI concierge** — warm, intelligent assistant that drives the platform
  on the user's behalf via an MCP-style tool surface.

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

### Wire up Forgejo → API webhooks (one-time, after first signup)

In Forgejo: **Site Administration → Webhooks → Add Webhook**

| Hook | URL | Event |
|---|---|---|
| Auto-create vendors | `http://api:4000/webhooks/forgejo/user-created` | User created |
| Auto-stamp commits | `http://api:4000/webhooks/forgejo/push` | Push |

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
- `POST /billing/checkout` — create Checkout Session with commission split
- `POST /billing/webhook` — Stripe webhook receiver

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

Available tools: `list_marketplace_listings`, `get_listing`,
`preview_commission`, `get_vendor_summary`, `stamp_artifact`.

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
├── forgejo/
│   └── custom/                # Forgejo branding
└── api/                       # Bun + Hono backend
    ├── src/
    │   ├── index.ts           # Hono entrypoint
    │   ├── env.ts             # config
    │   ├── ui.ts              # HTML pages (home, pricing, marketplace, vendor, dashboard)
    │   ├── lib/
    │   │   ├── db.ts          # postgres.js client
    │   │   ├── commission.ts  # 10/5/3/1% schedule + math
    │   │   ├── forgejo.ts     # Forgejo API client
    │   │   ├── stripe.ts      # Stripe Connect helpers
    │   │   └── timestamp.ts   # OpenTimestamps wrapper
    │   └── routes/
    │       ├── marketplace.ts # listings CRUD
    │       ├── vendors.ts     # vendor CRUD + dashboard JSON
    │       ├── billing.ts     # Stripe webhook + checkout + onboarding
    │       ├── commission.ts  # commission preview
    │       ├── timestamps.ts  # stamp + verify
    │       ├── concierge.ts   # MCP-style AI tool surface
    │       ├── quota.ts       # storage tracking
    │       └── webhooks.ts    # Forgejo → Luminous integration
    ├── migrations/
    │   └── 0001_init.sql
    └── tests/
        └── commission.test.ts
```

## Status

- [x] Phase 1: Forgejo deployable, branded
- [x] Phase 1: Postgres schema (vendors, listings, deals, timestamps)
- [x] Phase 1: API skeleton (Hono + postgres.js + Stripe SDK + OpenTimestamps)
- [x] Phase 1: Commission engine (10/5/3/1% schedule, tested)
- [x] Phase 2: Marketplace UI (home, pricing, listings grid, listing detail)
- [x] Phase 2: Vendor onboarding flow (Stripe Connect Express)
- [x] Phase 2: Buy now → Stripe Checkout with application_fee_amount
- [x] Phase 3: Vendor dashboard (listings, payouts, stats)
- [x] Phase 3: AI concierge MCP-style endpoint (5 tools)
- [x] Phase 3: Forgejo webhook receiver (auto-vendor creation, auto-commit timestamping)
- [x] Phase 3: Storage quota tracker
- [ ] Phase 4: Subscription billing (Stripe products for $99/yr, $299/mo)
- [ ] Phase 4: Video/audio communication (LiveKit integration)
- [ ] Phase 4: Business plan / mockup / landing page tooling

## License

Forgejo is GPL-3.0. The Luminous-specific modules will be released under a
Business Source License (BSL) when public. For now, all rights reserved.

# Luminous Multitool

A unified platform: Git hosting + marketplace + AI concierge + bitcoin
timestamping. The superior alternative to GitHub, with infrastructure you
already understand.

> **Temporary home:** This scaffold currently lives inside `ravidesta/browseros`
> because the dedicated repo (`ravidesta/luminous-multitool`) isn't in the
> active Claude session's scope. Once it is, `git mv luminous-multitool/* ../`
> over there and everything keeps working unchanged.

## What it is

- **Git hosting** built on [Forgejo](https://forgejo.org) (open hard fork of
  Gitea). Repos, issues, PRs, wikis, CI — the works.
- **Marketplace API** where vendors sell software and services. Stripe
  Connect handles vendor payouts; we take our cut at the platform layer.
- **Bitcoin timestamping** — commits and deal artifacts anchored to the
  Bitcoin blockchain via OpenTimestamps. Cryptographic proof of existence,
  legally admissible.
- **AI concierge** — warm, intelligent assistant powered by the same
  MCP-tool pattern as BrowserOS.

## Pricing

| Tier | Price | Storage | What |
|---|---|---|---|
| Free | $0 | ≤ 1,100 MB | Core features, public + private repos |
| Annual | $99/year | — | Everything + sales tools |
| Pro | $299/month | 1 TB | Full suite |

**Marketplace commission (enterprise deals only):**
10% Y1 → 5% Y2 → 3% Y3 → 1% Y4+. Standard subscribers pay zero commission
on transactions — the flat subscription is the revenue line.

## Quick start

```bash
cd luminous-multitool
cp .env.example .env
docker compose up -d
```

Wait for the containers to come up (about 30s on first run). Then:

- Forgejo: <http://localhost:3000> (first user to register is the admin)
- API: <http://localhost:4000/health>

## Architecture

```
luminous-multitool/
├── docker-compose.yml         # Forgejo + Postgres + API
├── .env.example
├── forgejo/
│   └── custom/                # Forgejo branding (logo, templates)
└── api/                       # The Luminous backend
    ├── src/
    │   ├── index.ts           # Hono entrypoint
    │   ├── env.ts             # config from env vars
    │   ├── lib/
    │   │   ├── db.ts          # postgres.js client
    │   │   ├── commission.ts  # 10/5/3/1% schedule + math
    │   │   ├── stripe.ts      # Stripe Connect helpers
    │   │   └── timestamp.ts   # OpenTimestamps wrapper
    │   └── routes/
    │       ├── marketplace.ts # listings CRUD
    │       ├── billing.ts     # Stripe webhook + checkout creation
    │       ├── commission.ts  # commission preview endpoint
    │       └── timestamps.ts  # stamp + verify endpoints
    └── migrations/
        └── 0001_init.sql      # tables: vendors, listings, deals, timestamps
```

## Status

- [x] Phase 1: Forgejo deployable, branded
- [x] Phase 1: API service skeleton (Hono + postgres.js + Stripe SDK + OpenTimestamps)
- [x] Phase 1: Commission engine (10/5/3/1% schedule, deterministic math, testable)
- [x] Phase 1: Database schema (vendors, listings, deals, timestamps)
- [ ] Phase 2: Marketplace UI (storefronts, listing pages)
- [ ] Phase 2: Stripe Connect onboarding flow (vendor account setup)
- [ ] Phase 3: AI concierge MCP server
- [ ] Phase 4: Video/audio communication
- [ ] Phase 4: Business plan / mockups / landing pages tooling

## License

Forgejo is GPL-3.0. The Luminous-specific modules under `api/` and `forgejo/custom/`
will be source-available under a Business Source License (BSL) once published —
for now, all rights reserved.

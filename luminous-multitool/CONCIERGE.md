# Luminous Concierge — LLM integration guide

The Luminous AI concierge is exposed as an HTTP-MCP-style tool surface. An
LLM client lists tools, then invokes them by name with JSON args. No fancy
transport — just two endpoints.

## Endpoints

- `GET  /concierge/tools` — returns `{ tools: [...] }` with names, descriptions, and input schemas
- `POST /concierge/invoke/:tool` — calls a tool with a JSON body of args, returns `{ result }` or `{ error }`

## Tools (v1)

| Tool | Args | What |
|---|---|---|
| `list_marketplace_listings` | `{ limit?: number }` | Active listings, newest first |
| `get_listing` | `{ listingId: string }` | Full detail for one listing |
| `preview_commission` | `{ vendorId: string, amountCents: number }` | What the cut would be for a hypothetical deal |
| `get_vendor_summary` | `{ vendorId: string }` | Vendor profile + active listings, completed deals, total payout |
| `stamp_artifact` | `{ artifactType: string, artifactId: string, sha256Hex: string }` | Anchor a hash to Bitcoin via OpenTimestamps |

## Wire it to Claude (Anthropic SDK)

```typescript
import Anthropic from '@anthropic-ai/sdk'

const CONCIERGE = 'http://localhost:4000'
const tools = await fetch(`${CONCIERGE}/concierge/tools`).then((r) => r.json())

const client = new Anthropic()
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  tools: tools.tools.map((t: { name: string; description: string; input_schema: object }) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  })),
  messages: [
    { role: 'user', content: 'What\'s currently for sale, and how much would I pay if I bought the most expensive one?' },
  ],
})

for (const block of response.content) {
  if (block.type === 'tool_use') {
    const result = await fetch(`${CONCIERGE}/concierge/invoke/${block.name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(block.input),
    }).then((r) => r.json())
    console.log(block.name, result)
  }
}
```

That's it. The concierge lives behind a regular HTTP server — no MCP
transport required for first contact. Once it earns real users, we can
stand up a proper MCP server (stdio + JSON-RPC) and have it proxy to the
same HTTP endpoints.

## Wire it to BrowserOS

The BrowserOS agent already speaks MCP. To expose the Luminous concierge
as a remote MCP server inside the agent:

1. In BrowserOS settings, add an MCP server entry with the Luminous host URL.
2. The agent will discover the 5 tools and route invocations transparently.
3. Future: replace the BrowserOS-side `office_status` and `office_prepare_document`
   tools by mounting the office suite under the same concierge surface.

## Future tools (planned)

- `create_listing` — vendor adds a product (requires auth)
- `start_subscription_checkout` — returns a Stripe Checkout URL
- `check_subscription` — read current tier + storage usage
- `migrate_github_repo` — trigger Forgejo's GitHub migrator
- `verify_timestamp` — refresh BTC confirmation status
- `generate_business_plan` — AI-driven business plan from a prompt (Phase 4)

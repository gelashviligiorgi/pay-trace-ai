# Pay Trace AI — MCP Server

Exposes the payment error knowledge base as an MCP server so any MCP-compatible client (Claude Desktop, Cursor, etc.) can query it directly.

A developer debugging a payment failure can ask Claude Desktop:
> *"What does Adyen refusal code 12 mean and how do I handle it?"*

Claude calls this server and returns an answer grounded in the actual knowledge base, not training data.

---

## Architecture

The MCP server is a thin client — it does not connect to Supabase or Voyage AI directly. Instead it calls the deployed backend over HTTPS, which handles all data access. This means you only need two values to run it:

```text
MCP server  ──HTTPS + X-MCP-Key──>  Deployed backend  ──>  Supabase / Voyage AI
```

- **No Supabase credentials needed**
- **No Voyage AI credentials needed**
- **One shared secret** authenticates all requests

---

## Transport

**stdio** — runs as a local child process. Claude Desktop spawns it on startup, communicates over stdin/stdout using JSON-RPC 2.0.

---

## Tools

| Tool | Description | Input |
|---|---|---|
| `lookup_error_code` | Exact lookup by error code and optional PSP | `code: string`, `provider?: enum` |
| `get_provider_codes` | All error codes for a given PSP | `provider: enum` |
| `search_payment_errors` | Semantic search across the vector knowledge base | `query: string`, `limit?: number` |
| `list_providers` | Lists all supported payment service providers | — |

The `provider` field is a strict enum — accepted values: `stripe`, `adyen`, `braintree`, `checkout.com`, `paypal`, `primer`, `3ds`.

### Tool details

**`lookup_error_code`**
Returns meaning, cause, fix, and whether the error is retryable. Supports provider-scoped lookup to resolve collisions (e.g. Adyen code `2` vs Primer code `02`). Calls `GET /mcp/lookup`.

**`get_provider_codes`**
Returns all known error codes for a PSP. Useful for building reference tables or checking coverage. Calls `GET /mcp/provider-codes`.

**`search_payment_errors`**
Semantic vector search via Voyage AI embeddings + Supabase pgvector. Finds relevant entries even when the exact code is unknown — e.g. *"card blocked by fraud system"*. Calls `POST /mcp/search`.

**`list_providers`**
Returns the list of PSPs covered: Stripe, Adyen, Braintree, Checkout.com, PayPal, Primer, 3D Secure. Calls `GET /mcp/providers`.

---

## Resources

Read-only data Claude can browse without calling a tool.

| URI | Content |
|---|---|
| `payment-errors://providers` | JSON list of all supported PSPs |
| `payment-errors://registry/{provider}` | All error codes for a given PSP |

Example: `payment-errors://registry/stripe` returns all Stripe error codes with full details.

---

## Setup

### 1. Clone and build

```bash
git clone <repo-url>
cd pay-trace-ai/backend
npm install
npm run build
# produces dist/mcp/server.js
```

### 2. Get credentials

You need two values — ask the repo owner to send them to you:

| Variable | Description |
| --- | --- |
| `BACKEND_URL` | URL of the deployed backend (e.g. `https://your-app.up.railway.app`) |
| `MCP_API_KEY` | Shared secret that authenticates requests to the backend |

### 3. Configure Claude Desktop

Open (or create) `~/Library/Application Support/Claude/claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "pay-trace-ai": {
      "command": "node",
      "args": ["/absolute/path/to/pay-trace-ai/backend/dist/mcp/server.js"],
      "env": {
        "BACKEND_URL": "https://your-app.up.railway.app",
        "MCP_API_KEY": "the-secret-you-received"
      }
    }
  }
}
```

Replace the path in `args` with the actual absolute path on your machine (`pwd` inside `backend/` gives it to you).

### 4. Restart Claude Desktop

Fully quit (`Cmd+Q`) and reopen. The tools icon (hammer) in the chat input should now show the 4 tools.

---

## For the backend owner — deploying the API key

Add `MCP_API_KEY` to your Railway environment variables:

1. Railway dashboard → your backend service → **Variables**
2. Add `MCP_API_KEY=<random secret>` (generate one with `openssl rand -hex 32`)
3. Railway redeploys automatically

The key is checked on every request to `/mcp/*` routes via the `X-MCP-Key` header. All other routes (`/analyze`, `/health`) are unaffected.

---

## File Structure

```
backend/src/mcp/
├── server.ts        # MCP server — stdio transport, 4 tools, 2 resources
└── README.md        # This file

backend/src/controllers/
└── mcp.controller.ts  # Backend route handlers + auth middleware
```

---

## Scope Boundaries

**In scope:**
- Targeted lookups and semantic search
- Read-only access to the knowledge base

**Out of scope:**
- Full diagnosis (that's the `/analyze` endpoint — the full agentic loop)
- HTTP/SSE transport — stdio is sufficient for local use
- Writing to the knowledge base

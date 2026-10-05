# Pay Trace AI — MCP Server

Exposes the payment error knowledge base as an MCP server so any MCP-compatible client (Claude Desktop, Cursor, etc.) can query it directly.

A developer debugging a payment failure can ask Claude Desktop:
> *"What does Adyen refusal code 12 mean and how do I handle it?"*

Claude calls this server and returns an answer grounded in the actual knowledge base, not training data.

---

## Transport

**stdio** — runs as a local child process. No HTTP server, no auth. Works out of the box with Claude Desktop.

---

## Tools

| Tool | Description | Input |
|---|---|---|
| `lookup_error_code` | Exact lookup by error code and optional PSP | `code: string`, `provider?: string` |
| `get_provider_codes` | All error codes for a given PSP | `provider: string` |
| `search_payment_errors` | Semantic search across the vector knowledge base | `query: string`, `limit?: number` |
| `list_providers` | Lists all supported payment service providers | — |

### Tool details

**`lookup_error_code`**
Returns meaning, cause, fix, and whether the error is retryable. Wraps `lookupErrorCode()` from `tools/registry.ts`. Supports provider-prefixed lookup to resolve collisions (e.g. Adyen code `2` vs Primer code `02`).

**`get_provider_codes`**
Returns all known error codes for a PSP. Useful for building reference tables or checking coverage. Wraps `getErrorCodesByProvider()` from `tools/registry.ts`.

**`search_payment_errors`**
Semantic vector search via Voyage AI embeddings + Supabase pgvector. Finds relevant entries even when the exact code is unknown — e.g. *"card blocked by fraud system"*. Wraps the existing RAG search in `rag/search.ts`.

**`list_providers`**
Returns the list of PSPs covered: Stripe, Adyen, Braintree, Checkout.com, PayPal, Primer, Toss Payments, 3D Secure.

---

## Resources

Read-only data Claude can browse without calling a tool.

| URI | Content |
|---|---|
| `payment-errors://providers` | JSON list of all supported PSPs |
| `payment-errors://registry/{provider}` | All error codes for a given PSP |

Example: `payment-errors://registry/stripe` returns all Stripe error codes with full details.

---

## Implementation Plan

### 1. Install SDK

```bash
cd backend
npm install @modelcontextprotocol/sdk
```

### 2. Create `backend/src/mcp/server.ts`

- Import `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
- Import `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`
- Register 4 tools using `server.tool()`
- Register 2 resources using `server.resource()`
- Reuse `lookupErrorCode`, `getErrorCodesByProvider`, `getAllErrorCodes` from `tools/registry.ts`
- Reuse semantic search from `rag/search.ts`
- Connect via `new StdioServerTransport()` and call `server.connect(transport)`

### 3. Add build script to `package.json`

```json
"mcp": "node dist/mcp/server.js"
```

### 4. Wire up Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pay-trace-ai": {
      "command": "node",
      "args": ["/absolute/path/to/backend/dist/mcp/server.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_KEY": "your-service-key",
        "VOYAGE_API_KEY": "your-voyage-key"
      }
    }
  }
}
```

---

## File Structure

```
backend/src/mcp/
├── server.ts        # MCP server entry point
└── README.md        # This file
```

The server reuses existing modules — no business logic is duplicated:

```
tools/registry.ts    → lookup_error_code, get_provider_codes, list_providers
rag/search.ts        → search_payment_errors
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

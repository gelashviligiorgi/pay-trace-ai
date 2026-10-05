import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, '');
const MCP_API_KEY = process.env.MCP_API_KEY;

if (!BACKEND_URL || !MCP_API_KEY) {
  process.stderr.write('Missing required env vars: BACKEND_URL, MCP_API_KEY\n');
  process.exit(1);
}

async function mcpFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'x-mcp-key': MCP_API_KEY as string },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Backend error ${res.status}: ${body}`);
  }
  return res.json();
}

const PROVIDER_IDS = [
  'stripe',
  'adyen',
  'braintree',
  'checkout.com',
  'paypal',
  'primer',
  '3ds',
] as const;

const server = new McpServer({ name: 'pay-trace-ai', version: '1.0.0' });

const providerEnum = z.enum(PROVIDER_IDS);

const lookupInput = z.object({
  code: z.string().describe('The error code to look up'),
  provider: providerEnum
    .optional()
    .describe(`Payment provider — one of: ${PROVIDER_IDS.join(', ')}`),
});

const providerInput = z.object({
  provider: providerEnum.describe(`Provider — one of: ${PROVIDER_IDS.join(', ')}`),
});

const searchInput = z.object({
  query: z.string().describe('Natural language search query'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe('Maximum results to return (default 5)'),
});

server.registerTool(
  'lookup_error_code',
  {
    description:
      'Exact lookup by error code and optional PSP. Returns meaning, cause, fix, and whether retryable.',
    inputSchema: lookupInput,
  },
  async ({ code, provider }) => {
    const params = new URLSearchParams({ code });
    if (provider) params.set('provider', provider);
    try {
      const result = await mcpFetch(`/mcp/lookup?${params}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text' as const, text: msg }] };
    }
  },
);

server.registerTool(
  'get_provider_codes',
  {
    description: 'All error codes for a given payment service provider.',
    inputSchema: providerInput,
  },
  async ({ provider }) => {
    const result = await mcpFetch(`/mcp/provider-codes?provider=${provider}`);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  'search_payment_errors',
  {
    description:
      'Semantic search across the payment error knowledge base. Use when the exact code is unknown — e.g. "card blocked by fraud system".',
    inputSchema: searchInput,
  },
  async ({ query, limit }) => {
    const params = new URLSearchParams({ q: query });
    if (limit !== undefined) params.set('limit', String(limit));
    const result = await mcpFetch(`/mcp/search?${params}`);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  'list_providers',
  { description: 'Lists all supported payment service providers.' },
  async () => {
    const result = await mcpFetch('/mcp/providers');
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  },
);

server.registerResource(
  'providers',
  'payment-errors://providers',
  { description: 'JSON list of all supported PSPs', mimeType: 'application/json' },
  async (uri) => {
    const result = await mcpFetch('/mcp/providers');
    return {
      contents: [{ uri: uri.href, text: JSON.stringify(result), mimeType: 'application/json' }],
    };
  },
);

server.registerResource(
  'registry',
  new ResourceTemplate('payment-errors://registry/{provider}', { list: undefined }),
  { description: 'All error codes for a given PSP', mimeType: 'application/json' },
  async (uri, { provider }) => {
    const result = await mcpFetch(`/mcp/provider-codes?provider=${provider}`);
    return {
      contents: [
        { uri: uri.href, text: JSON.stringify(result, null, 2), mimeType: 'application/json' },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`MCP server error: ${String(err)}\n`);
  process.exit(1);
});

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';
import { lookupErrorCode, getErrorCodesByProvider } from '../tools/registry.js';
import { searchKnowledgeBase } from '../rag/search.js';

const PROVIDER_IDS = [
  'stripe',
  'adyen',
  'braintree',
  'checkout.com',
  'paypal',
  'primer',
  '3ds',
] as const;

const PROVIDER_DISPLAY: Record<(typeof PROVIDER_IDS)[number], string> = {
  'stripe': 'Stripe',
  'adyen': 'Adyen',
  'braintree': 'Braintree',
  'checkout.com': 'Checkout.com',
  'paypal': 'PayPal',
  'primer': 'Primer',
  '3ds': '3D Secure',
};

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
    const result = lookupErrorCode(code, provider);
    if (!result) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No entry found for code "${code}"${provider ? ` (provider: ${provider})` : ''}.`,
          },
        ],
      };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  'get_provider_codes',
  {
    description: 'All error codes for a given payment service provider.',
    inputSchema: providerInput,
  },
  async ({ provider }) => {
    const codes = getErrorCodesByProvider(provider);
    return { content: [{ type: 'text' as const, text: JSON.stringify(codes, null, 2) }] };
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
    const results = await searchKnowledgeBase(query, limit ?? 5);
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  },
);

server.registerTool(
  'list_providers',
  { description: 'Lists all supported payment service providers.' },
  async () => ({
    content: [{ type: 'text' as const, text: JSON.stringify(PROVIDER_DISPLAY) }],
  }),
);

server.registerResource(
  'providers',
  'payment-errors://providers',
  { description: 'JSON list of all supported PSPs', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(PROVIDER_DISPLAY), mimeType: 'application/json' }],
  }),
);

server.registerResource(
  'registry',
  new ResourceTemplate('payment-errors://registry/{provider}', { list: undefined }),
  { description: 'All error codes for a given PSP', mimeType: 'application/json' },
  async (uri, { provider }) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(getErrorCodesByProvider(provider as string), null, 2),
        mimeType: 'application/json',
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`MCP server error: ${String(err)}\n`);
  process.exit(1);
});

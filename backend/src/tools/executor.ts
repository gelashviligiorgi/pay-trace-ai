/**
 * Tool executor - routes tool calls to implementations and returns formatted results
 */

import { searchKnowledgeBase } from '../rag/search.js';
import { lookupErrorCode } from './registry.js';

/**
 * Execute a tool and return formatted result string
 *
 * @param name - The name of the tool to execute
 * @param input - The input parameters for the tool
 * @returns Formatted result string
 */
export async function executeTool(
  name: string,
  input: Record<string, any>
): Promise<string> {
  const startTime = Date.now();

  try {
    let result: string;

    switch (name) {
      case 'search_knowledge_base':
        result = await handleSearchKnowledgeBase(input);
        break;

      case 'lookup_error_code':
        result = await handleLookupErrorCode(input);
        break;

      case 'check_psp_status':
        result = await handleCheckPspStatus(input);
        break;

      default:
        result = `Error: Unknown tool "${name}"`;
        console.error(`[Tool] Unknown tool: ${name}`);
        return result;
    }

    const duration = Date.now() - startTime;
    logToolExecution(name, input, duration, result);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Tool] ${name} | ERROR: ${errorMessage} | duration: ${duration}ms`);
    return `Error executing tool "${name}": ${errorMessage}`;
  }
}

/**
 * Handle search_knowledge_base tool
 */
async function handleSearchKnowledgeBase(input: Record<string, any>): Promise<string> {
  const { query } = input;

  if (!query || typeof query !== 'string') {
    return 'Error: Missing or invalid "query" parameter';
  }

  const results = await searchKnowledgeBase(query, 5);

  if (results.length === 0) {
    return `No relevant documentation found for query: "${query}"`;
  }

  // Format results as readable string
  let formatted = `Found ${results.length} relevant chunk${results.length === 1 ? '' : 's'}:\n\n`;

  for (const result of results) {
    formatted += `[${result.source}] (similarity: ${result.similarity.toFixed(3)})\n`;
    formatted += `${result.content}\n\n`;
    formatted += '---\n\n';
  }

  return formatted.trim();
}

/**
 * Handle lookup_error_code tool
 */
async function handleLookupErrorCode(input: Record<string, any>): Promise<string> {
  const { code, provider } = input;

  if (!code || typeof code !== 'string') {
    return 'Error: Missing or invalid "code" parameter';
  }

  const entry = lookupErrorCode(code, provider);

  if (!entry) {
    let message = `No exact match found for code: "${code}"`;
    if (provider) {
      message += ` in provider: "${provider}"`;
    }
    return message;
  }

  // Format error code entry as readable string
  const formatted = `
Error Code: ${entry.code}
Source: ${entry.source}
Meaning: ${entry.meaning}
Cause: ${entry.cause}
Retryable: ${entry.retryable ? 'Yes' : 'No'}
Fix: ${entry.fix}
  `.trim();

  return formatted;
}

/**
 * Handle check_psp_status tool
 */
async function handleCheckPspStatus(input: Record<string, any>): Promise<string> {
  const { provider } = input;

  if (!provider || typeof provider !== 'string') {
    return 'Error: Missing or invalid "provider" parameter';
  }

  // TODO: Replace with real status page fetch
  // For now, return mock response
  // Future implementation should:
  // 1. Fetch from provider status API or scrape status page
  // 2. Parse operational status
  // 3. Return actual status information

  const validProviders = ['braintree', 'paypal', 'toss', 'stripe'];
  const normalizedProvider = provider.toLowerCase();

  if (!validProviders.includes(normalizedProvider)) {
    return `Error: Unknown provider "${provider}". Valid providers: ${validProviders.join(', ')}`;
  }

  const statusPageUrls: Record<string, string> = {
    braintree: 'https://status.braintreepayments.com/',
    paypal: 'https://www.paypal-status.com/',
    toss: 'https://status.tosspayments.com/',
    stripe: 'https://status.stripe.com/',
  };

  // Mock response
  const response = {
    provider: normalizedProvider,
    status: 'operational',
    last_checked: new Date().toISOString(),
    status_page: statusPageUrls[normalizedProvider],
    note: 'This is a mock response. Real-time status checking not yet implemented.',
  };

  return JSON.stringify(response, null, 2);
}

/**
 * Log tool execution to console
 */
function logToolExecution(
  toolName: string,
  input: Record<string, any>,
  duration: number,
  result: string
): void {
  // Build input summary
  const inputSummary = Object.entries(input)
    .map(([key, value]) => `${key}: "${value}"`)
    .join(', ');

  // Count results/chunks for search tool
  let resultsSummary = '';
  if (toolName === 'search_knowledge_base') {
    const chunkCount = (result.match(/\[.*?\]/g) || []).length;
    resultsSummary = ` | results: ${chunkCount} chunks`;
  } else if (toolName === 'lookup_error_code') {
    resultsSummary = result.includes('No exact match') ? ' | results: not found' : ' | results: found';
  }

  console.log(`[Tool] ${toolName} | ${inputSummary} | duration: ${duration}ms${resultsSummary}`);
}

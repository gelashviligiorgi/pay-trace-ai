/**
 * Tool definitions for Claude API
 * These define the tools available for the AI to use when analyzing payment errors
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const TOOLS: Tool[] = [
  {
    name: 'search_knowledge_base',
    description:
      'Search the payment documentation knowledge base for information relevant to an error code or message. Use this to find PSP-specific documentation, error meanings, causes, and recommended fixes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'The search query - can be an error code, error message, or natural language description of the problem',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'lookup_error_code',
    description:
      'Look up a specific error code directly from the structured error code registry. Use this when you have an exact error code like 2001, FRAUD_DETECTED, or authenticate_failed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string' as const,
          description: 'The exact error code to look up (e.g., "2001", "FRAUD_DETECTED", "authenticate_failed")',
        },
        provider: {
          type: 'string' as const,
          description: 'Optional: Filter by specific payment provider (e.g., "braintree", "paypal", "toss", "3ds")',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'check_psp_status',
    description:
      'Check the current operational status of a payment provider. Use this when the error suggests a provider-side outage or technical issue such as PROVIDER_ERROR or lookup_error.',
    input_schema: {
      type: 'object' as const,
      properties: {
        provider: {
          type: 'string' as const,
          enum: ['braintree', 'paypal', 'toss', 'stripe'],
          description: 'The payment service provider to check status for',
        },
      },
      required: ['provider'],
    },
  },
];

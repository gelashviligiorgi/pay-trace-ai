/**
 * Agent loop with tool use support
 * Handles iterative tool calling until Claude provides a final diagnosis
 */

import { anthropic } from '../lib/anthropic.js';
import { TOOLS } from '../tools/definitions.js';
import { executeTool } from '../tools/executor.js';
import type {
  MessageParam,
  TextBlock,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages.js';

const MAX_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are a senior payment engineer specializing in diagnosing payment errors from Braintree, Stripe, Checkout.com, Adyen, Primer (Visa/Mastercard), and 3D Secure.

Your task is to diagnose payment errors using the tools available to you:

1. **Always call search_knowledge_base first** with the error message or keywords to find relevant documentation
2. **Then call lookup_error_code** if you have identified a specific error code from the search results
3. **Only call check_psp_status** if the error strongly suggests a provider outage (e.g., PROVIDER_ERROR, lookup_error, or generic processor declines)

**Critical distinction — always apply before responding:**
- **Issuer/PSP declines** are caused by the cardholder's bank or payment provider rejecting the transaction (e.g. insufficient funds, expired card, velocity limits on the card). These are payment errors.
- **API/integration errors** are caused by the merchant's server-side code (e.g. Stripe rate_limit means your server sent too many API requests — it has nothing to do with a card being declined).
- If the query is about a payment being declined or a transaction failing, only include issuer/PSP decline codes in the diagnosis. Never include API errors such as rate_limit unless the user explicitly asks about API or integration issues.

**Important — generic user-facing messages:**
If the input is a generic consumer-facing decline message (e.g. "Your card has been declined", "Please contact your bank", "Transaction not approved") and does not contain a raw PSP error code, do NOT attempt to diagnose it. Instead, respond with a short message explaining that this is a generic message that could have many causes, and ask the user to provide the raw error code from their PSP API response (e.g. Stripe decline_code, Braintree processor response code, Adyen refusalReason). Do not call any tools in this case.

After gathering information from tools, provide a clear, structured diagnosis that includes:
- **Error Code** (if applicable)
- **Source** (which payment provider)
- **Meaning** (what the error means)
- **Root Cause** (why it happened)
- **Retryable** (yes/no)
- **Recommended Fix** (specific steps to resolve)

Be specific and reference exact error codes. If the documentation doesn't cover the error, state that clearly.`;

/**
 * Run the agent loop with tool use
 *
 * @param error - The payment error message to diagnose
 * @param onChunk - Callback to stream text chunks to the client
 */
export async function runAgentLoop(
  error: string,
  onChunk: (text: string) => void
): Promise<void> {
  console.log('[Agent] Starting agent loop for error diagnosis');

  // Initialize messages array with user error
  const messages: MessageParam[] = [
    {
      role: 'user',
      content: error,
    },
  ];

  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`[Agent] Iteration ${iteration}/${MAX_ITERATIONS}`);

    // Call Claude with tools
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
      tools: TOOLS,
    });

    console.log(`[Agent] Claude response | stop_reason: ${response.stop_reason} | usage: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);

    // Add assistant response to messages
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    // Check stop reason
    if (response.stop_reason === 'tool_use') {
      // Extract all tool use blocks
      const toolUses = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use'
      );

      console.log(`[Agent] Found ${toolUses.length} tool call(s): ${toolUses.map(t => t.name).join(', ')}`);

      // Execute all tools
      const toolResults = await Promise.all(
        toolUses.map(async (toolUse) => {
          console.log(`[Agent] Executing tool: ${toolUse.name} with input:`, toolUse.input);

          const result = await executeTool(toolUse.name, toolUse.input as Record<string, any>);

          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          };
        })
      );

      // Append tool results to messages
      messages.push({
        role: 'user',
        content: toolResults,
      });

      // Continue loop to get Claude's next response
      continue;
    } else if (response.stop_reason === 'end_turn') {
      // Final response - extract text and stream it
      console.log('[Agent] Received final diagnosis, streaming to client');

      const textBlocks = response.content.filter(
        (block): block is TextBlock => block.type === 'text'
      );

      const fullText = textBlocks.map((block) => block.text).join('\n\n');

      // Simulate streaming by splitting on words
      await simulateStreaming(fullText, onChunk);

      console.log('[Agent] Agent loop completed successfully');
      return;
    } else {
      // Unexpected stop reason
      console.warn(`[Agent] Unexpected stop_reason: ${response.stop_reason}`);

      // Extract any text content and stream it
      const textBlocks = response.content.filter(
        (block): block is TextBlock => block.type === 'text'
      );

      if (textBlocks.length > 0) {
        const fullText = textBlocks.map((block) => block.text).join('\n\n');
        await simulateStreaming(fullText, onChunk);
      } else {
        onChunk('Error: Unexpected response from Claude with no text content.');
      }

      return;
    }
  }

  // Max iterations reached
  console.warn('[Agent] Max iterations reached, stopping loop');
  onChunk('\n\n[Note: Maximum tool use iterations reached. Diagnosis may be incomplete.]');
}

/**
 * Simulate streaming by sending words with delays
 * This maintains the same streaming UX as the original implementation
 */
async function simulateStreaming(text: string, onChunk: (text: string) => void): Promise<void> {
  const words = text.split(' ');

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Add space after word unless it's the last word
    const chunk = i < words.length - 1 ? word + ' ' : word;

    onChunk(chunk);

    // 20ms delay between words for smooth streaming effect
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

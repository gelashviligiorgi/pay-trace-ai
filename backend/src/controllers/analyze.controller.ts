import { Request, Response } from 'express';
import { z } from 'zod';
import { DiagnosisResponse, ErrorResponse } from '../types/index.js';
import { anthropic } from '../lib/anthropic.js';
import { searchKnowledgeBase } from '../rag/search.js';

// Zod schema for validation
const analyzeRequestSchema = z.object({
  error: z.string().min(1, 'Error message cannot be empty'),
});

export const analyzeError = async (
  req: Request,
  res: Response<DiagnosisResponse | ErrorResponse | { message: string } | { diagnosis: string }>
) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validation = analyzeRequestSchema.safeParse(req.body);

    if (!validation.success) {
      console.log('[Analyze] Validation failed:', validation.error.format());
      res.status(400).json({
        error: 'Invalid request',
        details: validation.error.format(),
      });
      return;
    }

    const { error } = validation.data;
    console.log('[Analyze] Processing error analysis request, error length:', error.length);

    // Step 1: Search knowledge base for relevant context
    console.log('[RAG] Searching knowledge base for:', error.substring(0, 100));
    const ragChunks = await searchKnowledgeBase(error, 5);

    // Log RAG retrieval results
    console.log('[RAG] Retrieved chunks:', {
      count: ragChunks.length,
      sources: [...new Set(ragChunks.map(c => c.source))],
      similarities: ragChunks.map(c => c.similarity.toFixed(3)),
    });

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Check if mock mode is enabled
    if (process.env.USE_MOCK_AI === 'true') {
      console.log('[Analyze] Using mock AI response with streaming');
      const mockText = 'Payment declined due to insufficient funds. The customer\'s account balance is too low to complete this transaction. Ask the customer to use a different payment method or add funds to their account.';
      const words = mockText.split(' ');

      // Simulate streaming by sending words with delay
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ chunk: word + ' ' })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    const documentationContext = ragChunks.length > 0
      ? ragChunks.map(chunk => chunk.content).join('\n\n---\n\n')
      : 'No relevant documentation found.';

    const systemPrompt = `You are a senior payment engineer specializing in PSP errors from Braintree, PayPal, Mastercard, and Toss.

Use the following documentation to inform your diagnosis:

<documentation>
${documentationContext}
</documentation>

Be specific. Reference the exact error codes and causes from the documentation above. If the documentation does not cover the error, say so clearly.`;

    console.log('[Analyze] Calling Anthropic API with streaming, model: claude-sonnet-4-20250514');

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: error,
        },
      ],
    });

    // Handle stream events
    stream.on('text', (text: string) => {
      res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    });

    stream.on('error', (streamError: Error) => {
      console.error('[Analyze] Stream error:', {
        error: streamError.message,
        stack: streamError.stack,
      });
      res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
      res.end();
    });

    // Wait for stream to complete
    const finalMessage = await stream.finalMessage();

    const duration = Date.now() - startTime;
    console.log('[Analyze] Anthropic API stream completed', {
      duration: `${duration}ms`,
      model: finalMessage.model,
      stopReason: finalMessage.stop_reason,
      usage: {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      },
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Analyze] Error processing request', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // If headers not sent yet, send JSON error
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } else {
      // If streaming already started, send error as SSE
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
    }
  }
};

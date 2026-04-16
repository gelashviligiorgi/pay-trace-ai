import { Request, Response } from 'express';
import { z } from 'zod';
import { DiagnosisResponse, ErrorResponse } from '../types/index.js';
import { runAgentLoop } from '../agent/loop.js';

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

    // Run agent loop with tool use
    console.log('[Analyze] Starting agent loop with tool use');

    await runAgentLoop(error, (chunk: string) => {
      // Stream each chunk to the client via SSE
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    const duration = Date.now() - startTime;
    console.log('[Analyze] Agent loop completed', {
      duration: `${duration}ms`,
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

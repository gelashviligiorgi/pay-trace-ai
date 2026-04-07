import { Request, Response } from 'express';
import { z } from 'zod';
import { DiagnosisResponse, ErrorResponse } from '../types/index.js';
import { anthropic } from '../lib/anthropic.js';

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

    // Check if mock mode is enabled
    if (process.env.USE_MOCK_AI === 'true') {
      console.log('[Analyze] Using mock AI response');
      const mockResponse: DiagnosisResponse = {
        diagnosis: 'Payment declined due to insufficient funds',
        cause: "The customer's account balance is too low to complete this transaction",
        suggestion: 'Ask the customer to use a different payment method or add funds to their account',
        psp: 'stripe',
      };
      res.json(mockResponse);
      return;
    }

    // Call Anthropic API
    console.log('[Analyze] Calling Anthropic API with model: claude-sonnet-4-20250514');
    const systemPrompt = `You are an expert payment systems engineer. You diagnose payment errors clearly and concisely. Always explain: what the error means, the likely cause, and what the developer should do next.`;

    const message = await anthropic.messages.create({
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

    const duration = Date.now() - startTime;
    console.log('[Analyze] Anthropic API response received', {
      duration: `${duration}ms`,
      model: message.model,
      stopReason: message.stop_reason,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });

    const textContent = message.content.find((block) => block.type === 'text');

    if (!textContent || textContent.type !== 'text') {
      console.error('[Analyze] No text content in Anthropic response');
      throw new Error('No text content in Anthropic response');
    }

    res.json({ diagnosis: textContent.text });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Analyze] Error processing request', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

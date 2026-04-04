import { Request, Response } from 'express';
import { z } from 'zod';
import { DiagnosisResponse, ErrorResponse } from '../types/index.js';

// Zod schema for validation
const analyzeRequestSchema = z.object({
  error: z.string().min(1, 'Error message cannot be empty'),
});

export const analyzeError = async (
  req: Request,
  res: Response<DiagnosisResponse | ErrorResponse | { message: string }>
) => {
  try {
    // Validate request body
    const validation = analyzeRequestSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: validation.error.format(),
      });
      return;
    }

    const { error } = validation.data;

    // Check if mock mode is enabled
    if (process.env.USE_MOCK_AI === 'true') {
      const mockResponse: DiagnosisResponse = {
        diagnosis: 'Payment declined due to insufficient funds',
        cause: "The customer's account balance is too low to complete this transaction",
        suggestion: 'Ask the customer to use a different payment method or add funds to their account',
        psp: 'stripe',
      };
      res.json(mockResponse);
      return;
    }

    // AI not wired up yet
    res.json({ message: 'AI not wired up yet' });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

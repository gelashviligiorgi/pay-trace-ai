import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { HealthResponse } from '../types/index.js';

export const healthCheck = async (_req: Request, res: Response<HealthResponse>) => {
  const healthResponse: HealthResponse = {
    status: 'ok',
    supabase: {
      connected: false,
    },
    anthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
    mockMode: process.env.USE_MOCK_AI === 'true',
  };

  try {
    // Ping Supabase by selecting from knowledge_base
    const { error } = await supabase
      .from('knowledge_base')
      .select('id')
      .limit(1);

    if (error) {
      healthResponse.supabase = {
        connected: false,
        error: error.message,
      };
    } else {
      healthResponse.supabase = {
        connected: true,
      };
    }
  } catch (error) {
    healthResponse.supabase = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  res.json(healthResponse);
};

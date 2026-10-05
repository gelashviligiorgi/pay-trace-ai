import { Request, Response, NextFunction } from 'express';
import { lookupErrorCode, getErrorCodesByProvider } from '../tools/registry.js';
import { searchKnowledgeBase } from '../rag/search.js';

const MCP_API_KEY = process.env.MCP_API_KEY;

export function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  if (!MCP_API_KEY) {
    res.status(500).json({ error: 'MCP_API_KEY not configured on server' });
    return;
  }
  if (req.headers['x-mcp-key'] !== MCP_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function mcpLookup(req: Request, res: Response): void {
  const code = req.query['code'];
  const provider = req.query['provider'];

  if (typeof code !== 'string' || !code) {
    res.status(400).json({ error: 'Missing required query param: code' });
    return;
  }

  const result = lookupErrorCode(code, typeof provider === 'string' ? provider : undefined);
  if (!result) {
    res.status(404).json({ error: `No entry found for code "${code}"` });
    return;
  }
  res.json(result);
}

export function mcpProviderCodes(req: Request, res: Response): void {
  const provider = req.query['provider'];

  if (typeof provider !== 'string' || !provider) {
    res.status(400).json({ error: 'Missing required query param: provider' });
    return;
  }

  res.json(getErrorCodesByProvider(provider));
}

export async function mcpSearch(req: Request, res: Response): Promise<void> {
  const query = req.query['q'];
  const limitRaw = req.query['limit'];

  if (typeof query !== 'string' || !query) {
    res.status(400).json({ error: 'Missing required query param: q' });
    return;
  }

  const limit = limitRaw !== undefined ? parseInt(String(limitRaw), 10) : 5;
  if (isNaN(limit) || limit < 1 || limit > 20) {
    res.status(400).json({ error: 'limit must be an integer between 1 and 20' });
    return;
  }

  const results = await searchKnowledgeBase(query, limit);
  res.json(results);
}

export function mcpProviders(_req: Request, res: Response): void {
  res.json([
    { id: 'stripe', name: 'Stripe' },
    { id: 'adyen', name: 'Adyen' },
    { id: 'braintree', name: 'Braintree' },
    { id: 'checkout.com', name: 'Checkout.com' },
    { id: 'paypal', name: 'PayPal' },
    { id: 'primer', name: 'Primer' },
    { id: '3ds', name: '3D Secure' },
  ]);
}

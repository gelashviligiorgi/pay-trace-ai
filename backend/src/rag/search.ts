import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createRequire } from 'node:module';

// https://github.com/voyage-ai/typescript-sdk/issues/26 workaround until this will be fixed
const require = createRequire(import.meta.url);
const { VoyageAIClient } = require('voyageai');

config({ path: '.env.local' });
config();

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!VOYAGE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variables: VOYAGE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface KnowledgeBaseMatch {
  content: string;
  source: string;
  similarity: number;
}

/**
 * Search the knowledge base using semantic similarity
 *
 * @param query - The search query string
 * @param limit - Maximum number of results to return (default: 5)
 * @returns Array of matching knowledge base entries with similarity scores
 */
export async function searchKnowledgeBase(
  query: string,
  limit: number = 5,
  source?: string
): Promise<KnowledgeBaseMatch[]> {
  const voyage = new VoyageAIClient({ apiKey: VOYAGE_API_KEY });

  const res = await voyage.embed({
    model: 'voyage-large-2',
    input: [query],
  });

  const vector = res.data?.[0]?.embedding;

  if (!vector) {
    throw new Error('Failed to generate embedding for query');
  }

  const { data, error } = await supabase.rpc('match_knowledge_base', {
    query_embedding: vector,
    match_threshold: 0.3,
    match_count: source ? limit * 4 : limit,
  });

  if (error) {
    throw new Error(`Failed to search knowledge base: ${error.message}`);
  }

  const results: KnowledgeBaseMatch[] = (data || []).map((row: any) => ({
    content: row.content,
    source: row.source,
    similarity: row.similarity,
  }));

  if (source) {
    const filtered = results.filter((r) => r.source === source);
    return filtered.slice(0, limit);
  }

  return results;
}

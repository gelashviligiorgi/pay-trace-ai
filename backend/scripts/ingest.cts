const { VoyageAIClient } = require('voyageai');
const { createClient } = require('@supabase/supabase-js');
const { readdir, readFile } = require('fs/promises');
const { join } = require('path');
const { config } = require('dotenv');

// Load environment variables - .env.local takes precedence
config({ path: '.env.local' });
config();

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!VOYAGE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required environment variables: VOYAGE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
}

const voyage = new VoyageAIClient({ apiKey: VOYAGE_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const KNOWLEDGE_BASE_PATH = join(__dirname, '../knowledge-base');
const BATCH_SIZE = 1; // Process 1 chunk at a time due to strict rate limits
const DELAY_MS = 30000; // 30 seconds between requests (3 RPM = 20s minimum, extra buffer for safety)
const CHUNK_WORD_LIMIT = 500;

/**
 * Split content into chunks respecting blank line boundaries
 */
function chunkContent(content: string): string[] {
  const blocks = content.split(/\n\n+/); // Split by blank lines
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const block of blocks) {
    const blockWords = block.trim().split(/\s+/).length;

    // If adding this block would exceed limit and we have content, start new chunk
    if (currentWordCount + blockWords > CHUNK_WORD_LIMIT && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [block];
      currentWordCount = blockWords;
    } else {
      currentChunk.push(block);
      currentWordCount += blockWords;
    }
  }

  // Add remaining content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Process chunks in batches and get embeddings with rate limiting
 */
async function embedChunks(chunks: string[], fileName: string): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  console.log(`  Note: Using rate limiting (${BATCH_SIZE} chunks per batch, ${DELAY_MS / 1000}s delay)`);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    // Wait before making request (including first request)
    if (i > 0 || batchNumber > 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`  Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)...`);

    // Retry logic for rate limiting
    let retries = 0;
    let success = false;
    let res;

    while (!success && retries < 3) {
      try {
        res = await voyage.embed({
          model: 'voyage-large-2',
          input: batch,
        });
        success = true;
      } catch (error: any) {
        if (error.statusCode === 429 && retries < 2) {
          retries++;
          const waitTime = 60000; // Wait 60 seconds on rate limit
          console.log(`  ⚠️  Rate limit hit. Waiting ${waitTime / 1000}s before retry ${retries}/3...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw error;
        }
      }
    }

    if (!res) {
      throw new Error('Failed to get embeddings after retries');
    }

    // Extract embeddings from response data
    const batchEmbeddings = res.data?.map((item: any) => item.embedding || []) || [];
    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}

/**
 * Ingest a single file into Supabase
 */
async function ingestFile(filePath: string, fileName: string): Promise<number> {
  const content = await readFile(filePath, 'utf-8');
  const source = fileName.replace('.txt', '');

  // Split into chunks
  const chunks = chunkContent(content);

  if (chunks.length === 0) {
    console.log(`⚠️  ${fileName}: No content to ingest`);
    return 0;
  }

  // Get embeddings with rate limiting
  console.log(`📄 Processing ${fileName}...`);
  const embeddings = await embedChunks(chunks, fileName);

  // Prepare records for upsert
  const records = chunks.map((chunk, idx) => ({
    content: chunk,
    embedding: embeddings[idx],
    source,
  }));

  // Upsert into Supabase
  const { error } = await supabase
    .from('knowledge_base')
    .insert(records);

  if (error) {
    throw new Error(`Failed to insert chunks for ${fileName}: ${error.message}`);
  }

  console.log(`✅ ${fileName}: ${chunks.length} chunks inserted\n`);
  return chunks.length;
}

/**
 * Main ingestion function
 */
async function main() {
  console.log('🚀 Starting knowledge base ingestion...\n');

  try {
    // Read all .txt files from knowledge-base folder
    const files = await readdir(KNOWLEDGE_BASE_PATH);
    const txtFiles = files.filter(f => f.endsWith('.txt'));

    if (txtFiles.length === 0) {
      console.log('⚠️  No .txt files found in knowledge-base folder');
      return;
    }

    const summary: Record<string, number> = {};

    // Process each file
    for (const file of txtFiles) {
      const filePath = join(KNOWLEDGE_BASE_PATH, file);
      const chunkCount = await ingestFile(filePath, file);
      summary[file] = chunkCount;
    }

    // Print summary
    console.log('\n📊 Ingestion Summary:');
    console.log('─'.repeat(40));
    let totalChunks = 0;
    for (const [file, count] of Object.entries(summary)) {
      console.log(`  ${file.padEnd(25)} ${count} chunks`);
      totalChunks += count;
    }
    console.log('─'.repeat(40));
    console.log(`  Total: ${totalChunks} chunks\n`);
    console.log('✨ Ingestion complete!');

  } catch (error) {
    console.error('❌ Error during ingestion:', error);
    process.exit(1);
  }
}

main();

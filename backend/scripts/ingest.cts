const { VoyageAIClient } = require('voyageai');
const { createClient } = require('@supabase/supabase-js');
const { readdir, readFile } = require('fs/promises');
const { join } = require('path');
const { config } = require('dotenv');
const { createHash } = require('crypto');

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

/**
 * Generate SHA256 hash for content
 */
function generateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Split content into individual code entries (one chunk per code/error)
 * Each entry is separated by double blank lines and represents a single error code
 */
function chunkContent(content: string): string[] {
  // Split by double blank lines - each block is one enriched error code
  const blocks = content.split(/\n\n+/);

  // Filter out empty blocks and return each as its own chunk
  return blocks
    .map(block => block.trim())
    .filter(block => block.length > 0);
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
 * Ingest a single file into Supabase with differential sync
 */
async function ingestText(filePath: string, fileName: string): Promise<{ inserted: number; skipped: number; deleted: number }> {
  const content = await readFile(filePath, 'utf-8');
  const source = fileName.replace('.txt', '');

  console.log(`📄 Processing ${fileName}...`);

  // Step 1: Split into chunks
  const chunks = chunkContent(content);

  if (chunks.length === 0) {
    console.log(`⚠️  ${fileName}: No content to ingest`);
    return { inserted: 0, skipped: 0, deleted: 0 };
  }

  // Step 2: Generate hashes for all chunks
  const chunkHashes = chunks.map(chunk => ({
    content: chunk,
    hash: generateHash(chunk)
  }));

  // Step 3: Fetch existing hashes from Supabase (bulk read)
  console.log(`  Fetching existing chunks from database...`);
  const { data: existingChunks, error: fetchError } = await supabase
    .from('knowledge_base')
    .select('id, content_hash')
    .eq('source', source);

  if (fetchError) {
    throw new Error(`Failed to fetch existing chunks: ${fetchError.message}`);
  }

  // Step 4: Compare hashes on server (in-memory)
  const existingHashSet = new Set((existingChunks || []).map((c: any) => c.content_hash));
  const newChunks = chunkHashes.filter(ch => !existingHashSet.has(ch.hash));

  console.log(`  Found ${chunks.length} total chunks, ${newChunks.length} new/changed, ${chunks.length - newChunks.length} unchanged`);

  // Step 5: Generate embeddings ONLY for new chunks
  let embeddings: number[][] = [];
  if (newChunks.length > 0) {
    console.log(`  Generating embeddings for ${newChunks.length} new chunks...`);
    embeddings = await embedChunks(newChunks.map(ch => ch.content), fileName);
  } else {
    console.log(`  ✓ No new chunks to process`);
  }

  // Step 6: Delete old chunks that no longer exist
  const newHashSet = new Set(chunkHashes.map(ch => ch.hash));
  const chunksToDelete = (existingChunks || []).filter((c: any) => !newHashSet.has(c.content_hash));

  let deletedCount = 0;
  if (chunksToDelete.length > 0) {
    console.log(`  Deleting ${chunksToDelete.length} obsolete chunks...`);
    const { error: deleteError } = await supabase
      .from('knowledge_base')
      .delete()
      .in('id', chunksToDelete.map((c: any) => c.id));

    if (deleteError) {
      throw new Error(`Failed to delete obsolete chunks: ${deleteError.message}`);
    }
    deletedCount = chunksToDelete.length;
  }

  // Step 7: Insert new chunks with hashes
  if (newChunks.length > 0) {
    const records = newChunks.map((chunkData, idx) => ({
      content: chunkData.content,
      embedding: embeddings[idx],
      content_hash: chunkData.hash,
      source,
    }));

    const { error: insertError } = await supabase
      .from('knowledge_base')
      .insert(records);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }
  }

  const skippedCount = chunks.length - newChunks.length;
  console.log(`✅ ${fileName}: ${newChunks.length} inserted, ${skippedCount} skipped, ${deletedCount} deleted\n`);

  return { inserted: newChunks.length, skipped: skippedCount, deleted: deletedCount };
}

/**
 * Main ingestion function
 */
async function main() {
  console.log('🚀 Starting knowledge base ingestion with differential sync...\n');

  try {
    // Read all .txt files from knowledge-base folder
    const files = await readdir(KNOWLEDGE_BASE_PATH);
    const txtFiles = files.filter(f => f.endsWith('.txt'));

    if (txtFiles.length === 0) {
      console.log('⚠️  No .txt files found in knowledge-base folder');
      return;
    }

    const summary: Record<string, { inserted: number; skipped: number; deleted: number }> = {};

    // Process each file
    for (const file of txtFiles) {
      const filePath = join(KNOWLEDGE_BASE_PATH, file);
      const stats = await ingestText(filePath, file);
      summary[file] = stats;
    }

    // Print summary
    console.log('\n📊 Ingestion Summary:');
    console.log('─'.repeat(60));
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalDeleted = 0;

    for (const [file, stats] of Object.entries(summary)) {
      console.log(`  ${file.padEnd(25)} +${stats.inserted} ↻${stats.skipped} -${stats.deleted}`);
      totalInserted += stats.inserted;
      totalSkipped += stats.skipped;
      totalDeleted += stats.deleted;
    }
    console.log('─'.repeat(60));
    console.log(`  Total: ${totalInserted} inserted, ${totalSkipped} skipped, ${totalDeleted} deleted\n`);
    console.log('✨ Ingestion complete!');

  } catch (error) {
    console.error('❌ Error during ingestion:', error);
    process.exit(1);
  }
}

main();

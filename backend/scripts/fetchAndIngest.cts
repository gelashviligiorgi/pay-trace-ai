/**
 * Main orchestrator for fetching PSP documentation and saving to text files
 *
 * This script:
 * 1. Fetches documentation from various PSPs (Braintree, Stripe, etc.)
 * 2. Enriches the data with CAUSE, FIX, SYNONYMS
 * 3. Saves to .txt files in knowledge-base/ for version control
 *
 * After running this, use `npm run ingest` to generate embeddings and store in Supabase
 */

const { writeFileSync } = require('fs');
const { join } = require('path');
const { fetchBraintree } = require('./fetchers/braintree.cts');
const { fetchCheckout } = require('./fetchers/checkout.cts');
const { fetchAdyen } = require('./fetchers/adyen.cts');
const { fetchStripe } = require('./fetchers/stripe.cts');
const { fetchPrimer } = require('./fetchers/primer.cts');

/**
 * PSP fetcher registry
 * Add new PSPs here as you implement them
 */
const PSP_FETCHERS = [
  {
    name: 'Braintree',
    fetcher: fetchBraintree,
    filename: 'Braintree.txt',
  },
  {
    name: 'Checkout.com',
    fetcher: fetchCheckout,
    filename: 'Checkout.txt',
  },
  {
    name: 'Adyen',
    fetcher: fetchAdyen,
    filename: 'Adyen.txt',
  },
  {
    name: 'Stripe',
    fetcher: fetchStripe,
    filename: 'Stripe.txt',
  },
  {
    name: 'Primer',
    fetcher: fetchPrimer,
    filename: 'Primer.txt',
  },
];

/**
 * Save enriched chunks to a text file
 */
function saveToFile(filename: string, chunks: string[]): void {
  const content = chunks.join('\n\n');
  const outputPath = join(__dirname, '../knowledge-base', filename);
  writeFileSync(outputPath, content, 'utf-8');
  console.log(`\n✅ Saved to ${outputPath}`);
  console.log(`   Total chunks: ${chunks.length}`);
}

/**
 * Main function - orchestrates fetching from all PSPs
 */
async function main() {
  console.log('🚀 Starting PSP documentation fetch...\n');
  console.log(`📋 Will fetch from ${PSP_FETCHERS.length} PSP(s): ${PSP_FETCHERS.map(p => p.name).join(', ')}\n`);

  const summary: Record<string, { chunks: number; success: boolean; error?: string }> = {};

  for (const psp of PSP_FETCHERS) {
    try {
      console.log(`${'─'.repeat(60)}`);
      const chunks = await psp.fetcher();
      saveToFile(psp.filename, chunks);
      summary[psp.name] = { chunks: chunks.length, success: true };
    } catch (error: any) {
      console.error(`\n❌ Error fetching ${psp.name}:`, error.message);
      summary[psp.name] = { chunks: 0, success: false, error: error.message };
    }
  }

  // Print summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log('\n📊 Fetch Summary:');
  console.log('─'.repeat(60));

  for (const [name, stats] of Object.entries(summary)) {
    const status = stats.success ? '✅' : '❌';
    const chunks = stats.success ? `${stats.chunks} chunks` : `Failed: ${stats.error}`;
    console.log(`  ${status} ${name.padEnd(20)} ${chunks}`);
  }

  console.log('─'.repeat(60));

  const totalChunks = Object.values(summary)
    .filter(s => s.success)
    .reduce((sum, s) => sum + s.chunks, 0);

  const successCount = Object.values(summary).filter(s => s.success).length;
  const failCount = Object.values(summary).filter(s => !s.success).length;

  console.log(`  Total: ${successCount} succeeded, ${failCount} failed, ${totalChunks} chunks created\n`);

  if (successCount > 0) {
    console.log('✨ Fetch complete! Run `npm run ingest` to generate embeddings and store in Supabase.');
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main();

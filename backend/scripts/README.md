# PSP Documentation Fetching & Ingestion

This directory contains scripts for fetching PSP (Payment Service Provider) documentation, enriching it with actionable information, and ingesting it into the knowledge base.

## Directory Structure

```
scripts/
├── README.md                    # This file
├── fetchAndIngest.cts          # Main orchestrator - fetches all PSPs
├── ingest.cts                  # Ingests .txt files → Supabase with embeddings
├── fetchers/                   # PSP-specific fetchers
│   ├── braintree.cts          # Braintree processor codes
│   └── [future: stripe.cts, adyen.cts, etc.]
└── enrichers/                  # Shared enrichment logic
    └── processor-codes.cts    # Common enrichment for decline codes
```

## Workflow

### 1. Fetch Documentation (creates .txt files)

```bash
# Fetch all PSPs
npm run fetch

# Fetch specific PSP only
npm run fetch:braintree
```

This creates/updates text files in `backend/knowledge-base/` with enriched content.

### 2. Ingest to Supabase (creates embeddings)

```bash
npm run ingest
```

Reads all `.txt` files from `knowledge-base/` and:
- Generates embeddings via Voyage AI
- Stores in Supabase `knowledge_base` table
- Uses differential sync (only updates changed chunks)

### 3. Full Update (fetch + ingest)

```bash
npm run docs:update
```

Runs both fetch and ingest in sequence.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run fetch` | Fetch documentation from all PSPs |
| `npm run fetch:braintree` | Fetch only Braintree docs |
| `npm run ingest` | Generate embeddings and store in Supabase |
| `npm run docs:update` | Full refresh: fetch + ingest |

## Adding a New PSP

### Step 1: Create Fetcher

Create `scripts/fetchers/{psp-name}.cts`:

```typescript
const { buildEnrichedChunk } = require('../enrichers/processor-codes.cts');

export async function fetchMyPSP(): Promise<string[]> {
  console.log('\n📥 Fetching MyPSP documentation...');

  // 1. Fetch raw data (from API, scrape docs, etc.)
  const rawData = await fetchFromAPI();

  // 2. Parse and enrich
  const chunks = rawData.map(code =>
    buildEnrichedChunk(code, 'MyPSP')
  );

  return chunks;
}

// Allow standalone execution
if (require.main === module) {
  const { writeFileSync } = require('fs');
  const { join } = require('path');

  fetchMyPSP()
    .then(chunks => {
      const content = chunks.join('\n\n');
      const outputPath = join(__dirname, '../../knowledge-base', 'MyPSP.txt');
      writeFileSync(outputPath, content, 'utf-8');
      console.log(`✅ Saved to ${outputPath}`);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}
```

### Step 2: Register in fetchAndIngest.cts

Add to the `PSP_FETCHERS` array:

```typescript
const PSP_FETCHERS = [
  {
    name: 'Braintree',
    fetcher: fetchBraintree,
    filename: 'Braintree.txt',
  },
  {
    name: 'MyPSP',
    fetcher: fetchMyPSP,
    filename: 'MyPSP.txt',
  },
];
```

### Step 3: Add Script to package.json

```json
{
  "scripts": {
    "fetch:mypsp": "tsx scripts/fetchers/mypsp.cts"
  }
}
```

## Enrichment Format

Each processor code is enriched with:

```
SOURCE: {PSP name}
CODE: {error code}
MEANING: {original error message}
TYPE: {hard|soft} decline
RETRYABLE: {yes|no}
CAUSE: {inferred root cause}
FIX: {actionable resolution steps}
SYNONYMS: {natural language variations}
```

This format enables semantic search and provides actionable guidance to users.

## CI/CD Integration

You can automate documentation updates:

```yaml
# .github/workflows/update-docs.yml
name: Update PSP Docs
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:      # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm install
      - run: cd backend && npm run fetch
      - run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add backend/knowledge-base/
          git commit -m "chore: update PSP documentation" || exit 0
          git push
```

## Notes

- **Rate Limiting**: The ingest script respects Voyage AI rate limits (30s between chunks)
- **Differential Sync**: Only changed chunks are re-embedded (saves time & cost)
- **Version Control**: All .txt files are committed to git for auditability
- **Modularity**: Each PSP fetcher is independent and can be run standalone

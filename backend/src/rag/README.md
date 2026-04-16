# RAG Search Quality Tests

Comprehensive test suite for evaluating the quality and accuracy of the RAG (Retrieval-Augmented Generation) search functionality.

## Running Tests

**Important:** First, ensure knowledge base is ingested:
```bash
npm run ingest
```

Then run the tests:
```bash
npm run test:rag
```

**⏱️ Note on Rate Limits:** The test suite respects Voyage AI's 3 RPM rate limit by waiting 30 seconds between requests. With 50+ tests, expect the full suite to run for **~25-30 minutes**. Progress is shown in real-time.

## Test Categories

### 1. Exact Code Matches
Tests if the system accurately finds exact error codes:
- Direct code queries (e.g., "2001", "FRAUD_DETECTED")
- **Expected:** High similarity (>0.7), exact source match

### 2. Semantic Meaning Searches
Tests if similar meanings are found correctly:
- Natural language descriptions (e.g., "not enough money", "card is old")
- **Expected:** Medium similarity (>0.35), correct error code in results

### 3. Mixed Provider Contexts
Tests cross-provider understanding:
- Generic payment terms (e.g., "insufficient balance", "card expired")
- **Expected:** Multiple relevant results across providers

### 4. Technical vs. User Language
Tests natural language understanding:
- User-friendly descriptions (e.g., "my card doesn't have enough funds")
- **Expected:** Lower similarity (>0.3), but still finds correct errors

### 5. Partial/Fuzzy Matches
Tests typos and variations:
- Misspellings (e.g., "insufficent funds", "expird card")
- Provider-specific queries (e.g., "braintree 2010")
- **Expected:** Should still match despite typos

### 6. Edge Cases
Tests boundary conditions:
- Generic terms (e.g., "retryable error", "provider error")
- **Expected:** Lower similarity but relevant results

### 7. Combined Concepts
Tests multi-concept queries:
- Multiple concepts in one query (e.g., "card limit exceeded can I retry")
- **Expected:** Finds most relevant primary concept

### 8. Negative Tests
Tests what should NOT match well:
- Unrelated queries (e.g., "shipping delay", "refund process")
- **Expected:** Low similarity or no relevant matches

## Test Criteria

Each test case is evaluated on:

1. **Similarity Threshold**: Minimum cosine similarity score
2. **Expected Source**: Correct PSP (Braintree, PayPal, Toss, 3DS)
3. **Expected Codes**: Relevant error codes in results
4. **Match Expectation**: Should/shouldn't find relevant results

## Output

### Console Output
- Real-time test execution with pass/fail status
- Top match for each query with similarity score
- Summary statistics by category
- Detailed failure analysis

### JSON Report
Generates `rag-test-report.json` with:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "total": 50,
    "passed": 45,
    "failed": 5,
    "passRate": "90.00%"
  },
  "categoryStats": { ... },
  "results": [ ... ]
}
```

## Interpreting Results

### Excellent Performance (>90% pass rate)
- Chunking strategy is working well
- Semantic understanding is strong
- Threshold settings are appropriate

### Good Performance (75-90% pass rate)
- Most queries work well
- May need to lower threshold for semantic queries
- Consider query expansion for edge cases

### Needs Improvement (<75% pass rate)
- Review chunking strategy
- Consider lowering match_threshold
- Evaluate embedding model choice

## Common Failure Patterns

### High Similarity But Wrong Source
**Issue:** Chunking may be mixing provider docs
**Fix:** Improve chunk boundaries, add source metadata

### Low Similarity on Semantic Queries
**Issue:** Threshold too high for natural language
**Fix:** Lower `match_threshold` in search.ts

### Missing Expected Codes
**Issue:** Chunks don't include relevant error codes
**Fix:** Ensure error codes are prominent in chunks

### Negative Tests Passing (False Positives)
**Issue:** Irrelevant results scoring too high
**Fix:** Improve chunking specificity

## Tuning Recommendations

Based on test results, adjust:

1. **search.ts `match_threshold`**: Default similarity cutoff
2. **Chunk size**: Balance between context and precision
3. **Overlap**: Ensure context isn't lost at boundaries
4. **Metadata**: Add richer metadata for filtering

## Adding New Tests

Add test cases to the `TEST_CASES` array in `test-search.ts`:

```typescript
{
  category: '2. Semantic Meaning Searches',
  query: 'your new query',
  expectedCodes: ['ERROR_CODE'],
  expectedSource: 'Provider Name',
  minSimilarity: 0.4,
  shouldMatch: true,
}
```

## Continuous Monitoring

Run tests:
- After ingesting new documentation
- After changing chunking strategy
- After adjusting search thresholds
- Before deploying to production

Target: Maintain >85% pass rate across all categories

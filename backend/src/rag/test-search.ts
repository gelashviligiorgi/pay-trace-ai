import { searchKnowledgeBase, KnowledgeBaseMatch } from './search.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestCase {
  category: string;
  query: string;
  expectedSource?: string; // Expected PSP source
  expectedCodes?: string[]; // Expected error codes to be found
  minSimilarity?: number; // Minimum expected similarity
  shouldMatch: boolean; // Should find relevant results
}

interface TestResult {
  category: string;
  query: string;
  passed: boolean;
  topResult?: KnowledgeBaseMatch;
  allResults: KnowledgeBaseMatch[];
  reason?: string;
  similarity?: number;
}

// Test suite configuration
const TEST_CASES: TestCase[] = [
  // 1. Exact Code Matches
  {
    category: '1. Exact Code Matches',
    query: '2001',
    expectedCodes: ['2001'],
    expectedSource: 'Braintree',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: '2004',
    expectedCodes: ['2004'],
    expectedSource: 'Braintree',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'INVALID_CARD',
    expectedCodes: ['INVALID_CARD'],
    expectedSource: 'Toss Payments',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'FRAUD_DETECTED',
    expectedCodes: ['FRAUD_DETECTED'],
    expectedSource: 'PayPal',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'authenticate_failed',
    expectedCodes: ['authenticate_failed'],
    expectedSource: '3D Secure',
    minSimilarity: 0.7,
    shouldMatch: true,
  },

  // 2. Semantic Meaning Searches
  {
    category: '2. Semantic Meaning Searches',
    query: 'not enough money',
    expectedCodes: ['2001', 'INSUFFICIENT_FUNDS'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'card is old',
    expectedCodes: ['2004', 'CARD_EXPIRED'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'too many transactions',
    expectedCodes: ['2003', 'PAYMENT_LIMIT_EXCEEDED', 'TRANSACTION_LIMIT_EXCEEDED'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'wrong CVV',
    expectedCodes: ['2010'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'duplicate payment',
    expectedCodes: ['2074'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'need to call bank',
    expectedCodes: ['2046'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'identity verification failed',
    expectedCodes: ['AUTHENTICATION_FAILED', 'authenticate_failed'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'fraud suspected',
    expectedCodes: ['FRAUD_DETECTED'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'account limit reached',
    expectedCodes: ['2002', 'PAYMENT_LIMIT_EXCEEDED', 'TRANSACTION_LIMIT_EXCEEDED'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },

  // 3. Mixed Provider Contexts
  {
    category: '3. Mixed Provider Contexts',
    query: 'insufficient balance',
    expectedCodes: ['2001', 'INSUFFICIENT_FUNDS'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'card expired',
    expectedCodes: ['2004', 'CARD_EXPIRED'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'limit exceeded',
    expectedCodes: ['2002', '2003', 'PAYMENT_LIMIT_EXCEEDED', 'TRANSACTION_LIMIT_EXCEEDED'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'authentication error',
    expectedCodes: ['AUTHENTICATION_FAILED', 'authenticate_failed'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'declined by bank',
    expectedCodes: ['2038', '2046', 'INSTRUMENT_DECLINED'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },

  // 4. Technical vs. User Language
  {
    category: '4. Technical vs. User Language',
    query: 'my card doesn\'t have enough funds',
    expectedCodes: ['2001', 'INSUFFICIENT_FUNDS'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'the payment was rejected',
    expectedCodes: ['2038', 'INSTRUMENT_DECLINED'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'security check failed',
    expectedCodes: ['authenticate_failed', 'FRAUD_DETECTED'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'need more verification',
    expectedCodes: ['authenticate_failed', 'REDIRECT_REQUIRED'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'transaction blocked by system',
    expectedCodes: ['FRAUD_DETECTED', '2046'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },

  // 5. Partial/Fuzzy Matches
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'insufficent funds',
    expectedCodes: ['2001', 'INSUFFICIENT_FUNDS'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'expird card',
    expectedCodes: ['2004', 'CARD_EXPIRED'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: '3ds failed',
    expectedCodes: ['authenticate_failed'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'paypal balance low',
    expectedCodes: ['INSUFFICIENT_FUNDS'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'braintree 2010',
    expectedCodes: ['2010'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },

  // 6. Edge Cases
  {
    category: '6. Edge Cases',
    query: 'retryable error',
    minSimilarity: 0.25,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'contact support',
    expectedCodes: ['2046', 'FRAUD_DETECTED'],
    minSimilarity: 0.25,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'provider error',
    expectedCodes: ['PROVIDER_ERROR'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'transaction too large',
    expectedCodes: ['2002', 'PAYMENT_LIMIT_EXCEEDED'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'multiple attempts',
    expectedCodes: ['2003', '2074'],
    minSimilarity: 0.25,
    shouldMatch: true,
  },

  // 7. Combined Concepts
  {
    category: '7. Combined Concepts',
    query: 'card limit exceeded can I retry',
    expectedCodes: ['2002', '2003'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'expired card what to do',
    expectedCodes: ['2004', 'CARD_EXPIRED'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'authentication failed braintree',
    expectedCodes: ['authenticate_failed'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'paypal fraud detection',
    expectedCodes: ['FRAUD_DETECTED'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },

  // 8. Negative Tests
  {
    category: '8. Negative Tests',
    query: 'successful payment',
    expectedCodes: ['authenticate_successful'],
    minSimilarity: 0.3,
    shouldMatch: true, // Should find authenticate_successful
  },
  {
    category: '8. Negative Tests',
    query: 'refund process',
    minSimilarity: 0.2,
    shouldMatch: false, // Should NOT match well
  },
  {
    category: '8. Negative Tests',
    query: 'shipping delay',
    minSimilarity: 0.15,
    shouldMatch: false, // Should NOT match well
  },
];

/**
 * Check if test case passes based on criteria
 */
function evaluateTestCase(testCase: TestCase, results: KnowledgeBaseMatch[]): TestResult {
  const topResult = results[0];

  // No results case
  if (!topResult) {
    return {
      category: testCase.category,
      query: testCase.query,
      passed: !testCase.shouldMatch, // Pass if we expected no match
      allResults: results,
      reason: 'No results returned',
    };
  }

  // Check minimum similarity threshold
  if (testCase.minSimilarity && topResult.similarity < testCase.minSimilarity) {
    return {
      category: testCase.category,
      query: testCase.query,
      passed: false,
      topResult,
      allResults: results,
      similarity: topResult.similarity,
      reason: `Similarity ${topResult.similarity.toFixed(3)} below threshold ${testCase.minSimilarity}`,
    };
  }

  // Check expected source (flexible matching for file names vs display names)
  if (testCase.expectedSource) {
    const expectedLower = testCase.expectedSource.toLowerCase();
    const sourceLower = topResult.source.toLowerCase();

    // Match if source contains expected term or if they're related
    // e.g., "toss-errors" matches "Toss Payments", "3ds-codes" matches "3D Secure"
    const sourceMatch =
      sourceLower.includes(expectedLower) ||
      expectedLower.includes(sourceLower.replace('-', ' ').replace('errors', '').replace('codes', '').replace('declines', '').trim());

    if (!sourceMatch) {
      return {
        category: testCase.category,
        query: testCase.query,
        passed: false,
        topResult,
        allResults: results,
        similarity: topResult.similarity,
        reason: `Expected source "${testCase.expectedSource}", got "${topResult.source}"`,
      };
    }
  }

  // Check expected codes
  if (testCase.expectedCodes) {
    const foundExpectedCode = testCase.expectedCodes.some(code =>
      results.some(result => result.content.toUpperCase().includes(code.toUpperCase()))
    );

    if (!foundExpectedCode) {
      return {
        category: testCase.category,
        query: testCase.query,
        passed: false,
        topResult,
        allResults: results,
        similarity: topResult.similarity,
        reason: `Expected codes [${testCase.expectedCodes.join(', ')}] not found in results`,
      };
    }
  }

  // Negative test check
  if (!testCase.shouldMatch && topResult.similarity > (testCase.minSimilarity || 0.3)) {
    return {
      category: testCase.category,
      query: testCase.query,
      passed: false,
      topResult,
      allResults: results,
      similarity: topResult.similarity,
      reason: `Should NOT match well, but got similarity ${topResult.similarity.toFixed(3)}`,
    };
  }

  return {
    category: testCase.category,
    query: testCase.query,
    passed: true,
    topResult,
    allResults: results,
    similarity: topResult.similarity,
    reason: 'All criteria met',
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run all test cases and generate report
 */
async function runTests() {
  console.log('🧪 Starting RAG Search Quality Tests\n');
  console.log('⏱️  Rate limit: 3 RPM (one request per 20 seconds)');
  console.log(`📊 Total tests: ${TEST_CASES.length}`);
  console.log(`⏳ Estimated time: ~${Math.ceil(TEST_CASES.length * 20 / 60)} minutes\n`);
  console.log('='.repeat(80));

  const results: TestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];

    try {
      console.log(`\n[${i + 1}/${TEST_CASES.length}] 📋 Testing: "${testCase.query}" (${testCase.category})`);

      const searchResults = await searchKnowledgeBase(testCase.query, 5);
      const testResult = evaluateTestCase(testCase, searchResults);

      results.push(testResult);

      if (testResult.passed) {
        passedCount++;
        console.log(`✅ PASSED - Similarity: ${testResult.similarity?.toFixed(3) || 'N/A'}`);
        if (testResult.topResult) {
          console.log(`   Top Match: ${testResult.topResult.source} - ${testResult.topResult.content.substring(0, 80)}...`);
        }
      } else {
        failedCount++;
        console.log(`❌ FAILED - ${testResult.reason}`);
        if (testResult.topResult) {
          console.log(`   Top Match: ${testResult.topResult.source} (${testResult.similarity?.toFixed(3)})`);
          console.log(`   Content: ${testResult.topResult.content.substring(0, 100)}...`);
        }
      }

      // Rate limit: Wait 20 seconds between requests (3 RPM = one per 20s)
      if (i < TEST_CASES.length - 1) {
        console.log(`⏳ Waiting 20 seconds for rate limit...`);
        await sleep(20000);
      }
    } catch (error) {
      failedCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ERROR - ${errorMessage}`);
      results.push({
        category: testCase.category,
        query: testCase.query,
        passed: false,
        allResults: [],
        reason: `Error: ${errorMessage}`,
      });

      // Still wait on error to avoid hitting rate limit repeatedly
      if (i < TEST_CASES.length - 1) {
        console.log(`⏳ Waiting 20 seconds for rate limit...`);
        await sleep(20000);
      }
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${TEST_CASES.length}`);
  console.log(`✅ Passed: ${passedCount} (${((passedCount / TEST_CASES.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failedCount} (${((failedCount / TEST_CASES.length) * 100).toFixed(1)}%)`);

  // Category breakdown
  const categoryStats = new Map<string, { passed: number; failed: number }>();
  for (const result of results) {
    const stats = categoryStats.get(result.category) || { passed: 0, failed: 0 };
    if (result.passed) {
      stats.passed++;
    } else {
      stats.failed++;
    }
    categoryStats.set(result.category, stats);
  }

  console.log('\n📈 RESULTS BY CATEGORY:\n');
  for (const [category, stats] of categoryStats) {
    const total = stats.passed + stats.failed;
    const percentage = ((stats.passed / total) * 100).toFixed(1);
    console.log(`${category}`);
    console.log(`  ✅ ${stats.passed}/${total} passed (${percentage}%)`);
  }

  // Failed tests detail
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS DETAIL:\n');
    for (const test of failedTests) {
      console.log(`Query: "${test.query}"`);
      console.log(`Reason: ${test.reason}`);
      if (test.topResult) {
        console.log(`Top Result: ${test.topResult.source} (similarity: ${test.similarity?.toFixed(3)})`);
      }
      console.log('');
    }
  }

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: TEST_CASES.length,
      passed: passedCount,
      failed: failedCount,
      passRate: ((passedCount / TEST_CASES.length) * 100).toFixed(2) + '%',
    },
    categoryStats: Object.fromEntries(categoryStats),
    results,
  };

  const reportPath = join(process.cwd(), 'rag-test-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  console.log('\n' + '='.repeat(80));

  // Exit with appropriate code
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});

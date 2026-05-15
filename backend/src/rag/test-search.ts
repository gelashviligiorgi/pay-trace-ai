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
// Covers all 6 providers: Braintree, Stripe, Checkout.com, Primer (Visa/Mastercard), Adyen, 3D Secure
const TEST_CASES: TestCase[] = [
  // ============================================================
  // 1. Exact Code Matches — one direct code lookup per provider
  // ============================================================

  // Braintree — include provider name so embedding steers to the right source
  {
    category: '1. Exact Code Matches',
    query: 'Braintree code 2001',
    expectedCodes: ['2001'],
    expectedSource: 'Braintree',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Braintree code 2004',
    expectedCodes: ['2004'],
    expectedSource: 'Braintree',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Braintree code 2010',
    expectedCodes: ['2010'],
    expectedSource: 'Braintree',
    minSimilarity: 0.7,
    shouldMatch: true,
  },

  // Stripe — include provider name to steer embedding to the right source
  {
    category: '1. Exact Code Matches',
    query: 'Stripe code insufficient_funds',
    expectedCodes: ['insufficient_funds'],
    expectedSource: 'Stripe',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Stripe code expired_card',
    expectedCodes: ['expired_card'],
    expectedSource: 'Stripe',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Stripe code fraudulent',
    expectedCodes: ['fraudulent'],
    expectedSource: 'Stripe',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Stripe code incorrect_cvc',
    expectedCodes: ['incorrect_cvc'],
    expectedSource: 'Stripe',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Stripe code stolen_card',
    expectedCodes: ['stolen_card'],
    expectedSource: 'Stripe',
    minSimilarity: 0.7,
    shouldMatch: true,
  },

  // Checkout.com — include provider name to steer embedding to the right source
  {
    category: '1. Exact Code Matches',
    query: 'Checkout.com code 20051',
    expectedCodes: ['20051'],
    expectedSource: 'Checkout',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Checkout.com code 20054',
    expectedCodes: ['20054'],
    expectedSource: 'Checkout',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Checkout.com code 20059',
    expectedCodes: ['20059'],
    expectedSource: 'Checkout',
    minSimilarity: 0.7,
    shouldMatch: true,
  },

  // Primer (Visa/Mastercard) — query includes provider name to steer embedding
  {
    category: '1. Exact Code Matches',
    query: 'Primer code 51 insufficient funds',
    expectedCodes: ['51'],
    expectedSource: 'Primer',
    minSimilarity: 0.6,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Primer code 54 expired card',
    expectedCodes: ['54'],
    expectedSource: 'Primer',
    minSimilarity: 0.6,
    shouldMatch: true,
  },

  // Adyen — include provider name; short numeric codes rely on source check
  {
    category: '1. Exact Code Matches',
    query: 'Adyen refusal code 6 expired card',
    expectedSource: 'Adyen',
    minSimilarity: 0.55,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Adyen refusal code 20 fraud',
    expectedSource: 'Adyen',
    minSimilarity: 0.55,
    shouldMatch: true,
  },

  // 3D Secure
  {
    category: '1. Exact Code Matches',
    query: '3DS authenticate_failed',
    expectedCodes: ['authenticate_failed'],
    expectedSource: '3ds-codes',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'authenticate_successful',
    expectedCodes: ['authenticate_successful'],
    expectedSource: '3ds-codes',
    minSimilarity: 0.7,
    shouldMatch: true,
  },

  // ============================================================
  // 2. Semantic Meaning Searches — natural-language descriptions
  // ============================================================
  {
    category: '2. Semantic Meaning Searches',
    query: 'not enough money',
    expectedCodes: ['2001', 'insufficient_funds', '20051'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'card is old',
    expectedCodes: ['2004', 'expired_card', '20054'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'too many transactions',
    expectedCodes: ['2003', '20061', '65'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'wrong CVV security code',
    expectedCodes: ['2010', 'incorrect_cvc'],
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
    expectedCodes: ['authenticate_failed', 'authentication_required'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'fraud suspected on transaction',
    expectedCodes: ['fraudulent', '20059'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'account limit reached',
    expectedCodes: ['2002', '20061', '61'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'card was stolen or reported lost',
    expectedCodes: ['stolen_card', 'lost_card', '2053'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'wrong PIN entered',
    expectedCodes: ['20055'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: '3D Secure step-up challenge not completed',
    expectedCodes: ['authenticate_failed', 'authenticate_unable_to_authenticate'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },

  // ============================================================
  // 3. Mixed Provider Contexts — generic terms matching multiple PSPs
  // ============================================================
  {
    category: '3. Mixed Provider Contexts',
    query: 'insufficient balance',
    expectedCodes: ['2001', 'insufficient_funds', '20051'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'card expired',
    expectedCodes: ['2004', 'expired_card', '20054'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'limit exceeded',
    expectedCodes: ['2002', '2003', '20061', '65'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'authentication error',
    expectedCodes: ['authenticate_failed', 'authentication_required'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'declined by bank',
    expectedCodes: ['2038', '2046', '20005'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'invalid card number',
    expectedCodes: ['invalid_number', '20014'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'suspected fraud decline',
    expectedCodes: ['fraudulent', '20059', '2059'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'wrong PIN too many attempts',
    expectedCodes: ['20055'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },

  // ============================================================
  // 4. Technical vs. User Language
  // ============================================================
  {
    category: '4. Technical vs. User Language',
    query: "my card doesn't have enough funds",
    expectedCodes: ['2001', 'insufficient_funds', '20051'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'the payment was rejected',
    expectedCodes: ['2038', 'do_not_honor', 'generic_decline'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'security check failed',
    expectedCodes: ['authenticate_failed', 'fraudulent'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'my card is no longer valid',
    expectedCodes: ['expired_card', '2004', '20054'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'transaction blocked by system',
    expectedCodes: ['fraudulent', '20059', '2046'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'Stripe says insufficient_funds — what does that mean',
    expectedCodes: ['insufficient_funds'],
    expectedSource: 'Stripe',
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'Checkout.com returned error 20059',
    expectedCodes: ['20059'],
    expectedSource: 'Checkout',
    minSimilarity: 0.5,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'bank issuer is temporarily unavailable',
    expectedCodes: ['2038', '20001'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },

  // ============================================================
  // 5. Partial / Fuzzy Matches — typos and abbreviations
  // ============================================================
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'insufficent funds',
    expectedCodes: ['2001', 'insufficient_funds'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'expird card',
    expectedCodes: ['2004', 'expired_card'],
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
    query: 'braintree 2010',
    expectedCodes: ['2010'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'stripe insuficient funds',
    expectedCodes: ['insufficient_funds'],
    expectedSource: 'Stripe',
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'chekout.com expiry card error',
    expectedCodes: ['20054', 'expired_card'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'primer visa insuficient funds',
    expectedCodes: ['51'],
    expectedSource: 'Primer',
    minSimilarity: 0.35,
    shouldMatch: true,
  },

  // ============================================================
  // 6. Edge Cases — generic or ambiguous queries
  // ============================================================
  {
    category: '6. Edge Cases',
    query: 'retryable error',
    minSimilarity: 0.25,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'contact support to resolve',
    expectedCodes: ['2046'],
    minSimilarity: 0.25,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'transaction amount too large',
    expectedCodes: ['2002', '20061', '61'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'multiple decline attempts',
    expectedCodes: ['2003', '2074', 'card_decline_rate_limit_exceeded'],
    minSimilarity: 0.25,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'customer cancelled the payment',
    expectedCodes: ['20017'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'hard decline card cannot be retried',
    expectedCodes: ['stolen_card', 'lost_card', 'fraudulent'],
    minSimilarity: 0.25,
    shouldMatch: true,
  },

  // ============================================================
  // 7. Combined Concepts — multi-concept and provider-scoped queries
  // ============================================================
  {
    category: '7. Combined Concepts',
    query: 'card limit exceeded can I retry',
    expectedCodes: ['2002', '2003', '20061'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'expired card what to do',
    expectedCodes: ['2004', 'expired_card', '20054'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'authentication failed braintree 3DS',
    expectedCodes: ['authenticate_failed'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'Stripe payment declined insufficient funds error code',
    expectedCodes: ['insufficient_funds'],
    expectedSource: 'Stripe',
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'Checkout.com fraud detection response code',
    expectedCodes: ['20059'],
    expectedSource: 'Checkout',
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'Primer Visa insufficient funds ISO 8583',
    expectedCodes: ['51'],
    expectedSource: 'Primer',
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'Adyen blocked card refusal reason',
    expectedSource: 'Adyen',
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'Adyen 3D not authenticated refusal',
    expectedSource: 'Adyen',
    minSimilarity: 0.35,
    shouldMatch: true,
  },

  // ============================================================
  // 8. Negative Tests
  // ============================================================
  {
    category: '8. Negative Tests',
    query: 'successful payment approved',
    expectedCodes: ['authenticate_successful', '10000'],
    minSimilarity: 0.3,
    shouldMatch: true, // Should retrieve successful/approved codes
  },
  {
    category: '8. Negative Tests',
    query: 'refund process',
    minSimilarity: 0.65,
    shouldMatch: false,
  },
  {
    category: '8. Negative Tests',
    query: 'shipping delay',
    minSimilarity: 0.65,
    shouldMatch: false,
  },
  {
    category: '8. Negative Tests',
    query: 'restaurant menu item',
    minSimilarity: 0.65,
    shouldMatch: false,
  },
  {
    category: '8. Negative Tests',
    query: 'weather forecast tomorrow',
    minSimilarity: 0.65,
    shouldMatch: false, // Completely unrelated domain
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

      const searchResults = await searchKnowledgeBase(testCase.query, 5, testCase.expectedSource);
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

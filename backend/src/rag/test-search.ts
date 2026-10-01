import { searchKnowledgeBase, KnowledgeBaseMatch } from './search.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestCase {
  category: string;
  query: string;
  expectedSource?: string; // Expected PSP source
  expectedCodes?: string[]; // Expected string codes (Stripe/3DS only — numeric codes are unreliable with embeddings)
  requiredKeywords?: string[]; // At least one result must contain one of these words (for concept validation)
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

  // Braintree — numeric codes: only check source + similarity (lookup_error_code handles exact matches)
  {
    category: '1. Exact Code Matches',
    query: 'Braintree code 2001',
    expectedSource: 'Braintree',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Braintree code 2004',
    expectedSource: 'Braintree',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Braintree code 2010',
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

  // Checkout.com — numeric codes: only check source + similarity
  {
    category: '1. Exact Code Matches',
    query: 'Checkout.com code 20051',
    expectedSource: 'Checkout',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Checkout.com code 20054',
    expectedSource: 'Checkout',
    minSimilarity: 0.7,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Checkout.com code 20059',
    expectedSource: 'Checkout',
    minSimilarity: 0.7,
    shouldMatch: true,
  },

  // Primer — numeric codes: only check source + similarity
  {
    category: '1. Exact Code Matches',
    query: 'Primer code 51 insufficient funds',
    expectedSource: 'Primer',
    minSimilarity: 0.6,
    shouldMatch: true,
  },
  {
    category: '1. Exact Code Matches',
    query: 'Primer code 54 expired card',
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
    requiredKeywords: ['insufficient', 'funds', 'balance'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'card is old',
    requiredKeywords: ['expired', 'expiry', 'expiration'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'too many transactions',
    requiredKeywords: ['limit', 'velocity', 'exceeded', 'activity'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'wrong CVV security code',
    expectedCodes: ['incorrect_cvc'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'same transaction submitted twice',
    requiredKeywords: ['duplicate', 'identical', 'already', 'submitted'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'need to call bank',
    requiredKeywords: ['contact', 'bank', 'call', 'issuer'],
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
    expectedCodes: ['fraudulent'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'account limit reached',
    requiredKeywords: ['limit', 'exceeded', 'activity', 'amount'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'card was stolen or reported lost',
    expectedCodes: ['stolen_card', 'lost_card'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '2. Semantic Meaning Searches',
    query: 'wrong PIN entered',
    requiredKeywords: ['pin', 'incorrect', 'tries'],
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
    requiredKeywords: ['insufficient', 'funds', 'balance'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'card expired',
    expectedCodes: ['expired_card'],
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'limit exceeded',
    requiredKeywords: ['limit', 'exceeded', 'activity', 'velocity'],
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
    requiredKeywords: ['declined', 'honor', 'issuer', 'bank'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'invalid card number',
    expectedCodes: ['invalid_number'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'suspected fraud decline',
    expectedCodes: ['fraudulent'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '3. Mixed Provider Contexts',
    query: 'wrong PIN too many attempts',
    requiredKeywords: ['pin', 'incorrect', 'tries', 'exceeded'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },

  // ============================================================
  // 4. Technical vs. User Language
  // ============================================================
  {
    category: '4. Technical vs. User Language',
    query: "my card doesn't have enough funds",
    requiredKeywords: ['insufficient', 'funds', 'balance'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'the payment was rejected',
    requiredKeywords: ['declined', 'rejected', 'honor'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'security check failed',
    requiredKeywords: ['security', 'fraud', 'authentication', 'authenticate'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'my card is no longer valid',
    expectedCodes: ['expired_card'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'transaction blocked by system',
    requiredKeywords: ['blocked', 'not allowed', 'restricted', 'declined'],
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
    expectedSource: 'Checkout',
    minSimilarity: 0.5,
    shouldMatch: true,
  },
  {
    category: '4. Technical vs. User Language',
    query: 'bank issuer is temporarily unavailable',
    requiredKeywords: ['unavailable', 'temporarily', 'issuer', 'bank'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },

  // ============================================================
  // 5. Partial / Fuzzy Matches — typos and abbreviations
  // ============================================================
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'insufficent funds',
    expectedCodes: ['insufficient_funds'],
    minSimilarity: 0.35,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'expird card',
    expectedCodes: ['expired_card'],
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
    expectedSource: 'Braintree',
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
    requiredKeywords: ['expiry', 'expired', 'expiration'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '5. Partial/Fuzzy Matches',
    query: 'primer visa insuficient funds',
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
    requiredKeywords: ['contact', 'bank', 'call', 'issuer'],
    minSimilarity: 0.25,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'transaction amount too large',
    requiredKeywords: ['amount', 'limit', 'exceeded', 'large'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'multiple decline attempts',
    requiredKeywords: ['decline', 'limit', 'attempts', 'rate'],
    minSimilarity: 0.25,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'customer cancelled the payment',
    requiredKeywords: ['cancel', 'customer', 'void', 'cancelled'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '6. Edge Cases',
    query: 'hard decline card cannot be retried',
    requiredKeywords: ['decline', 'revocation', 'hard', 'retry'],
    minSimilarity: 0.25,
    shouldMatch: true,
  },

  // ============================================================
  // 7. Combined Concepts — multi-concept and provider-scoped queries
  // ============================================================
  {
    category: '7. Combined Concepts',
    query: 'card limit exceeded can I retry',
    requiredKeywords: ['limit', 'exceeded', 'activity', 'velocity'],
    minSimilarity: 0.3,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'expired card what to do',
    expectedCodes: ['expired_card'],
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
    expectedSource: 'Checkout',
    minSimilarity: 0.4,
    shouldMatch: true,
  },
  {
    category: '7. Combined Concepts',
    query: 'Primer Visa insufficient funds ISO 8583',
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
    query: 'user password reset',
    minSimilarity: 0.75,
    shouldMatch: false,
  },
  {
    category: '8. Negative Tests',
    query: 'football match score',
    minSimilarity: 0.75,
    shouldMatch: false,
  },
  {
    category: '8. Negative Tests',
    query: 'restaurant menu item',
    minSimilarity: 0.75,
    shouldMatch: false,
  },
  {
    category: '8. Negative Tests',
    query: 'weather forecast tomorrow',
    minSimilarity: 0.75,
    shouldMatch: false,
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

  // For positive tests: similarity must be at or above the threshold
  // For negative tests: minSimilarity is a ceiling — handled later in the negative check
  if (testCase.shouldMatch && testCase.minSimilarity && topResult.similarity < testCase.minSimilarity) {
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

  // Check expected codes (string codes only — numeric codes are unreliable with embeddings)
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

  // Check required keywords (concept validation for semantic searches)
  if (testCase.requiredKeywords) {
    const foundKeyword = testCase.requiredKeywords.some(kw =>
      results.some(r => r.content.toLowerCase().includes(kw.toLowerCase()))
    );

    if (!foundKeyword) {
      return {
        category: testCase.category,
        query: testCase.query,
        passed: false,
        topResult,
        allResults: results,
        similarity: topResult.similarity,
        reason: `No result contained any of the keywords [${testCase.requiredKeywords.join(', ')}]`,
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
  // Parse optional index arguments: `tsx test-search.ts 1 5 20` runs only those 1-based positions
  const argIndices = process.argv.slice(2).map(Number).filter(n => !isNaN(n) && n >= 1 && n <= TEST_CASES.length);
  const selectedIndices = argIndices.length > 0 ? new Set(argIndices.map(n => n - 1)) : null;
  const casesToRun = selectedIndices
    ? TEST_CASES.map((tc, i) => ({ tc, i })).filter(({ i }) => selectedIndices.has(i))
    : TEST_CASES.map((tc, i) => ({ tc, i }));

  console.log('🧪 Starting RAG Search Quality Tests\n');
  if (selectedIndices) {
    console.log(`🎯 Running selected tests: [${argIndices.join(', ')}]`);
  }
  console.log('⏱️  Rate limit: 3 RPM (one request per 20 seconds)');
  console.log(`📊 Total tests: ${casesToRun.length}${selectedIndices ? ` (of ${TEST_CASES.length})` : ''}`);
  console.log(`⏳ Estimated time: ~${Math.ceil(casesToRun.length * 20 / 60)} minutes\n`);
  console.log('='.repeat(80));

  const results: TestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (let runIdx = 0; runIdx < casesToRun.length; runIdx++) {
    const { tc: testCase, i } = casesToRun[runIdx];

    try {
      console.log(`\n[${runIdx + 1}/${casesToRun.length}] 📋 Testing #${i + 1}: "${testCase.query}" (${testCase.category})`);

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
        if (testResult.allResults.length > 1) {
          console.log(`   All ${testResult.allResults.length} results:`);
          testResult.allResults.forEach((r, idx) => {
            const codeMatch = r.content.match(/CODE:\s*(\S+)/);
            console.log(`     ${idx + 1}. [${r.source}] code=${codeMatch?.[1] ?? '?'} sim=${r.similarity.toFixed(3)}`);
          });
        }
      }

      // Rate limit: Wait 20 seconds between requests (3 RPM = one per 20s)
      if (runIdx < casesToRun.length - 1) {
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
      if (runIdx < casesToRun.length - 1) {
        console.log(`⏳ Waiting 20 seconds for rate limit...`);
        await sleep(20000);
      }
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${casesToRun.length}${selectedIndices ? ` (of ${TEST_CASES.length})` : ''}`);
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
      passRate: ((passedCount / casesToRun.length) * 100).toFixed(2) + '%',
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

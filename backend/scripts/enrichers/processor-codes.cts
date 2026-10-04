/**
 * Shared enrichment logic for processor response codes
 */

export interface ProcessorCode {
  code: string;
  message: string;
  type: 'hard' | 'soft';
}

/**
 * Determine if a code is hard or soft decline based on keywords
 */
export function determineDeclineType(_code: string, message: string): 'hard' | 'soft' {
  const lowerMessage = message.toLowerCase();

  const hardDeclineKeywords = [
    'do not honor',
    'stolen',
    'lost',
    'fraud',
    'pickup',
    'restricted',
    'invalid card',
    'expired card',
    'no such issuer',
  ];

  for (const keyword of hardDeclineKeywords) {
    if (lowerMessage.includes(keyword)) {
      return 'hard';
    }
  }

  return 'soft';
}

const SYNONYM_SEEDS: Record<string, string[]> = {
  'insufficient funds': ['not enough money', 'low balance', 'no funds', 'account empty', 'balance too low', 'insufficient balance'],
  'do not honor': ['transaction rejected', 'payment declined', 'issuer declined', 'bank refused', 'authorization denied'],
  'invalid': ['not valid', 'incorrect', 'wrong', 'bad', 'invalid data', 'malformed'],
  'expired': ['out of date', 'no longer valid', 'past expiration', 'card expired', 'date passed'],
  'lost': ['reported lost', 'missing card', 'lost card', 'cardholder reported lost'],
  'stolen': ['reported stolen', 'fraudulent card', 'stolen card', 'theft reported'],
  'fraud': ['fraudulent', 'suspicious activity', 'fraud detected', 'potential fraud', 'security risk'],
  'limit': ['over limit', 'exceeds limit', 'limit reached', 'maximum exceeded', 'threshold exceeded'],
  'restricted': ['not allowed', 'blocked', 'prohibited', 'restricted transaction', 'not permitted'],
  'pickup': ['hold card', 'retain card', 'confiscate card', 'card pickup', 'seize card'],
};

/**
 * Generate natural language synonyms for a code based on its message
 */
export function generateSynonyms(_code: string, message: string): string {
  const lowerMessage = message.toLowerCase();

  for (const [key, synonyms] of Object.entries(SYNONYM_SEEDS)) {
    if (lowerMessage.includes(key)) {
      return synonyms.slice(0, 6).join(', ');
    }
  }

  // Generic fallback synonyms
  return 'payment declined, transaction rejected, authorization failed, payment failed, card declined, issuer declined';
}

/**
 * Infer the root cause of a decline based on the message
 */
export function inferCause(_code: string, message: string): string {
  const causeMap: Record<string, string> = {
    'insufficient funds': 'Customer account does not have enough funds available',
    'do not honor': 'Issuing bank declined the transaction without specific reason',
    'invalid': 'Payment information provided is invalid or incorrect',
    'expired': 'Card has passed its expiration date',
    'lost': 'Card has been reported lost by the cardholder',
    'stolen': 'Card has been reported stolen by the cardholder',
    'fraud': 'Transaction flagged as potentially fraudulent',
    'limit': 'Transaction amount exceeds card or account limits',
    'restricted': 'Card or transaction type is restricted by the issuer',
    'pickup': 'Card has been flagged for retention by the issuer',
    'invalid account': 'Account number is invalid or not recognized',
    'invalid amount': 'Transaction amount is invalid',
    'invalid card': 'Card number is invalid or not recognized',
    'cvv': 'CVV/security code does not match',
    'avs': 'Address verification failed',
  };

  const lowerMessage = message.toLowerCase();

  for (const [key, cause] of Object.entries(causeMap)) {
    if (lowerMessage.includes(key)) {
      return cause;
    }
  }

  return `Issuing bank declined the transaction with reason: ${message}`;
}

/**
 * Infer actionable fix suggestions based on decline type
 */
export function inferFix(type: 'hard' | 'soft', message: string): string {
  if (type === 'hard') {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('lost') || lowerMessage.includes('stolen') || lowerMessage.includes('fraud')) {
      return 'Customer must contact their bank immediately. Request a different payment method from the customer.';
    }
    if (lowerMessage.includes('pickup') || lowerMessage.includes('restricted')) {
      return 'Customer must contact their bank to resolve the issue. Request a different payment method.';
    }
    if (lowerMessage.includes('expired')) {
      return 'Request updated card information with a valid expiration date from the customer.';
    }

    return 'Contact the issuing bank for clarification, or request a different payment method from the customer.';
  }

  // Soft decline
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('insufficient')) {
    return 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.';
  }
  if (lowerMessage.includes('limit')) {
    return 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.';
  }
  if (lowerMessage.includes('cvv') || lowerMessage.includes('avs')) {
    return 'Verify the information with the customer and retry with corrected details.';
  }

  return 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.';
}

/**
 * Build an enriched text chunk for a processor code.
 * Pass synonymsOverride to skip keyword-based generation (e.g. when Claude already produced them).
 */
export function buildEnrichedChunk(entry: ProcessorCode, source: string, synonymsOverride?: string): string {
  const retryable = entry.type === 'soft' ? 'yes' : 'no';
  const cause = inferCause(entry.code, entry.message);
  const fix = inferFix(entry.type, entry.message);
  const synonyms = synonymsOverride ?? generateSynonyms(entry.code, entry.message);

  return `SOURCE: ${source}
CODE: ${entry.code}
MEANING: ${entry.message}
TYPE: ${entry.type} decline
RETRYABLE: ${retryable}
CAUSE: ${cause}
FIX: ${fix}
SYNONYMS: ${synonyms}`;
}

/**
 * Build enriched chunks for all codes using Claude to generate specific synonyms per code.
 * Passes existing SYNONYM_SEEDS to Claude as reference so it extends rather than ignores them.
 * Falls back to keyword-based generation for any code Claude fails to process.
 */
export async function buildEnrichedChunksWithClaude(
  codes: ProcessorCode[],
  source: string,
  apiKey: string,
  batchSize = 20
): Promise<string[]> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey });

  const seedReference = Object.entries(SYNONYM_SEEDS)
    .map(([key, values]) => `  "${key}": ${values.slice(0, 4).join(', ')}`)
    .join('\n');

  const generatedSynonyms = new Map<string, string>();
  const totalBatches = Math.ceil(codes.length / batchSize);

  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    console.log(`  🤖 Claude synonyms: batch ${batchNum}/${totalBatches} (${batch.length} codes)...`);

    const codeList = batch
      .map((c, idx) => `${idx + 1}. code="${c.code}" message="${c.message}"`)
      .join('\n');

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are enriching a payment error code knowledge base for semantic vector search across multiple payment providers.

For each error code below, generate 6 natural language synonyms that accurately describe WHAT THE ERROR MEANS — phrases a developer or customer would use when encountering this error.

Important rules:
- If a code means the same thing as errors at other PSPs (e.g. "insufficient funds"), use synonyms consistent with that shared concept — this enables cross-provider search.
- If a code has a unique meaning (e.g. "duplicate transaction", "api key expired"), generate synonyms specific to that concept so it is distinguishable from unrelated codes.
- Never use generic phrases like "payment declined, transaction rejected, authorization failed" unless the code genuinely means an unspecified generic decline with no further detail.

Existing synonym seeds for common concepts (reuse and extend these where the code belongs to that concept):
${seedReference}

Codes to enrich:
${codeList}

Return ONLY valid JSON — an array in the same order, no extra text:
[{"code": "...", "synonyms": "phrase1, phrase2, phrase3, phrase4, phrase5, phrase6"}, ...]`,
        }],
      });

      const raw = (response.content[0] as any).text.trim();
      const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const results: Array<{ code: string; synonyms: string }> = JSON.parse(jsonText);

      for (const r of results) {
        generatedSynonyms.set(r.code, r.synonyms);
      }
    } catch (err: any) {
      console.warn(`  ⚠️  Claude batch ${batchNum} failed (${err.message}), falling back to keyword synonyms for this batch`);
    }
  }

  console.log(`  ✓ Claude generated synonyms for ${generatedSynonyms.size}/${codes.length} codes`);

  return codes.map(code =>
    buildEnrichedChunk(code, source, generatedSynonyms.get(code.code))
  );
}

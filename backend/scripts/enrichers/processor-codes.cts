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
export function determineDeclineType(code: string, message: string): 'hard' | 'soft' {
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

/**
 * Generate natural language synonyms for a code based on its message
 */
export function generateSynonyms(code: string, message: string): string {
  const synonymMap: Record<string, string[]> = {
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

  const lowerMessage = message.toLowerCase();

  for (const [key, synonyms] of Object.entries(synonymMap)) {
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
export function inferCause(code: string, message: string): string {
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
 * Build an enriched text chunk for a processor code
 */
export function buildEnrichedChunk(entry: ProcessorCode, source: string): string {
  const retryable = entry.type === 'soft' ? 'yes' : 'no';
  const cause = inferCause(entry.code, entry.message);
  const fix = inferFix(entry.type, entry.message);
  const synonyms = generateSynonyms(entry.code, entry.message);

  return `SOURCE: ${source}
CODE: ${entry.code}
MEANING: ${entry.message}
TYPE: ${entry.type} decline
RETRYABLE: ${retryable}
CAUSE: ${cause}
FIX: ${fix}
SYNONYMS: ${synonyms}`;
}

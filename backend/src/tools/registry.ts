/**
 * Static error code registry
 * Contains all known error codes across payment providers
 */

export interface ErrorCodeEntry {
  code: string;
  meaning: string;
  cause: string;
  retryable: boolean;
  fix: string;
  source: string;
}

/**
 * Error code registry - built from knowledge base content
 * Keyed by uppercase error code for case-insensitive lookup
 */
const ERROR_REGISTRY: Record<string, ErrorCodeEntry> = {
  // Braintree error codes
  '2001': {
    code: '2001',
    meaning: 'Insufficient Funds',
    cause: "Customer's account does not have enough funds to complete the transaction",
    retryable: true,
    fix: 'Ask customer to use a different payment method or add funds to their account',
    source: 'Braintree',
  },
  '2002': {
    code: '2002',
    meaning: 'Limit Exceeded',
    cause: "Transaction amount exceeds card's daily or transaction limit",
    retryable: true,
    fix: 'Customer should contact their bank to increase limits or use an alternative payment method',
    source: 'Braintree',
  },
  '2003': {
    code: '2003',
    meaning: "Cardholder's Activity Limit Exceeded",
    cause: 'Too many transactions attempted in a short period',
    retryable: true,
    fix: 'Wait and retry later, or ask customer to contact their bank',
    source: 'Braintree',
  },
  '2004': {
    code: '2004',
    meaning: 'Expired Card',
    cause: "The card's expiration date has passed",
    retryable: false,
    fix: 'Request updated card information from customer',
    source: 'Braintree',
  },
  '2010': {
    code: '2010',
    meaning: 'Card Issuer Declined CVV',
    cause: 'CVV verification failed at the issuing bank',
    retryable: true,
    fix: 'Ask customer to verify and re-enter the correct CVV code',
    source: 'Braintree',
  },
  '2038': {
    code: '2038',
    meaning: 'Processor Declined',
    cause: 'Generic decline from the card processor without specific reason',
    retryable: true,
    fix: 'Suggest customer contact their bank or try a different payment method',
    source: 'Braintree',
  },
  '2046': {
    code: '2046',
    meaning: 'Declined - Call Issuer',
    cause: 'Bank requires cardholder to call for authorization',
    retryable: false,
    fix: 'Customer must contact their bank before retrying the transaction',
    source: 'Braintree',
  },
  '2074': {
    code: '2074',
    meaning: 'Duplicate Transaction',
    cause: 'Same transaction submitted multiple times within a short timeframe',
    retryable: false,
    fix: 'Check if original transaction succeeded; wait before attempting again',
    source: 'Braintree',
  },

  // Toss Payments error codes
  INVALID_CARD: {
    code: 'INVALID_CARD',
    meaning: 'Card number is invalid or not supported',
    cause: 'Card number format is incorrect or card type not supported',
    retryable: false,
    fix: 'Ask customer to verify card number or use a different card',
    source: 'Toss Payments',
  },
  CARD_EXPIRED: {
    code: 'CARD_EXPIRED',
    meaning: 'Card has expired',
    cause: 'Card expiration date has passed',
    retryable: false,
    fix: 'Request updated card information from customer',
    source: 'Toss Payments',
  },
  PAYMENT_LIMIT_EXCEEDED: {
    code: 'PAYMENT_LIMIT_EXCEEDED',
    meaning: 'Payment limit exceeded',
    cause: 'Transaction exceeds daily or monthly payment limits',
    retryable: true,
    fix: 'Customer should contact Toss support or try smaller transaction amount',
    source: 'Toss Payments',
  },
  AUTHENTICATION_FAILED: {
    code: 'AUTHENTICATION_FAILED',
    meaning: 'Customer authentication failed',
    cause: 'Failed to verify customer identity',
    retryable: true,
    fix: 'Ask customer to retry authentication process with correct credentials',
    source: 'Toss Payments',
  },
  PROVIDER_ERROR: {
    code: 'PROVIDER_ERROR',
    meaning: 'Technical error on the payment provider side',
    cause: 'Technical issue on payment provider side',
    retryable: true,
    fix: 'Retry transaction after a short delay; escalate if persistent',
    source: 'Toss Payments',
  },

  // PayPal error codes
  INSTRUMENT_DECLINED: {
    code: 'INSTRUMENT_DECLINED',
    meaning: 'Payment instrument was declined by processor',
    cause: 'Issuing bank declined the transaction',
    retryable: true,
    fix: 'Customer should contact their bank or use alternative payment method',
    source: 'PayPal',
  },
  INSUFFICIENT_FUNDS: {
    code: 'INSUFFICIENT_FUNDS',
    meaning: 'Account does not have sufficient balance',
    cause: 'PayPal balance or linked funding source lacks funds',
    retryable: true,
    fix: 'Ask customer to add funds or link a different payment source',
    source: 'PayPal',
  },
  TRANSACTION_LIMIT_EXCEEDED: {
    code: 'TRANSACTION_LIMIT_EXCEEDED',
    meaning: 'Transaction exceeds account limits',
    cause: 'PayPal account has spending limits that were exceeded',
    retryable: true,
    fix: 'Customer needs to verify their PayPal account or wait until limit resets',
    source: 'PayPal',
  },
  FRAUD_DETECTED: {
    code: 'FRAUD_DETECTED',
    meaning: 'Transaction flagged as potentially fraudulent by PayPal\'s risk systems',
    cause: "PayPal's fraud detection system identified suspicious activity based on unusual patterns, mismatched billing details, velocity checks, or known fraud indicators",
    retryable: false,
    fix: 'Customer must contact PayPal support to resolve security concerns',
    source: 'PayPal',
  },
  REDIRECT_REQUIRED: {
    code: 'REDIRECT_REQUIRED',
    meaning: 'Customer needs to complete authentication',
    cause: 'Additional verification required for security',
    retryable: true,
    fix: 'Ensure customer completes the redirect flow to authenticate',
    source: 'PayPal',
  },

  // 3D Secure codes
  AUTHENTICATE_SUCCESSFUL: {
    code: 'authenticate_successful',
    meaning: 'Customer successfully completed 3DS authentication',
    cause: 'Cardholder verified their identity through 3DS challenge',
    retryable: false,
    fix: 'Proceed with transaction authorization',
    source: '3D Secure',
  },
  AUTHENTICATE_FAILED: {
    code: 'authenticate_failed',
    meaning: '3DS authentication failed',
    cause: 'Customer failed to complete authentication or provided incorrect credentials',
    retryable: true,
    fix: 'Allow customer to retry authentication or use a different payment method',
    source: '3D Secure',
  },
  LOOKUP_NOT_ENROLLED: {
    code: 'lookup_not_enrolled',
    meaning: 'Card not enrolled in 3DS',
    cause: 'Issuing bank does not support 3DS for this card',
    retryable: false,
    fix: 'Proceed with non-3DS transaction flow if allowed, or request different card',
    source: '3D Secure',
  },
  LOOKUP_ERROR: {
    code: 'lookup_error',
    meaning: 'Error during 3DS lookup',
    cause: 'Technical error communicating with directory server',
    retryable: true,
    fix: 'Retry the lookup process; if persists, contact 3DS provider support',
    source: '3D Secure',
  },
  AUTHENTICATE_UNABLE_TO_AUTHENTICATE: {
    code: 'authenticate_unable_to_authenticate',
    meaning: 'Authentication could not be completed',
    cause: 'Technical issue prevented completion of authentication flow',
    retryable: true,
    fix: 'Retry authentication; if issue persists, fall back to non-3DS flow or alternative payment',
    source: '3D Secure',
  },
};

/**
 * Look up an error code in the registry
 *
 * @param code - The error code to look up (case-insensitive)
 * @param provider - Optional provider filter (braintree, paypal, toss, 3ds)
 * @returns The error code entry or null if not found
 */
export function lookupErrorCode(code: string, provider?: string): ErrorCodeEntry | null {
  // Normalize code to uppercase for lookup
  const normalizedCode = code.toUpperCase();

  // First try direct lookup
  let entry = ERROR_REGISTRY[normalizedCode];

  // If not found and code contains underscores, try lowercase version
  if (!entry) {
    const lowercaseCode = code.toLowerCase();
    entry = ERROR_REGISTRY[lowercaseCode.toUpperCase()];

    // Also try exact lowercase match for 3DS codes
    if (!entry && code.includes('_')) {
      const exactMatch = Object.values(ERROR_REGISTRY).find(
        e => e.code.toLowerCase() === lowercaseCode
      );
      if (exactMatch) {
        entry = exactMatch;
      }
    }
  }

  // If provider filter specified, verify it matches
  if (entry && provider) {
    const normalizedProvider = provider.toLowerCase();
    const entrySource = entry.source.toLowerCase();

    // Check if provider matches (flexible matching)
    const providerMatches =
      entrySource.includes(normalizedProvider) ||
      normalizedProvider.includes(entrySource) ||
      (normalizedProvider === '3ds' && entrySource.includes('3d secure')) ||
      (normalizedProvider === 'toss' && entrySource.includes('toss'));

    if (!providerMatches) {
      return null;
    }
  }

  return entry || null;
}

/**
 * Get all error codes for a specific provider
 *
 * @param provider - The provider to get codes for
 * @returns Array of error code entries for that provider
 */
export function getErrorCodesByProvider(provider: string): ErrorCodeEntry[] {
  const normalizedProvider = provider.toLowerCase();

  return Object.values(ERROR_REGISTRY).filter(entry => {
    const entrySource = entry.source.toLowerCase();
    return (
      entrySource.includes(normalizedProvider) ||
      (normalizedProvider === '3ds' && entrySource.includes('3d secure')) ||
      (normalizedProvider === 'toss' && entrySource.includes('toss'))
    );
  });
}

/**
 * Get all error codes in the registry
 *
 * @returns Array of all error code entries
 */
export function getAllErrorCodes(): ErrorCodeEntry[] {
  return Object.values(ERROR_REGISTRY);
}

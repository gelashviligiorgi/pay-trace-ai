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
 * Keyed by uppercase error code for case-insensitive lookup.
 * Provider-specific prefixes (STRIPE_, ADYEN_, PRIMER_) are used where
 * short numeric codes would otherwise collide across providers.
 * Checkout.com codes use bare numeric keys (globally unique 5-digit range).
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
    meaning: 'Funding Instrument In The PayPal Account Was Declined By The Processor Or Bank, Or It Can\'t Be Used For This Payment',
    cause: 'The PayPal funding instrument (bank account or card) linked to the account was declined or is not eligible for this payment',
    retryable: true,
    fix: 'Ask the customer to update their PayPal payment method or use a different funding source',
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
    meaning: "Transaction flagged as potentially fraudulent by PayPal's risk systems",
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

  // Stripe error codes (prefixed STRIPE_ to avoid key collisions with PayPal)
  STRIPE_ACCOUNT_INVALID: { code: 'account_invalid', meaning: 'The account ID provided is invalid', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_API_KEY_EXPIRED: { code: 'api_key_expired', meaning: 'Your API key has expired', cause: 'Card has passed its expiration date', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_AUTHENTICATION_REQUIRED: { code: 'authentication_required', meaning: 'The payment requires authentication to proceed', cause: 'Issuing bank requires additional authentication', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_BALANCE_INSUFFICIENT: { code: 'balance_insufficient', meaning: 'The transfer or payout could not be completed because the associated account does not have a sufficient balance available', cause: 'Issuing bank declined the transaction with reason: balance insufficient', retryable: true, fix: 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.', source: 'Stripe' },
  STRIPE_CARD_DECLINE_RATE_LIMIT_EXCEEDED: { code: 'card_decline_rate_limit_exceeded', meaning: 'This card has been declined too many times', cause: 'Issuing bank declined the transaction with reason: card declined too many times', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_CHARGE_ALREADY_CAPTURED: { code: 'charge_already_captured', meaning: 'The charge you are attempting to capture has already been captured', cause: 'Duplicate capture attempted', retryable: false, fix: 'Check if the charge was already captured successfully.', source: 'Stripe' },
  STRIPE_CHARGE_ALREADY_REFUNDED: { code: 'charge_already_refunded', meaning: 'The charge you are attempting to refund has already been refunded', cause: 'Duplicate refund attempted', retryable: false, fix: 'Check if the charge was already refunded successfully.', source: 'Stripe' },
  STRIPE_CHARGE_DISPUTED: { code: 'charge_disputed', meaning: 'The charge has been charged back', cause: 'Cardholder disputed the transaction', retryable: false, fix: 'Respond to the dispute through the Stripe dashboard.', source: 'Stripe' },
  STRIPE_CHARGE_EXCEEDS_SOURCE_LIMIT: { code: 'charge_exceeds_source_limit', meaning: 'This charge would cause you to exceed your rolling-window processing limit for this source type', cause: 'Transaction amount exceeds card or account limits', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Stripe' },
  STRIPE_CHARGE_EXPIRED_FOR_CAPTURE: { code: 'charge_expired_for_capture', meaning: 'The charge cannot be captured as the authorization has expired', cause: 'Authorization window has passed', retryable: false, fix: 'Create a new authorization for the payment.', source: 'Stripe' },
  STRIPE_COUNTRY_UNSUPPORTED: { code: 'country_unsupported', meaning: 'Your platform attempted to create a custom account in a country that is not yet supported', cause: 'Geographic restriction applies', retryable: false, fix: 'Use a supported country for account creation.', source: 'Stripe' },
  STRIPE_DUPLICATE_TRANSACTION: { code: 'duplicate_transaction', meaning: 'A transaction with identical amount and credit card information was submitted very recently', cause: 'Duplicate payment detected', retryable: false, fix: 'Check if the original transaction succeeded before retrying.', source: 'Stripe' },
  STRIPE_EXPIRED_CARD: { code: 'expired_card', meaning: 'The card has expired', cause: 'Card has passed its expiration date', retryable: false, fix: 'Request updated card information with a valid expiration date from the customer.', source: 'Stripe' },
  STRIPE_FRAUDULENT: { code: 'fraudulent', meaning: 'The payment has been declined as Stripe suspects it is fraudulent', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Stripe' },
  STRIPE_GENERIC_DECLINE: { code: 'generic_decline', meaning: 'The card has been declined for an unknown reason', cause: 'Issuing bank declined the transaction without specific reason', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_INCORRECT_ADDRESS: { code: 'incorrect_address', meaning: "The card's address is incorrect", cause: 'Address verification failed', retryable: true, fix: 'Verify the billing address with the customer and retry with corrected details.', source: 'Stripe' },
  STRIPE_INCORRECT_CVC: { code: 'incorrect_cvc', meaning: "The card's security code is incorrect", cause: 'CVC/CVV does not match', retryable: true, fix: 'Ask the customer to re-enter the correct security code.', source: 'Stripe' },
  STRIPE_INCORRECT_NUMBER: { code: 'incorrect_number', meaning: 'The card number is incorrect', cause: 'Card number does not match', retryable: true, fix: 'Ask the customer to verify and re-enter the card number.', source: 'Stripe' },
  STRIPE_INCORRECT_PIN: { code: 'incorrect_pin', meaning: 'The PIN entered is incorrect', cause: 'PIN does not match', retryable: true, fix: 'Ask the customer to re-enter the correct PIN.', source: 'Stripe' },
  STRIPE_INCORRECT_ZIP: { code: 'incorrect_zip', meaning: "The card's postal code is incorrect", cause: 'Postal code verification failed', retryable: true, fix: 'Verify the billing postal code with the customer and retry.', source: 'Stripe' },
  STRIPE_INSUFFICIENT_FUNDS: { code: 'insufficient_funds', meaning: 'The card has insufficient funds to complete the purchase', cause: 'Customer account does not have enough funds available', retryable: true, fix: 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.', source: 'Stripe' },
  STRIPE_INVALID_ACCOUNT: { code: 'invalid_account', meaning: 'The card, or account the card is connected to, is invalid', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_INVALID_AMOUNT: { code: 'invalid_amount', meaning: 'The payment amount is invalid, or exceeds the amount that is allowed', cause: 'Amount value is out of accepted range', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_INVALID_CVC: { code: 'invalid_cvc', meaning: "The card's security code is invalid", cause: 'CVC/CVV value is invalid', retryable: true, fix: 'Ask the customer to re-enter the correct security code.', source: 'Stripe' },
  STRIPE_INVALID_EXPIRY_MONTH: { code: 'invalid_expiry_month', meaning: "The card's expiration month is invalid", cause: 'Expiration month is out of range', retryable: true, fix: 'Ask the customer to verify the expiration date.', source: 'Stripe' },
  STRIPE_INVALID_EXPIRY_YEAR: { code: 'invalid_expiry_year', meaning: "The card's expiration year is invalid", cause: 'Expiration year is out of range', retryable: true, fix: 'Ask the customer to verify the expiration date.', source: 'Stripe' },
  STRIPE_INVALID_NUMBER: { code: 'invalid_number', meaning: 'The card number is not a valid credit card number', cause: 'Card number fails Luhn check or is not a valid format', retryable: true, fix: 'Ask the customer to re-enter the card number carefully.', source: 'Stripe' },
  STRIPE_INVALID_PIN: { code: 'invalid_pin', meaning: 'The PIN entered is incorrect', cause: 'PIN does not match issuer records', retryable: true, fix: 'Ask the customer to re-enter the correct PIN.', source: 'Stripe' },
  STRIPE_ISSUER_NOT_AVAILABLE: { code: 'issuer_not_available', meaning: 'The card issuer could not be reached, so the payment could not be authorized', cause: 'Issuing bank is temporarily unavailable', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_LOST_CARD: { code: 'lost_card', meaning: 'The payment has been declined because the card is reported lost', cause: 'Card has been reported lost by the cardholder', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Stripe' },
  STRIPE_MERCHANT_BLACKLIST: { code: 'merchant_blacklist', meaning: "The payment has been declined because it matches a value on the Stripe user's blocklist", cause: 'Card or customer matched a blocklist entry', retryable: false, fix: 'Review blocklist rules in the Stripe dashboard.', source: 'Stripe' },
  STRIPE_NEW_ACCOUNT_INFORMATION_AVAILABLE: { code: 'new_account_information_available', meaning: 'The card, or account the card is connected to, is invalid', cause: 'Newer card information is available; card may have been replaced', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_NO_ACTION_TAKEN: { code: 'no_action_taken', meaning: 'The card has been declined for an unknown reason', cause: 'Issuing bank declined without specific reason', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_NOT_PERMITTED: { code: 'not_permitted', meaning: 'The payment is not permitted', cause: 'Transaction type not allowed for this card', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_OFFLINE_PIN_REQUIRED: { code: 'offline_pin_required', meaning: 'The card has been declined as it requires a PIN', cause: 'Card requires offline PIN entry', retryable: true, fix: 'Use a PIN-capable terminal or request an alternative payment method.', source: 'Stripe' },
  STRIPE_ONLINE_OR_OFFLINE_PIN_REQUIRED: { code: 'online_or_offline_pin_required', meaning: 'The card has been declined as it requires a PIN', cause: 'Card requires PIN entry (online or offline)', retryable: true, fix: 'Use a PIN-capable terminal or request an alternative payment method.', source: 'Stripe' },
  STRIPE_PICKUP_CARD: { code: 'pickup_card', meaning: 'The customer cannot use this card to make this payment (it is possible it has been reported lost or stolen)', cause: 'Card flagged for pickup by issuer', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Stripe' },
  STRIPE_PIN_TRY_EXCEEDED: { code: 'pin_try_exceeded', meaning: 'The allowable number of PIN tries has been exceeded', cause: 'Too many incorrect PIN attempts', retryable: true, fix: 'Customer must contact their bank to unlock the card.', source: 'Stripe' },
  STRIPE_PROCESSING_ERROR: { code: 'processing_error', meaning: 'An error occurred while processing the card', cause: 'Technical error during card processing', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_REENTER_TRANSACTION: { code: 'reenter_transaction', meaning: 'The payment could not be processed by the issuer for an unknown reason', cause: 'Transient issuer error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_RESTRICTED_CARD: { code: 'restricted_card', meaning: 'The customer cannot use this card to make this payment (it is possible it has been reported lost or stolen)', cause: 'Card usage restricted by issuer', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Stripe' },
  STRIPE_REVOCATION_OF_ALL_AUTHORIZATIONS: { code: 'revocation_of_all_authorizations', meaning: 'The card has been declined for an unknown reason', cause: 'All authorizations on the card have been revoked', retryable: true, fix: 'Customer should contact their bank. Request a different payment method.', source: 'Stripe' },
  STRIPE_REVOCATION_OF_AUTHORIZATION: { code: 'revocation_of_authorization', meaning: 'The card has been declined for an unknown reason', cause: 'Authorization for this transaction has been revoked', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_SECURITY_VIOLATION: { code: 'security_violation', meaning: 'The card has been declined for an unknown reason', cause: 'Security violation detected by issuer', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_SERVICE_NOT_ALLOWED: { code: 'service_not_allowed', meaning: 'The card has been declined for an unknown reason', cause: 'Service type not allowed for this card', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_STOLEN_CARD: { code: 'stolen_card', meaning: 'The payment has been declined because the card is reported stolen', cause: 'Card has been reported stolen by the cardholder', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Stripe' },
  STRIPE_STOP_PAYMENT_ORDER: { code: 'stop_payment_order', meaning: 'The card has been declined for an unknown reason', cause: 'A stop payment order has been placed on the card', retryable: true, fix: 'Customer should contact their bank to resolve the stop order.', source: 'Stripe' },
  STRIPE_TESTMODE_DECLINE: { code: 'testmode_decline', meaning: 'A Stripe test card number was used', cause: 'Test card used in live mode or vice versa', retryable: false, fix: 'Use a valid card number instead of a test card number.', source: 'Stripe' },
  STRIPE_TRANSACTION_NOT_ALLOWED: { code: 'transaction_not_allowed', meaning: 'The card has been declined for an unknown reason', cause: 'Transaction type not permitted for this card', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_TRY_AGAIN_LATER: { code: 'try_again_later', meaning: 'The card has been declined for an unknown reason. Ask the customer to attempt the payment again', cause: 'Transient issuer error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_CALL_ISSUER: { code: 'call_issuer', meaning: 'The card has been declined for an unknown reason. Contact the card issuer for more information', cause: 'Issuing bank requires cardholder to call', retryable: true, fix: 'Customer must contact their card issuer for more information.', source: 'Stripe' },
  STRIPE_CARD_NOT_SUPPORTED: { code: 'card_not_supported', meaning: 'The card does not support this type of purchase', cause: 'Card type not permitted for this transaction category', retryable: true, fix: 'Request an alternative payment method from the customer.', source: 'Stripe' },
  STRIPE_CARD_VELOCITY_EXCEEDED: { code: 'card_velocity_exceeded', meaning: 'The customer has exceeded the balance, credit limit, or transaction amount limit available on their card', cause: 'Transaction amount exceeds card or account limits', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Stripe' },
  STRIPE_CURRENCY_NOT_SUPPORTED: { code: 'currency_not_supported', meaning: 'The card does not support the specified currency', cause: 'Card does not support the transaction currency', retryable: true, fix: 'Retry in a supported currency or request an alternative payment method.', source: 'Stripe' },
  STRIPE_DO_NOT_HONOR: { code: 'do_not_honor', meaning: 'The card has been declined for an unknown reason. Contact the card issuer for more information', cause: 'Issuing bank declined without specific reason', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_DO_NOT_TRY_AGAIN: { code: 'do_not_try_again', meaning: 'The card has been declined for an unknown reason. Contact the card issuer for more information', cause: 'Issuing bank declined and advises not to retry', retryable: false, fix: 'Request a different payment method from the customer.', source: 'Stripe' },
  STRIPE_APPROVE_WITH_ID: { code: 'approve_with_id', meaning: 'The payment cannot be authorized. The payment should be attempted again', cause: 'Issuing bank requires identification for approval', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_WITHDRAWAL_COUNT_LIMIT_EXCEEDED: { code: 'withdrawal_count_limit_exceeded', meaning: 'The customer has exceeded the balance or credit limit available on their card', cause: 'Transaction amount exceeds card or account limits', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Stripe' },
  STRIPE_PAYMENT_INTENT_AUTHENTICATION_FAILURE: { code: 'payment_intent_authentication_failure', meaning: "The provided payment method's state failed authentication", cause: 'Authentication of the payment method failed', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_PAYMENT_INTENT_PAYMENT_ATTEMPT_FAILED: { code: 'payment_intent_payment_attempt_failed', meaning: 'The latest payment attempt for the PaymentIntent has failed', cause: 'Issuing bank declined the payment attempt', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Stripe' },
  STRIPE_RATE_LIMIT: { code: 'rate_limit', meaning: 'Too many requests hit the API too quickly', cause: 'API rate limit exceeded', retryable: true, fix: 'Implement exponential back-off and retry the request.', source: 'Stripe' },

  // Checkout.com error codes (bare numeric keys — globally unique 5-digit range)
  '10000': { code: '10000', meaning: 'Approved', cause: 'Transaction approved successfully', retryable: false, fix: 'No action required — payment was approved.', source: 'Checkout.com' },
  '10008': { code: '10008', meaning: 'Approved - Honor with ID (Debit Cards)', cause: 'Transaction approved with ID verification required', retryable: false, fix: 'Verify cardholder ID as required by issuer.', source: 'Checkout.com' },
  '10010': { code: '10010', meaning: 'Partial Value Approved', cause: 'Issuing bank approved only a partial amount', retryable: true, fix: 'Process remaining amount separately or request full payment via another method.', source: 'Checkout.com' },
  '10100': { code: '10100', meaning: 'Flagged as a potentially risky transaction', cause: 'Risk engine flagged the transaction for review', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20001': { code: '20001', meaning: 'Refer to card issuer', cause: 'Issuing bank requires cardholder to call', retryable: true, fix: 'Customer must contact their card issuer for authorization.', source: 'Checkout.com' },
  '20002': { code: '20002', meaning: 'Refer to card issuer - Special conditions', cause: 'Issuer has special conditions for this transaction', retryable: true, fix: 'Customer must contact their card issuer for authorization.', source: 'Checkout.com' },
  '20003': { code: '20003', meaning: 'Invalid merchant or service provider', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20004': { code: '20004', meaning: 'Card should be captured', cause: 'Issuing bank instructed to retain the card', retryable: false, fix: 'Customer must contact their bank. Request a different payment method.', source: 'Checkout.com' },
  '20005': { code: '20005', meaning: 'Declined - Do not honour', cause: 'Issuing bank declined the transaction without specific reason', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20006': { code: '20006', meaning: 'Error / Invalid request parameters', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20009': { code: '20009', meaning: 'Request in progress', cause: 'A request for this transaction is already in progress', retryable: true, fix: 'Wait for the current request to complete before retrying.', source: 'Checkout.com' },
  '20012': { code: '20012', meaning: 'Invalid transaction', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20013': { code: '20013', meaning: 'Invalid value/amount', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20014': { code: '20014', meaning: 'Invalid account number (no such number)', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20015': { code: '20015', meaning: 'Transaction cannot be processed through debit network', cause: 'Debit network not supported for this transaction', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20016': { code: '20016', meaning: 'Card not initialised', cause: 'Card has not been activated by the cardholder', retryable: true, fix: 'Customer needs to activate their card before use.', source: 'Checkout.com' },
  '20017': { code: '20017', meaning: 'Customer cancellation', cause: 'Customer cancelled the transaction', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20018': { code: '20018', meaning: 'Customer dispute', cause: 'Customer has disputed this transaction', retryable: false, fix: 'Respond to the dispute through the Checkout.com dashboard.', source: 'Checkout.com' },
  '20019': { code: '20019', meaning: 'Re-enter transaction', cause: 'Issuing bank declined the transaction with reason: re-enter transaction', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20021': { code: '20021', meaning: 'No action taken (unable to back out prior transaction)', cause: 'Cannot reverse or undo the prior transaction', retryable: false, fix: 'Contact Checkout.com support for assistance.', source: 'Checkout.com' },
  '20022': { code: '20022', meaning: 'Suspected malfunction', cause: 'System malfunction suspected', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20025': { code: '20025', meaning: 'Unable to locate record on file', cause: 'No matching record found', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20028': { code: '20028', meaning: 'File is temporarily unavailable', cause: 'System resource temporarily unavailable', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20030': { code: '20030', meaning: 'Format error', cause: 'Request format is invalid', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20031': { code: '20031', meaning: 'Bank not supported by Switch', cause: 'Issuing bank is not supported by the payment switch', retryable: true, fix: 'Request an alternative payment method from the customer.', source: 'Checkout.com' },
  '20033': { code: '20033', meaning: 'Previous scheme transaction ID invalid', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20038': { code: '20038', meaning: 'Allowable PIN tries exceeded', cause: 'Too many incorrect PIN attempts', retryable: true, fix: 'Customer must contact their bank to unlock the card.', source: 'Checkout.com' },
  '20039': { code: '20039', meaning: 'No credit account', cause: 'No credit facility exists for this card', retryable: true, fix: 'Request an alternative payment method from the customer.', source: 'Checkout.com' },
  '20040': { code: '20040', meaning: 'Requested function not supported', cause: 'Transaction type not supported by issuer', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20044': { code: '20044', meaning: 'No investment account', cause: 'No investment account exists for this card', retryable: true, fix: 'Request an alternative payment method from the customer.', source: 'Checkout.com' },
  '20045': { code: '20045', meaning: 'The Issuer does not support fallback transactions of hybrid-card', cause: 'Issuer rejects fallback for hybrid cards', retryable: true, fix: 'Request an alternative payment method from the customer.', source: 'Checkout.com' },
  '20046': { code: '20046', meaning: 'Bank decline', cause: 'Issuing bank declined the transaction', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20051': { code: '20051', meaning: 'Insufficient funds', cause: 'Customer account does not have enough funds available', retryable: true, fix: 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.', source: 'Checkout.com' },
  '20052': { code: '20052', meaning: 'No current (checking) account', cause: 'No checking account exists for this card', retryable: true, fix: 'Request an alternative payment method from the customer.', source: 'Checkout.com' },
  '20053': { code: '20053', meaning: 'No savings account', cause: 'No savings account exists for this card', retryable: true, fix: 'Request an alternative payment method from the customer.', source: 'Checkout.com' },
  '20054': { code: '20054', meaning: 'Expired card', cause: 'Card has passed its expiration date', retryable: false, fix: 'Request updated card information with a valid expiration date from the customer.', source: 'Checkout.com' },
  '20055': { code: '20055', meaning: 'Incorrect PIN', cause: 'PIN entered does not match issuer records', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20056': { code: '20056', meaning: 'No card record', cause: 'Card not found in issuer system', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20057': { code: '20057', meaning: 'Transaction not permitted to cardholder', cause: 'Transaction type restricted for this cardholder', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20058': { code: '20058', meaning: 'Transaction not permitted to terminal', cause: 'Transaction type not permitted at this terminal', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20059': { code: '20059', meaning: 'Suspected fraud', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Checkout.com' },
  '20060': { code: '20060', meaning: 'Card acceptor contact acquirer', cause: 'Acquirer intervention required', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20061': { code: '20061', meaning: 'Activity amount limit exceeded', cause: 'Transaction amount exceeds card or account limits', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Checkout.com' },
  '20062': { code: '20062', meaning: 'Restricted card', cause: 'Card or transaction type is restricted by the issuer', retryable: false, fix: 'Customer must contact their bank to resolve the issue. Request a different payment method.', source: 'Checkout.com' },
  '20063': { code: '20063', meaning: 'Security violation', cause: 'Security violation detected by issuer', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20064': { code: '20064', meaning: 'Original value incorrect', cause: 'Original transaction value does not match', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20065': { code: '20065', meaning: 'Exceeds Withdrawal Frequency Limit', cause: 'Transaction amount exceeds card or account limits', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Checkout.com' },
  '20068': { code: '20068', meaning: 'Response received too late / Timeout', cause: 'Network or issuer timeout', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20075': { code: '20075', meaning: 'Allowable PIN-entry tries exceeded', cause: 'Maximum PIN attempts reached', retryable: true, fix: 'Customer must contact their bank to unlock the card.', source: 'Checkout.com' },
  '20087': { code: '20087', meaning: 'Bad track data (invalid CVV and/or expiry date)', cause: 'Card data is corrupt or invalid', retryable: true, fix: 'Verify the information with the customer and retry with corrected details.', source: 'Checkout.com' },
  '20091': { code: '20091', meaning: 'Issuer unavailable or switch is inoperative', cause: 'Issuing bank is temporarily unavailable', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20093': { code: '20093', meaning: 'Transaction cannot be completed; violation of law', cause: 'Transaction violates applicable laws or regulations', retryable: false, fix: 'Contact compliance team; request a different payment method.', source: 'Checkout.com' },
  '20094': { code: '20094', meaning: 'Duplicate transmission / invoice', cause: 'Duplicate transaction detected', retryable: false, fix: 'Check if the original transaction succeeded before retrying.', source: 'Checkout.com' },
  '20095': { code: '20095', meaning: 'Reconcile error', cause: 'Reconciliation error between parties', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20096': { code: '20096', meaning: 'System malfunction', cause: 'Technical system error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20099': { code: '20099', meaning: 'Other / Unidentified responses', cause: 'Issuing bank returned an unidentified response', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20100': { code: '20100', meaning: 'Invalid expiry date format', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20101': { code: '20101', meaning: 'No Account / No Customer (Token is incorrect or invalid)', cause: 'Payment token is invalid or expired', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20103': { code: '20103', meaning: 'Card type / payment method not supported', cause: 'Card type not accepted by issuer', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20106': { code: '20106', meaning: 'Unsupported currency', cause: 'Currency not supported for this card', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20107': { code: '20107', meaning: 'Billing address is missing', cause: 'Required billing address not provided', retryable: true, fix: 'Collect and provide the billing address, then retry.', source: 'Checkout.com' },
  '20109': { code: '20109', meaning: 'Transaction already reversed (voided)', cause: 'Transaction has already been reversed', retryable: false, fix: 'No action required — transaction was already reversed.', source: 'Checkout.com' },
  '20110': { code: '20110', meaning: 'Authorization completed', cause: 'Authorization was already completed', retryable: false, fix: 'No action required — authorization is complete.', source: 'Checkout.com' },
  '20112': { code: '20112', meaning: 'Merchant not Mastercard SecureCode enabled', cause: 'Merchant not enrolled in Mastercard SecureCode', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20124': { code: '20124', meaning: 'Missing CVV value, required for ecommerce transaction', cause: 'CVV not provided for an ecommerce transaction', retryable: true, fix: 'Collect the CVV from the customer and retry.', source: 'Checkout.com' },
  '20150': { code: '20150', meaning: 'Card not 3D Secure (3DS) enabled', cause: 'Card is not enrolled in 3D Secure', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20151': { code: '20151', meaning: 'Cardholder failed 3DS authentication', cause: 'Customer did not complete 3DS authentication successfully', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20154': { code: '20154', meaning: '3DS authentication required', cause: 'Issuing bank requires 3DS authentication', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20179': { code: '20179', meaning: 'Lifecycle', cause: 'Transaction lifecycle error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20182': { code: '20182', meaning: 'Policy', cause: 'Transaction rejected due to policy rule', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20183': { code: '20183', meaning: 'Security', cause: 'Security policy violation detected', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '20193': { code: '20193', meaning: 'Invalid country code', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '30004': { code: '30004', meaning: 'Pick up card (No fraud)', cause: 'Issuing bank instructed to retain the card', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Checkout.com' },
  '30015': { code: '30015', meaning: 'No such issuer', cause: 'Issuing bank not found', retryable: false, fix: 'Contact the issuing bank for clarification, or request a different payment method from the customer.', source: 'Checkout.com' },
  '30020': { code: '30020', meaning: 'Invalid amount', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '30021': { code: '30021', meaning: 'Total amount limit reached', cause: 'Transaction amount exceeds card or account limits', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Checkout.com' },
  '30022': { code: '30022', meaning: 'Total transaction count limit reached', cause: 'Too many transactions attempted', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Checkout.com' },
  '30033': { code: '30033', meaning: 'Expired card - Pick up', cause: 'Card has passed its expiration date', retryable: false, fix: 'Request updated card information with a valid expiration date from the customer.', source: 'Checkout.com' },
  '30034': { code: '30034', meaning: 'Suspected fraud - Pick up', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Checkout.com' },
  '30036': { code: '30036', meaning: 'Restricted card - Pick up', cause: 'Card or transaction type is restricted by the issuer', retryable: false, fix: 'Customer must contact their bank to resolve the issue. Request a different payment method.', source: 'Checkout.com' },
  '30038': { code: '30038', meaning: 'Allowable PIN tries exceeded - Pick up', cause: 'Maximum PIN attempts reached', retryable: false, fix: 'Customer must contact their bank to unlock the card.', source: 'Checkout.com' },
  '30041': { code: '30041', meaning: 'Lost card - Pick up', cause: 'Card has been reported lost by the cardholder', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Checkout.com' },
  '30043': { code: '30043', meaning: 'Stolen card - Pick up', cause: 'Card has been reported stolen by the cardholder', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Checkout.com' },
  '30046': { code: '30046', meaning: 'Closed account', cause: 'The account has been closed', retryable: false, fix: 'Request a different payment method from the customer.', source: 'Checkout.com' },
  '41101': { code: '41101', meaning: 'Risk Blocked Transaction', cause: 'Transaction blocked by risk engine', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '41301': { code: '41301', meaning: 'Fraud score exceeds threshold', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Checkout.com' },
  '43101': { code: '43101', meaning: 'Potential fraud risk', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Checkout.com' },
  '43301': { code: '43301', meaning: 'Fraud score exceeds threshold', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Checkout.com' },
  '43401': { code: '43401', meaning: '3DS authentication required', cause: 'Issuing bank requires 3DS authentication', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '50001': { code: '50001', meaning: 'Compliance error', cause: 'Regulatory compliance requirement violated', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '50002': { code: '50002', meaning: 'Sanction screening failure', cause: 'Transaction matched a sanctions list', retryable: false, fix: 'Contact compliance team; the transaction cannot proceed.', source: 'Checkout.com' },
  '50003': { code: '50003', meaning: 'Balance reservation insufficient funds', cause: 'Customer account does not have enough funds available', retryable: true, fix: 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.', source: 'Checkout.com' },
  '50150': { code: '50150', meaning: 'Processing error', cause: 'Technical error during transaction processing', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '50280': { code: '50280', meaning: 'Insufficient funds', cause: 'Customer account does not have enough funds available', retryable: true, fix: 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.', source: 'Checkout.com' },
  '50401': { code: '50401', meaning: 'Bank details invalid', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '50402': { code: '50402', meaning: 'Account not found', cause: 'Recipient account not found in the system', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },
  '50403': { code: '50403', meaning: 'Account inactive', cause: 'Account has been deactivated', retryable: false, fix: 'Customer must activate their account before use.', source: 'Checkout.com' },
  '50404': { code: '50404', meaning: 'Account dormant', cause: 'Account has been dormant due to inactivity', retryable: false, fix: 'Customer must reactivate their account before use.', source: 'Checkout.com' },
  '50405': { code: '50405', meaning: 'Account number invalid', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Checkout.com' },

  // Adyen refusal codes (prefixed ADYEN_ to avoid collision with Primer 2-digit codes)
  ADYEN_2: { code: '2', meaning: 'Refused', cause: 'Issuing bank declined the transaction', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_3: { code: '3', meaning: 'Referral', cause: 'Issuing bank requires cardholder to call for authorization', retryable: true, fix: 'Customer must contact their card issuer.', source: 'Adyen' },
  ADYEN_4: { code: '4', meaning: 'Acquirer Error', cause: 'Technical error at the acquirer level', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_5: { code: '5', meaning: 'Blocked Card', cause: 'Card has been blocked by the issuer', retryable: false, fix: 'Customer must contact their bank to unblock the card.', source: 'Adyen' },
  ADYEN_6: { code: '6', meaning: 'Expired Card', cause: 'Card has passed its expiration date', retryable: false, fix: 'Request updated card information with a valid expiration date from the customer.', source: 'Adyen' },
  ADYEN_7: { code: '7', meaning: 'Invalid Amount', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_8: { code: '8', meaning: 'Invalid Card Number', cause: 'Card number is invalid', retryable: false, fix: 'Contact the issuing bank for clarification, or request a different payment method from the customer.', source: 'Adyen' },
  ADYEN_9: { code: '9', meaning: 'Issuer Unavailable', cause: 'Issuing bank is temporarily unavailable', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_10: { code: '10', meaning: 'Not supported', cause: 'Transaction type not supported by issuer', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_11: { code: '11', meaning: '3D Not Authenticated', cause: '3D Secure authentication was not completed', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_12: { code: '12', meaning: 'Not enough balance', cause: 'Customer account does not have enough funds available', retryable: true, fix: 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.', source: 'Adyen' },
  ADYEN_14: { code: '14', meaning: 'Acquirer Fraud', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Adyen' },
  ADYEN_15: { code: '15', meaning: 'Cancelled', cause: 'Transaction was cancelled', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_16: { code: '16', meaning: 'Shopper Cancelled', cause: 'Customer cancelled the transaction', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_17: { code: '17', meaning: 'Invalid Pin', cause: 'PIN entered is incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_18: { code: '18', meaning: 'Pin tries exceeded', cause: 'Maximum PIN attempts reached', retryable: true, fix: 'Customer must contact their bank to unlock the card.', source: 'Adyen' },
  ADYEN_19: { code: '19', meaning: 'Pin validation not possible', cause: 'PIN validation cannot be performed', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_20: { code: '20', meaning: 'FRAUD', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Adyen' },
  ADYEN_21: { code: '21', meaning: 'Not Submitted', cause: 'Transaction was not submitted to the issuer', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_22: { code: '22', meaning: 'FRAUD-CANCELLED', cause: 'Transaction flagged as potentially fraudulent and cancelled', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Adyen' },
  ADYEN_23: { code: '23', meaning: 'Transaction Not Permitted', cause: 'Transaction type not permitted for this card', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_24: { code: '24', meaning: 'CVC Declined', cause: 'CVC/CVV does not match', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_25: { code: '25', meaning: 'Restricted Card', cause: 'Card or transaction type is restricted by the issuer', retryable: false, fix: 'Customer must contact their bank to resolve the issue. Request a different payment method.', source: 'Adyen' },
  ADYEN_26: { code: '26', meaning: 'Revocation Of Auth', cause: 'Authorization has been revoked by the issuer', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_27: { code: '27', meaning: 'Declined Non Generic', cause: 'Non-generic decline from issuer', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_28: { code: '28', meaning: 'Withdrawal amount exceeded', cause: 'Withdrawal amount exceeds limit', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits.', source: 'Adyen' },
  ADYEN_29: { code: '29', meaning: 'Withdrawal count exceeded', cause: 'Too many withdrawals attempted', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits.', source: 'Adyen' },
  ADYEN_31: { code: '31', meaning: 'Issuer Suspected Fraud', cause: 'Transaction flagged as potentially fraudulent by issuer', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Adyen' },
  ADYEN_32: { code: '32', meaning: 'AVS Declined', cause: 'Address verification failed', retryable: true, fix: 'Verify the information with the customer and retry with corrected details.', source: 'Adyen' },
  ADYEN_33: { code: '33', meaning: 'Card requires online pin', cause: 'Card requires online PIN entry', retryable: true, fix: 'Use a PIN-capable terminal or request an alternative payment method.', source: 'Adyen' },
  ADYEN_38: { code: '38', meaning: 'Authentication required', cause: 'Additional authentication required', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_39: { code: '39', meaning: 'RReq not received from DS', cause: 'Directory server did not respond', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_40: { code: '40', meaning: 'Current AID is in Penalty Box', cause: 'Merchant temporarily suspended due to excessive declines', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_42: { code: '42', meaning: '3DS Authentication Error', cause: '3DS authentication failed with an error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_46: { code: '46', meaning: 'Transaction blocked by Adyen to prevent excessive retry fees', cause: 'Excessive retry attempts detected', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },
  ADYEN_50: { code: '50', meaning: 'Token Revoked', cause: 'Payment token has been revoked', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Adyen' },

  // Primer (Visa/Mastercard) codes (prefixed PRIMER_ to avoid collision with Adyen numeric codes)
  PRIMER_00: { code: '00', meaning: 'Approved - Transaction approved successfully', cause: 'Issuing bank approved the transaction', retryable: false, fix: 'No action required — payment was approved.', source: 'Primer' },
  PRIMER_01: { code: '01', meaning: 'Refer to card issuer - The cardholder should contact their issuing bank', cause: 'Issuing bank requires cardholder to call', retryable: true, fix: 'Customer must contact their card issuer.', source: 'Primer' },
  PRIMER_02: { code: '02', meaning: 'Refer to card issuer, special condition - Contact issuer for special condition', cause: 'Issuer has special conditions for this transaction', retryable: true, fix: 'Customer must contact their card issuer for authorization.', source: 'Primer' },
  PRIMER_03: { code: '03', meaning: 'Invalid merchant - The merchant ID is invalid or not recognized by the issuer', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_04: { code: '04', meaning: 'Pickup card - The card should be captured and retained', cause: 'Card flagged for retention by the issuer', retryable: false, fix: 'Customer must contact their bank to resolve the issue. Request a different payment method.', source: 'Primer' },
  PRIMER_05: { code: '05', meaning: 'Do not honor - The issuing bank has blocked the transaction without providing a specific reason', cause: 'Issuing bank declined the transaction without specific reason', retryable: false, fix: 'Contact the issuing bank for clarification, or request a different payment method from the customer.', source: 'Primer' },
  PRIMER_06: { code: '06', meaning: 'Error - General card error occurred during processing', cause: 'General card processing error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_07: { code: '07', meaning: 'Pickup card, special condition - Card should be retained due to security concerns', cause: 'Card flagged for retention by issuer due to security concerns', retryable: false, fix: 'Customer must contact their bank to resolve the issue. Request a different payment method.', source: 'Primer' },
  PRIMER_08: { code: '08', meaning: 'Honor with identification - Approve transaction after verifying cardholder ID', cause: 'Issuing bank approved but requires ID verification', retryable: true, fix: 'Verify the cardholder ID as required by the issuer.', source: 'Primer' },
  PRIMER_10: { code: '10', meaning: 'Approved for partial amount - Transaction approved for partial amount only', cause: 'Issuing bank approved only a partial amount', retryable: true, fix: 'Process remaining amount separately or request full payment via another method.', source: 'Primer' },
  PRIMER_12: { code: '12', meaning: 'Invalid transaction - The transaction format or details are invalid', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_13: { code: '13', meaning: 'Invalid amount - The transaction amount is invalid or out of range', cause: 'Payment information provided is invalid or incorrect', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_14: { code: '14', meaning: 'Invalid card number - The card number is not valid or does not exist', cause: 'Payment information provided is invalid or incorrect', retryable: false, fix: 'Contact the issuing bank for clarification, or request a different payment method from the customer.', source: 'Primer' },
  PRIMER_15: { code: '15', meaning: 'No such issuer - The card issuer could not be identified or does not exist', cause: 'Issuing bank cannot be identified', retryable: false, fix: 'Contact the issuing bank for clarification, or request a different payment method from the customer.', source: 'Primer' },
  PRIMER_19: { code: '19', meaning: 'Re-enter transaction - The transaction should be attempted again', cause: 'Transient error requiring transaction retry', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_30: { code: '30', meaning: 'Format error - The transaction message format is incorrect', cause: 'Transaction message format is invalid', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_38: { code: '38', meaning: 'Allowable PIN tries exceeded - Maximum PIN attempts exceeded', cause: 'Too many incorrect PIN attempts', retryable: true, fix: 'Customer must contact their bank to unlock the card.', source: 'Primer' },
  PRIMER_39: { code: '39', meaning: 'No credit account - No credit account exists for this card', cause: 'No credit account linked to this card', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_41: { code: '41', meaning: 'Lost card - The card has been reported as lost by the cardholder', cause: 'Card has been reported lost by the cardholder', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Primer' },
  PRIMER_43: { code: '43', meaning: 'Stolen card - The card has been reported as stolen by the cardholder', cause: 'Card has been reported stolen by the cardholder', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Primer' },
  PRIMER_51: { code: '51', meaning: 'Insufficient funds - The account does not have sufficient funds to complete the transaction', cause: 'Customer account does not have enough funds available', retryable: true, fix: 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.', source: 'Primer' },
  PRIMER_52: { code: '52', meaning: 'No checking account - No checking account exists for this card', cause: 'No checking account linked to this card', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_53: { code: '53', meaning: 'No savings account - No savings account exists for this card', cause: 'No savings account linked to this card', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_54: { code: '54', meaning: 'Expired card - The card has passed its expiration date and is no longer valid', cause: 'Card has passed its expiration date', retryable: false, fix: 'Request updated card information with a valid expiration date from the customer.', source: 'Primer' },
  PRIMER_55: { code: '55', meaning: 'Incorrect PIN - The PIN entered is incorrect', cause: 'PIN does not match issuer records', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_57: { code: '57', meaning: 'Transaction not permitted to cardholder - This type of transaction is not allowed for this card', cause: 'Transaction type restricted for this cardholder', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_58: { code: '58', meaning: 'Transaction not permitted to terminal - This transaction type is not supported by the terminal', cause: 'Transaction type not supported at this terminal', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_59: { code: '59', meaning: 'Suspected fraud - The transaction has been flagged as potentially fraudulent', cause: 'Transaction flagged as potentially fraudulent', retryable: false, fix: 'Customer must contact their bank immediately. Request a different payment method from the customer.', source: 'Primer' },
  PRIMER_61: { code: '61', meaning: 'Exceeds withdrawal amount limit - The customer exceeded their withdrawal limit', cause: 'Transaction amount exceeds card or account limits', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Primer' },
  PRIMER_62: { code: '62', meaning: 'Restricted card - Service restricted, country or category blocked', cause: 'Card or transaction type is restricted by the issuer', retryable: false, fix: 'Customer must contact their bank to resolve the issue. Request a different payment method.', source: 'Primer' },
  PRIMER_63: { code: '63', meaning: 'Security violation - A security breach or violation was detected', cause: 'Security violation detected', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_65: { code: '65', meaning: 'Activity limit exceeded - The cardholder has exceeded the number of purchases allowed in a time period', cause: 'Transaction amount exceeds card or account limits', retryable: true, fix: 'Retry with a lower amount, or ask customer to contact their bank to increase limits, or use a different payment method.', source: 'Primer' },
  PRIMER_75: { code: '75', meaning: 'PIN tries exceeded - Maximum number of PIN entry attempts has been exceeded', cause: 'Too many incorrect PIN attempts', retryable: true, fix: 'Customer must contact their bank to unlock the card.', source: 'Primer' },
  PRIMER_78: { code: '78', meaning: 'Blocked, first use - New card blocked on first use (activation required)', cause: 'Card not activated for use', retryable: true, fix: 'Customer needs to activate their card before use.', source: 'Primer' },
  PRIMER_80: { code: '80', meaning: 'Network error - Communication error with card network', cause: 'Network communication error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_81: { code: '81', meaning: 'Cryptographic error - Encryption or security error occurred', cause: 'Encryption or security error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_82: { code: '82', meaning: 'Negative CAM, dCVV, iCVV, or CVV results - Card verification failed', cause: 'CVV/security code does not match', retryable: true, fix: 'Verify the information with the customer and retry with corrected details.', source: 'Primer' },
  PRIMER_85: { code: '85', meaning: 'No reason to decline - Transaction approved but flagged for monitoring', cause: 'Transaction approved but under monitoring', retryable: false, fix: 'No action required — payment was approved.', source: 'Primer' },
  PRIMER_86: { code: '86', meaning: 'PIN validation not possible - Unable to validate the PIN at this time', cause: 'PIN validation system unavailable', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_88: { code: '88', meaning: 'Cryptographic failure - PIN encryption or validation failed', cause: 'PIN encryption failure', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_91: { code: '91', meaning: 'Issuer unavailable - The card issuer is temporarily unavailable or offline', cause: 'Issuing bank is temporarily unavailable', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_92: { code: '92', meaning: 'Unable to route transaction - The transaction could not be routed to the issuer', cause: 'Transaction routing failure', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_93: { code: '93', meaning: 'Transaction cannot be completed - Violation of law or regulation', cause: 'Transaction violates applicable laws or regulations', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_94: { code: '94', meaning: 'Duplicate transaction - This transaction appears to be a duplicate', cause: 'Duplicate payment detected', retryable: false, fix: 'Check if the original transaction succeeded before retrying.', source: 'Primer' },
  PRIMER_96: { code: '96', meaning: 'System malfunction - A technical error occurred in the payment system', cause: 'Technical system error', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_100: { code: '100', meaning: 'Do not honor - Generic decline from issuer', cause: 'Issuing bank declined the transaction without specific reason', retryable: false, fix: 'Contact the issuing bank for clarification, or request a different payment method from the customer.', source: 'Primer' },
  PRIMER_N4: { code: 'N4', meaning: 'Insufficient funds - Exceeds issuer withdrawal limit', cause: 'Customer account does not have enough funds available', retryable: true, fix: 'Retry the transaction after customer adds funds to their account, or request an alternative payment method.', source: 'Primer' },
  PRIMER_N7: { code: 'N7', meaning: 'CVV2 failure - The card security code (CVV) does not match', cause: 'CVV/security code does not match', retryable: true, fix: 'Verify the information with the customer and retry with corrected details.', source: 'Primer' },
  PRIMER_1A: { code: '1A', meaning: 'Authentication required - Additional authentication is needed to complete this transaction (Mastercard specific)', cause: 'Additional authentication required by Mastercard', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_A1: { code: 'A1', meaning: 'AVS failed - Address verification failed', cause: 'Address verification failed', retryable: true, fix: 'Verify the information with the customer and retry with corrected details.', source: 'Primer' },
  PRIMER_R0: { code: 'R0', meaning: 'Stop payment order - The cardholder has requested to stop payment', cause: 'Cardholder requested stop payment', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
  PRIMER_R1: { code: 'R1', meaning: 'Revocation of authorization - Previous authorization has been revoked', cause: 'Previous authorization has been revoked by the cardholder', retryable: true, fix: 'Retry the transaction after a short delay, or request an alternative payment method if retries fail.', source: 'Primer' },
};

/**
 * Look up an error code in the registry
 *
 * @param code - The error code to look up (case-insensitive)
 * @param provider - Optional provider filter (braintree, paypal, toss, 3ds, stripe, checkout, adyen, primer)
 * @returns The error code entry or null if not found
 */
export function lookupErrorCode(code: string, provider?: string): ErrorCodeEntry | null {
  const normalizedCode = code.toUpperCase();

  // 1. Direct key lookup
  let entry = ERROR_REGISTRY[normalizedCode];

  // 2. If provider specified, try provider-prefixed key (e.g. STRIPE_INSUFFICIENT_FUNDS, ADYEN_6)
  if (provider) {
    const providerPrefix = provider.toLowerCase()
      .replace('.com', '')
      .replace(/\s+.*/, '')
      .toUpperCase();
    const prefixedEntry = ERROR_REGISTRY[`${providerPrefix}_${normalizedCode}`];
    if (prefixedEntry) {
      entry = prefixedEntry;
    }
  }

  // 3. Underscore-code fallback: scan for exact case-insensitive code match
  if (!entry && code.includes('_')) {
    const lowercaseCode = code.toLowerCase();
    const exactMatch = Object.values(ERROR_REGISTRY).find(
      e => e.code.toLowerCase() === lowercaseCode
    );
    if (exactMatch) {
      entry = exactMatch;
    }
  }

  // 4. If provider specified and still no match, linear scan for code + matching source
  if (!entry && provider) {
    const normalizedProvider = provider.toLowerCase().replace('.com', '');
    const lowCode = code.toLowerCase();
    const found = Object.values(ERROR_REGISTRY).find(
      e =>
        e.code.toLowerCase() === lowCode &&
        e.source.toLowerCase().includes(normalizedProvider)
    );
    if (found) {
      entry = found;
    }
  }

  // 5. Provider filter: verify the found entry belongs to the requested provider
  if (entry && provider) {
    const normalizedProvider = provider.toLowerCase();
    const entrySource = entry.source.toLowerCase();
    const providerMatches =
      entrySource.includes(normalizedProvider.replace('.com', '')) ||
      normalizedProvider.includes(entrySource) ||
      (normalizedProvider === '3ds' && entrySource.includes('3d secure')) ||
      (normalizedProvider === 'toss' && entrySource.includes('toss')) ||
      (normalizedProvider === 'checkout' && entrySource.includes('checkout')) ||
      (normalizedProvider === 'checkout.com' && entrySource.includes('checkout'));

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
  const normalizedProvider = provider.toLowerCase().replace('.com', '');

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

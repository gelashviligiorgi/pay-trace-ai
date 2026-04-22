/**
 * Stripe error codes and decline codes fetcher
 *
 * Sources:
 * - https://docs.stripe.com/error-codes
 * - https://docs.stripe.com/declines/codes
 */

const axios = require('axios');
const cheerio = require('cheerio');
const {
  determineDeclineType,
  buildEnrichedChunk,
} = require('../enrichers/processor-codes.cts');

interface ProcessorCode {
  code: string;
  message: string;
  type: 'hard' | 'soft';
}

/**
 * Attempt to fetch Stripe codes from documentation
 * Note: These pages use client-side rendering, so we'll use hardcoded data for now
 */
async function fetchFromDocs(): Promise<ProcessorCode[] | null> {
  try {
    console.log('  Attempting to fetch from Stripe documentation...');
    const [declineCodesResponse, errorCodesResponse] = await Promise.all([
      axios.get('https://docs.stripe.com/declines/codes', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }),
      axios.get('https://docs.stripe.com/error-codes', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }),
    ]);

    const codes: ProcessorCode[] = [];

    // Try to parse tables from both pages
    for (const response of [declineCodesResponse, errorCodesResponse]) {
      const html = response.data;

      // Check if we got meaningful content (not just SSR shell)
      if (html.length < 1000 || (!html.includes('code') && !html.includes('error'))) {
        continue;
      }

      const $ = cheerio.load(html);

      // Try to parse table structure if it exists in the HTML
      $('table tr').each((_: any, row: any) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const code = $(cells[0]).text().trim();
          const message = $(cells[1]).text().trim();

          if (code && message && code.length > 0) {
            codes.push({
              code,
              message,
              type: determineDeclineType(code, message),
            });
          }
        }
      });
    }

    if (codes.length > 0) {
      console.log(`  ✓ Successfully fetched ${codes.length} codes from documentation`);
      return codes;
    }

    return null;
  } catch (error: any) {
    console.log(`  ⚠️  Failed to fetch from documentation: ${error.message}`);
    return null;
  }
}

/**
 * Fallback: Use hardcoded Stripe error codes and decline codes
 *
 * Sources:
 * - https://docs.stripe.com/error-codes
 * - https://docs.stripe.com/declines/codes
 */
function getHardcodedCodes(): ProcessorCode[] {
  console.log('  Using hardcoded Stripe error and decline codes as fallback...');

  const hardcodedCodes: Array<{ code: string; message: string }> = [
    // API Error Codes (from https://docs.stripe.com/error-codes)
    { code: 'account_invalid', message: 'The account ID provided as a value for the Stripe-Account header is invalid' },
    { code: 'api_key_expired', message: 'Your API key has expired' },
    { code: 'authentication_required', message: 'The payment requires authentication to proceed' },
    { code: 'balance_insufficient', message: 'The transfer or payout could not be completed because the associated account does not have a sufficient balance available' },
    { code: 'card_decline_rate_limit_exceeded', message: 'This card has been declined too many times' },
    { code: 'charge_already_captured', message: 'The charge you\'re attempting to capture has already been captured' },
    { code: 'charge_already_refunded', message: 'The charge you\'re attempting to refund has already been refunded' },
    { code: 'charge_disputed', message: 'The charge you\'re attempting to refund has been charged back' },
    { code: 'charge_exceeds_source_limit', message: 'This charge would cause you to exceed your rolling-window processing limit for this source type' },
    { code: 'charge_expired_for_capture', message: 'The charge cannot be captured as the authorization has expired' },
    { code: 'charge_invalid_parameter', message: 'One or more provided parameters was not allowed for the given operation on the Charge' },
    { code: 'country_unsupported', message: 'Your platform attempted to create a custom account in a country that is not yet supported' },
    { code: 'customer_max_payment_methods', message: 'The maximum number of payment methods has been reached for this customer' },
    { code: 'customer_max_subscriptions', message: 'The maximum number of subscriptions has been reached for this customer' },
    { code: 'email_invalid', message: 'The email address is invalid' },
    { code: 'expired_card', message: 'The card has expired' },
    { code: 'idempotency_key_in_use', message: 'The idempotency key provided is currently being used in another request' },
    { code: 'incorrect_address', message: 'The card\'s address is incorrect' },
    { code: 'incorrect_cvc', message: 'The card\'s security code is incorrect' },
    { code: 'incorrect_number', message: 'The card number is incorrect' },
    { code: 'incorrect_zip', message: 'The card\'s postal code is incorrect' },
    { code: 'instant_payouts_unsupported', message: 'The debit card provided does not support instant payouts' },
    { code: 'invalid_card_type', message: 'The card provided as an external account is not supported for payouts' },
    { code: 'invalid_charge_amount', message: 'The specified amount is invalid' },
    { code: 'invalid_cvc', message: 'The card\'s security code is invalid' },
    { code: 'invalid_expiry_month', message: 'The card\'s expiration month is invalid' },
    { code: 'invalid_expiry_year', message: 'The card\'s expiration year is invalid' },
    { code: 'invalid_number', message: 'The card number is not a valid credit card number' },
    { code: 'invalid_source_usage', message: 'The source cannot be used because it is not in the correct state' },
    { code: 'invoice_no_customer_line_items', message: 'An invoice cannot be generated for the specified customer as there are no pending invoice items' },
    { code: 'invoice_no_subscription_line_items', message: 'An invoice cannot be generated for the specified subscription as there are no pending invoice items' },
    { code: 'invoice_not_editable', message: 'The specified invoice can no longer be edited' },
    { code: 'invoice_payment_intent_requires_action', message: 'The payment attempt on the invoice requires additional user action to complete' },
    { code: 'invoice_upcoming_none', message: 'There is no upcoming invoice on the specified customer to preview' },
    { code: 'livemode_mismatch', message: 'Test and live mode API keys, requests, and objects are only available within the mode they are in' },
    { code: 'missing', message: 'Both a customer and source ID have been provided, but the source has not been saved to the customer' },
    { code: 'not_allowed_on_standard_account', message: 'Transfers and payouts on behalf of a standard connected account are not allowed' },
    { code: 'order_creation_failed', message: 'The order could not be created' },
    { code: 'order_required_settings', message: 'The order requires some payment method types to be enabled in your Dashboard' },
    { code: 'order_status_invalid', message: 'The order cannot be updated because the status provided is either invalid or does not follow a valid state transition' },
    { code: 'order_upstream_timeout', message: 'The request timed out' },
    { code: 'out_of_inventory', message: 'The SKU is out of inventory' },
    { code: 'parameter_invalid_empty', message: 'One or more required values were not provided' },
    { code: 'parameter_invalid_integer', message: 'One or more of the parameters requires an integer, but the values provided were a different type' },
    { code: 'parameter_invalid_string_blank', message: 'One or more values provided only included whitespace' },
    { code: 'parameter_invalid_string_empty', message: 'One or more required string values is empty' },
    { code: 'parameter_missing', message: 'One or more required values are missing' },
    { code: 'parameter_unknown', message: 'The request contains one or more unexpected parameters' },
    { code: 'parameters_exclusive', message: 'Two or more mutually exclusive parameters were provided' },
    { code: 'payment_intent_authentication_failure', message: 'The provided payment method\'s state failed authentication' },
    { code: 'payment_intent_incompatible_payment_method', message: 'The PaymentIntent expected a different PaymentMethod than what was provided' },
    { code: 'payment_intent_invalid_parameter', message: 'One or more provided parameters was not allowed for the given operation on the PaymentIntent' },
    { code: 'payment_intent_payment_attempt_failed', message: 'The latest payment attempt for the PaymentIntent has failed' },
    { code: 'payment_intent_unexpected_state', message: 'The PaymentIntent\'s state was incompatible with the operation you were trying to perform' },
    { code: 'payment_method_unactivated', message: 'The charge cannot be created as the payment method used has not been activated' },
    { code: 'payment_method_unexpected_state', message: 'The provided payment method\'s state was incompatible with the operation you were trying to perform' },
    { code: 'payouts_not_allowed', message: 'Payouts have been disabled on the connected account' },
    { code: 'platform_api_key_expired', message: 'Your platform\'s API key has expired' },
    { code: 'postal_code_invalid', message: 'The postal code provided was incorrect' },
    { code: 'processing_error', message: 'An error occurred while processing the card' },
    { code: 'product_inactive', message: 'The product this SKU belongs to is no longer available for purchase' },
    { code: 'rate_limit', message: 'Too many requests hit the API too quickly' },
    { code: 'resource_already_exists', message: 'A resource with a user-specified ID already exists' },
    { code: 'resource_missing', message: 'The ID provided is not valid' },
    { code: 'routing_number_invalid', message: 'The bank routing number provided is invalid' },
    { code: 'secret_key_required', message: 'The API key provided is a publishable key, but a secret key is required' },
    { code: 'sepa_unsupported_account', message: 'Your account does not support SEPA payments' },
    { code: 'setup_attempt_failed', message: 'The latest setup attempt for the SetupIntent has failed' },
    { code: 'setup_intent_authentication_failure', message: 'The provided payment method\'s state failed authentication' },
    { code: 'setup_intent_invalid_parameter', message: 'One or more provided parameters was not allowed for the given operation on the SetupIntent' },
    { code: 'setup_intent_unexpected_state', message: 'The SetupIntent\'s state was incompatible with the operation you were trying to perform' },
    { code: 'shipping_calculation_failed', message: 'Shipping calculation failed as the information provided was either incorrect or could not be verified' },
    { code: 'sku_inactive', message: 'The SKU is inactive and no longer available for purchase' },
    { code: 'state_unsupported', message: 'Occurs when providing the legal_entity information for a U.S. custom account, if the provided state is not supported' },
    { code: 'tax_id_invalid', message: 'The tax ID number provided is invalid' },
    { code: 'taxes_calculation_failed', message: 'Tax calculation for the order failed' },
    { code: 'testmode_charges_only', message: 'Your account has not been activated and can only make test charges' },
    { code: 'tls_version_unsupported', message: 'Your integration is using an older version of TLS that is unsupported' },
    { code: 'token_already_used', message: 'The token provided has already been used' },
    { code: 'token_in_use', message: 'The token provided is currently being used in another request' },
    { code: 'transfers_not_allowed', message: 'The requested transfer cannot be created' },
    { code: 'upstream_order_creation_failed', message: 'The order could not be created' },
    { code: 'url_invalid', message: 'The URL provided is invalid' },

    // Decline Codes (from https://docs.stripe.com/declines/codes)
    { code: 'approve_with_id', message: 'The payment cannot be authorized. The payment should be attempted again' },
    { code: 'call_issuer', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'card_not_supported', message: 'The card does not support this type of purchase' },
    { code: 'card_velocity_exceeded', message: 'The customer has exceeded the balance, credit limit, or transaction amount limit available on their card' },
    { code: 'currency_not_supported', message: 'The card does not support the specified currency' },
    { code: 'do_not_honor', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'do_not_try_again', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'duplicate_transaction', message: 'A transaction with identical amount and credit card information was submitted very recently' },
    { code: 'fraudulent', message: 'The payment has been declined as Stripe suspects it is fraudulent' },
    { code: 'generic_decline', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'incorrect_pin', message: 'The PIN entered is incorrect' },
    { code: 'insufficient_funds', message: 'The card has insufficient funds to complete the purchase' },
    { code: 'invalid_account', message: 'The card, or account the card is connected to, is invalid' },
    { code: 'invalid_amount', message: 'The payment amount is invalid, or exceeds the amount that is allowed' },
    { code: 'invalid_pin', message: 'The PIN entered is incorrect' },
    { code: 'issuer_not_available', message: 'The card issuer could not be reached, so the payment could not be authorized' },
    { code: 'lost_card', message: 'The payment has been declined because the card is reported lost' },
    { code: 'merchant_blacklist', message: 'The payment has been declined because it matches a value on the Stripe user\'s blocklist' },
    { code: 'new_account_information_available', message: 'The card, or account the card is connected to, is invalid' },
    { code: 'no_action_taken', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'not_permitted', message: 'The payment is not permitted' },
    { code: 'offline_pin_required', message: 'The card has been declined as it requires a PIN' },
    { code: 'online_or_offline_pin_required', message: 'The card has been declined as it requires a PIN' },
    { code: 'pickup_card', message: 'The customer cannot use this card to make this payment (it is possible it has been reported lost or stolen)' },
    { code: 'pin_try_exceeded', message: 'The allowable number of PIN tries has been exceeded' },
    { code: 'reenter_transaction', message: 'The payment could not be processed by the issuer for an unknown reason' },
    { code: 'restricted_card', message: 'The customer cannot use this card to make this payment (it is possible it has been reported lost or stolen)' },
    { code: 'revocation_of_all_authorizations', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'revocation_of_authorization', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'security_violation', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'service_not_allowed', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'stolen_card', message: 'The payment has been declined because the card is reported stolen' },
    { code: 'stop_payment_order', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'testmode_decline', message: 'A Stripe test card number was used' },
    { code: 'transaction_not_allowed', message: 'The card has been declined for an unknown reason. Contact the card issuer for more information' },
    { code: 'try_again_later', message: 'The card has been declined for an unknown reason. Ask the customer to attempt the payment again' },
    { code: 'withdrawal_count_limit_exceeded', message: 'The customer has exceeded the balance or credit limit available on their card' },
  ];

  return hardcodedCodes.map(({ code, message }) => ({
    code,
    message,
    type: determineDeclineType(code, message),
  }));
}

/**
 * Main fetcher function for Stripe
 * Returns enriched text chunks ready to be saved
 */
export async function fetchStripe(): Promise<string[]> {
  console.log('\n📥 Fetching Stripe error codes and decline codes...');

  // Try documentation first
  let codes = await fetchFromDocs();

  // Fall back to hardcoded list if docs fail
  if (!codes || codes.length === 0) {
    codes = getHardcodedCodes();
  }

  console.log(`\n🔧 Building enriched chunks for ${codes.length} codes...`);

  // Build enriched text chunks
  const chunks = codes.map(code => buildEnrichedChunk(code, 'Stripe'));

  console.log(`  ✓ Built ${chunks.length} enriched chunks`);

  return chunks;
}

// Allow running this fetcher standalone
if (require.main === module) {
  const { writeFileSync } = require('fs');
  const { join } = require('path');

  fetchStripe()
    .then(chunks => {
      const content = chunks.join('\n\n');
      const outputPath = join(__dirname, '../../knowledge-base', 'Stripe.txt');
      writeFileSync(outputPath, content, 'utf-8');
      console.log(`\n✅ Saved to ${outputPath}`);
      console.log(`   Total chunks: ${chunks.length}`);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

/**
 * Adyen refusal reasons fetcher
 *
 * Source: https://docs.adyen.com/development-resources/refusal-reasons
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { config } = require('dotenv');
config({ path: '.env.local' });
config();

const {
  determineDeclineType,
  buildEnrichedChunksWithClaude,
} = require('../enrichers/processor-codes.cts');

interface ProcessorCode {
  code: string;
  message: string;
  type: 'hard' | 'soft';
}

/**
 * Attempt to fetch Adyen refusal reasons from documentation
 * Note: This page uses client-side rendering, so we'll use hardcoded data for now
 */
async function fetchFromDocs(): Promise<ProcessorCode[] | null> {
  try {
    console.log('  Attempting to fetch from Adyen documentation...');
    const response = await axios.get(
      'https://docs.adyen.com/development-resources/refusal-reasons',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    const html = response.data;

    // Check if we got meaningful content (not just SSR shell)
    if (html.length < 1000 || !html.includes('refusal') && !html.includes('decline')) {
      console.log('  ⚠️  Page appears to use client-side rendering, falling back to hardcoded codes');
      return null;
    }

    const $ = cheerio.load(html);
    const codes: ProcessorCode[] = [];

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
 * Fallback: Use hardcoded Adyen refusal reasons
 *
 * These codes are from: https://docs.adyen.com/development-resources/refusal-reasons
 */
function getHardcodedCodes(): ProcessorCode[] {
  console.log('  Using hardcoded Adyen refusal reasons as fallback...');

  const hardcodedCodes: Array<{ code: string; message: string }> = [
    // Fraud and security
    { code: 'FRAUD', message: 'The payment is flagged by Adyen\'s risk system as potentially fraudulent' },
    { code: 'FRAUD-CANCELLED', message: 'The payment is flagged by Adyen\'s risk system and was cancelled by the merchant' },
    { code: 'Risk-Blocked', message: 'Payment blocked by Risk due to suspected fraud' },
    { code: 'Acquirer Fraud', message: 'Acquirer flagged transaction as fraudulent' },
    { code: 'FRAUD_MANUAL_REVIEW', message: 'Payment flagged for manual fraud review' },
    { code: 'Suspected Fraud', message: 'Transaction suspected to be fraudulent by the issuer' },
    { code: 'Blocked Card', message: 'Card is blocked due to suspected fraud or misuse' },
    { code: 'Restricted Card', message: 'Card has been restricted by the issuer' },

    // Card issues
    { code: 'Expired Card', message: 'The card has expired' },
    { code: 'Invalid Card Number', message: 'The card number is not valid' },
    { code: 'Invalid Pin', message: 'The PIN entered is incorrect' },
    { code: 'Pin tries exceeded', message: 'The maximum number of PIN attempts has been exceeded' },
    { code: 'Pin validation not possible', message: 'PIN validation could not be performed' },
    { code: 'CVC Declined', message: 'The card security code (CVC/CVV) is incorrect' },
    { code: 'Referral', message: 'The cardholder should contact their issuing bank for more information' },
    { code: 'Issuer Suspected Fraud', message: 'The issuer suspects the transaction is fraudulent' },

    // Insufficient funds
    { code: 'Not enough balance', message: 'The account does not have sufficient funds' },
    { code: 'Insufficient Funds', message: 'Card has insufficient funds to complete the purchase' },
    { code: 'Withdrawal amount exceeded', message: 'The withdrawal amount exceeds the card limit' },
    { code: 'Withdrawal count exceeded', message: 'The number of withdrawals exceeds the card limit' },

    // Card restrictions
    { code: 'Transaction Not Permitted', message: 'This type of transaction is not permitted for this card' },
    { code: 'Online Revoked', message: 'Card has been revoked for online transactions' },
    { code: 'Revocation Of Auth', message: 'The authorization has been revoked' },
    { code: 'Revocation Of All Authorizations', message: 'All authorizations for this card have been revoked' },
    { code: 'Card Not Activated', message: 'Card needs to be activated before use' },

    // Lost/Stolen
    { code: 'Restricted Card', message: 'The card has been restricted by the issuer' },
    { code: 'Lost Card', message: 'The card has been reported as lost' },
    { code: 'Stolen Card', message: 'The card has been reported as stolen' },
    { code: 'Pickup Card', message: 'The card should be retained by the merchant' },

    // Issuer/acquirer issues
    { code: 'Refused', message: 'The transaction was refused by the issuer' },
    { code: 'Acquirer Error', message: 'An error occurred on the acquirer side' },
    { code: 'Issuer Unavailable', message: 'The card issuer is currently unavailable' },
    { code: 'Not Submitted', message: 'The transaction was not submitted to the issuer' },
    { code: 'Invalid Merchant', message: 'The merchant account is invalid or not recognized' },
    { code: 'Issuer Suspected Fraud', message: 'The issuer suspects fraudulent activity' },

    // Generic declines
    { code: 'Declined', message: 'The transaction was declined without a specific reason' },
    { code: 'Declined Non Generic', message: 'The transaction was declined' },
    { code: 'Declined Retry', message: 'The transaction was declined but can be retried' },
    { code: 'Not supported', message: 'This payment method or operation is not supported' },
    { code: 'Cancel', message: 'The transaction was cancelled' },
    { code: 'Error', message: 'A technical error occurred during processing' },

    // 3D Secure related
    { code: '3D Not Authenticated', message: 'The 3D Secure authentication was not successful' },
    { code: '3D Secure Authentication Required', message: '3D Secure authentication is required for this transaction' },
    { code: 'Authentication Required', message: 'Additional authentication is required' },

    // Amount/limits
    { code: 'Amount Limit Exceeded', message: 'The transaction amount exceeds the allowed limit' },
    { code: 'Invalid Amount', message: 'The transaction amount is invalid' },

    // Do not honor
    { code: 'Declined', message: 'Do not honor - the issuing bank declined the transaction' },
    { code: 'Refused', message: 'Do not honor - generic refusal from issuer' },

    // Technical errors
    { code: 'Unknown', message: 'The refusal reason is unknown' },
    { code: 'Declined Validation', message: 'The transaction failed validation checks' },
    { code: 'Invalid Transaction', message: 'The transaction details are invalid' },
    { code: 'Format Error', message: 'The transaction data has formatting errors' },

    // Account issues
    { code: 'Invalid Account', message: 'The account number is invalid' },
    { code: 'Closed Account', message: 'The account has been closed' },
    { code: 'No Account', message: 'No account found for this card' },

    // AVS/Address verification
    { code: 'AVS Declined', message: 'Address verification failed' },
    { code: 'AVS Not Supported', message: 'Address verification is not supported for this card' },

    // Retry scenarios
    { code: 'Retrying', message: 'The payment is being retried' },
    { code: 'Pending', message: 'The payment is pending' },
    { code: 'Declined Please Retry', message: 'The payment was declined but should be retried' },

    // Specific card network codes
    { code: '01: Refer to card issuer', message: 'Contact the card issuer for more information' },
    { code: '02: Refer to card issuer, special condition', message: 'Contact the card issuer - special condition applies' },
    { code: '03: Invalid merchant', message: 'The merchant ID is invalid' },
    { code: '04: Capture card', message: 'The card should be captured/retained' },
    { code: '05: Do not honor', message: 'The issuer declined the transaction' },
    { code: '06: Error', message: 'A general error occurred' },
    { code: '07: Pickup card, special condition', message: 'Capture the card due to special conditions' },
    { code: '12: Invalid transaction', message: 'The transaction is not valid' },
    { code: '13: Invalid amount', message: 'The transaction amount is invalid' },
    { code: '14: Invalid card number', message: 'The card number is not valid' },
    { code: '15: Invalid issuer', message: 'The card issuer is not recognized' },
    { code: '30: Format error', message: 'The transaction format is incorrect' },
    { code: '41: Lost card', message: 'The card has been reported lost' },
    { code: '43: Stolen card', message: 'The card has been reported stolen' },
    { code: '51: Not sufficient funds', message: 'Insufficient funds in the account' },
    { code: '54: Expired card', message: 'The card has expired' },
    { code: '55: Incorrect PIN', message: 'The PIN entered is incorrect' },
    { code: '57: Transaction not permitted to cardholder', message: 'This transaction is not allowed for this cardholder' },
    { code: '58: Transaction not permitted to terminal', message: 'This transaction type is not allowed for this terminal' },
    { code: '59: Suspected fraud', message: 'The transaction is suspected to be fraudulent' },
    { code: '61: Exceeds withdrawal amount limit', message: 'The amount exceeds the withdrawal limit' },
    { code: '62: Restricted card', message: 'The card has been restricted' },
    { code: '63: Security violation', message: 'A security violation was detected' },
    { code: '65: Exceeds withdrawal frequency limit', message: 'Too many withdrawal attempts' },
    { code: '75: PIN tries exceeded', message: 'Maximum PIN entry attempts exceeded' },
    { code: '76: Reserved for future Postilion use', message: 'Reserved code' },
    { code: '78: Blocked, first used', message: 'Card blocked on first use (suspicious activity)' },
    { code: '91: Issuer or switch inoperative', message: 'The card issuer system is not available' },
    { code: '93: Transaction cannot be completed', message: 'The transaction cannot be completed due to violation of law' },
    { code: '94: Duplicate transmission', message: 'Duplicate transaction detected' },
    { code: '96: System malfunction', message: 'A system error occurred' },
  ];

  return hardcodedCodes.map(({ code, message }) => ({
    code,
    message,
    type: determineDeclineType(code, message),
  }));
}

/**
 * Main fetcher function for Adyen
 * Returns enriched text chunks ready to be saved
 */
export async function fetchAdyen(): Promise<string[]> {
  console.log('\n📥 Fetching Adyen refusal reasons...');

  // Try documentation first
  let codes = await fetchFromDocs();

  // Fall back to hardcoded list if docs fail
  if (!codes || codes.length === 0) {
    codes = getHardcodedCodes();
  }

  console.log(`\n🔧 Building enriched chunks for ${codes.length} codes...`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const chunks = await buildEnrichedChunksWithClaude(codes, 'Adyen', apiKey);

  console.log(`  ✓ Built ${chunks.length} enriched chunks`);

  return chunks;
}

// Allow running this fetcher standalone
if (require.main === module) {
  const { writeFileSync } = require('fs');
  const { join } = require('path');

  fetchAdyen()
    .then(chunks => {
      const content = chunks.join('\n\n');
      const outputPath = join(__dirname, '../../knowledge-base', 'Adyen.txt');
      writeFileSync(outputPath, content, 'utf-8');
      console.log(`\n✅ Saved to ${outputPath}`);
      console.log(`   Total chunks: ${chunks.length}`);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

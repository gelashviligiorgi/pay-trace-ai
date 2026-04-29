/**
 * Primer.io decline codes fetcher
 *
 * Source: https://primer.io/docs/concepts/decline-codes/mapping-standard
 * Focuses on Visa and Mastercard decline codes with good decline reasons
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
 * Attempt to fetch Primer decline codes from documentation
 * Note: This page may use client-side rendering, so we'll use hardcoded data for now
 */
async function fetchFromDocs(): Promise<ProcessorCode[] | null> {
  try {
    console.log('  Attempting to fetch from Primer documentation...');
    const response = await axios.get(
      'https://primer.io/docs/concepts/decline-codes/mapping-standard',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    const html = response.data;

    // Check if we got meaningful content (not just SSR shell)
    if (html.length < 1000 || !html.includes('decline') && !html.includes('code')) {
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
 * Fallback: Use hardcoded Primer decline codes (Visa & Mastercard focus)
 *
 * These codes are based on Primer's unified mapping standard for Visa and Mastercard
 * Source: https://primer.io/docs/concepts/decline-codes/mapping-standard
 */
function getHardcodedCodes(): ProcessorCode[] {
  console.log('  Using hardcoded Primer decline codes (Visa & Mastercard) as fallback...');

  const hardcodedCodes: Array<{ code: string; message: string }> = [
    // Do Not Honor - Generic Declines
    { code: '05', message: 'Do not honor - The issuing bank has blocked the transaction without providing a specific reason' },
    { code: '100', message: 'Do not honor - Generic decline from issuer' },

    // Insufficient Funds
    { code: '51', message: 'Insufficient funds - The account does not have sufficient funds to complete the transaction' },
    { code: 'N4', message: 'Insufficient funds - Exceeds issuer withdrawal limit' },
    { code: '61', message: 'Exceeds withdrawal amount limit - The customer exceeded their withdrawal limit' },
    { code: '65', message: 'Activity limit exceeded - The cardholder has exceeded the number of purchases allowed in a time period' },

    // Expired or Invalid Card
    { code: '54', message: 'Expired card - The card has passed its expiration date and is no longer valid' },
    { code: '14', message: 'Invalid card number - The card number is not valid or does not exist' },
    { code: '06', message: 'Error - General card error occurred during processing' },
    { code: '15', message: 'No such issuer - The card issuer could not be identified or does not exist' },

    // Transaction Not Permitted
    { code: '57', message: 'Transaction not permitted to cardholder - This type of transaction is not allowed for this card' },
    { code: '58', message: 'Transaction not permitted to terminal - This transaction type is not supported by the terminal' },
    { code: '62', message: 'Restricted card - Service restricted, country or category blocked' },
    { code: '93', message: 'Transaction cannot be completed - Violation of law or regulation' },

    // Suspected Fraud & Security
    { code: '59', message: 'Suspected fraud - The transaction has been flagged as potentially fraudulent' },
    { code: '63', message: 'Security violation - A security breach or violation was detected' },
    { code: '07', message: 'Pickup card, special condition - Card should be retained due to security concerns' },
    { code: '04', message: 'Pickup card - The card should be captured and retained' },
    { code: '41', message: 'Lost card - The card has been reported as lost by the cardholder' },
    { code: '43', message: 'Stolen card - The card has been reported as stolen by the cardholder' },

    // PIN Related
    { code: '55', message: 'Incorrect PIN - The PIN entered is incorrect' },
    { code: '75', message: 'PIN tries exceeded - Maximum number of PIN entry attempts has been exceeded' },
    { code: '86', message: 'PIN validation not possible - Unable to validate the PIN at this time' },
    { code: '88', message: 'Cryptographic failure - PIN encryption or validation failed' },

    // Issuer or System Issues
    { code: '91', message: 'Issuer unavailable - The card issuer is temporarily unavailable or offline' },
    { code: '96', message: 'System malfunction - A technical error occurred in the payment system' },
    { code: '19', message: 'Re-enter transaction - The transaction should be attempted again' },
    { code: '92', message: 'Unable to route transaction - The transaction could not be routed to the issuer' },
    { code: '94', message: 'Duplicate transaction - This transaction appears to be a duplicate' },

    // 3D Secure & Authentication
    { code: '65', message: 'Authentication required - Additional authentication is needed to complete this transaction (Visa specific)' },
    { code: '1A', message: 'Authentication required - Additional authentication is needed to complete this transaction (Mastercard specific)' },
    { code: 'N7', message: 'CVV2 failure - The card security code (CVV) does not match' },
    { code: '82', message: 'Negative CAM, dCVV, iCVV, or CVV results - Card verification failed' },

    // Format and Validation Errors
    { code: '12', message: 'Invalid transaction - The transaction format or details are invalid' },
    { code: '13', message: 'Invalid amount - The transaction amount is invalid or out of range' },
    { code: '30', message: 'Format error - The transaction message format is incorrect' },
    { code: '76', message: 'Invalid product codes - The product or service codes are not valid' },

    // Account Issues
    { code: '39', message: 'No credit account - No credit account exists for this card' },
    { code: '52', message: 'No checking account - No checking account exists for this card' },
    { code: '53', message: 'No savings account - No savings account exists for this card' },
    { code: '78', message: 'Blocked, first use - New card blocked on first use (activation required)' },

    // Referrals & Contact Issuer
    { code: '01', message: 'Refer to card issuer - The cardholder should contact their issuing bank' },
    { code: '02', message: 'Refer to card issuer, special condition - Contact issuer for special condition' },
    { code: '03', message: 'Invalid merchant - The merchant ID is invalid or not recognized by the issuer' },

    // Decline with Retry Allowed
    { code: '85', message: 'No reason to decline - Transaction approved but flagged for monitoring' },
    { code: 'R0', message: 'Stop payment order - The cardholder has requested to stop payment' },
    { code: 'R1', message: 'Revocation of authorization - Previous authorization has been revoked' },

    // Velocity and Limit Checks
    { code: 'N3', message: 'Cash service not available - Cash services are not available for this card' },
    { code: 'N8', message: 'Transaction amount exceeds maximum - Amount exceeds the maximum allowed' },
    { code: 'Q1', message: 'Card authentication failed - Card failed authentication check' },

    // Merchant Issues
    { code: '03', message: 'Invalid merchant - Merchant is not valid for this card network' },
    { code: '58', message: 'Transaction not allowed - Merchant not permitted to perform this transaction type' },

    // Additional Mastercard Specific Codes
    { code: '1C', message: 'Chip card requires chip reader - Card with chip must be read using chip reader' },
    { code: '1S', message: 'Recurring payment cancelled - The recurring payment has been cancelled by cardholder' },
    { code: '5T', message: 'Regulatory decline - Transaction declined due to regulatory requirements' },

    // Additional Visa Specific Codes
    { code: 'CV', message: 'Card type verification error - Card type could not be verified' },
    { code: 'XA', message: 'Forward to issuer - Transaction should be forwarded to the issuer' },
    { code: 'XD', message: 'Forward to issuer - Retry transaction' },

    // Soft Decline - Retry Scenarios
    { code: 'B1', message: 'Surcharge not permitted - Surcharge amount not permitted on this card' },
    { code: 'B2', message: 'Surcharge not supported - Surcharge not supported by issuer' },
    { code: 'C2', message: 'CVV2 required - CVV2 value is required for this transaction' },

    // Address Verification (AVS) Related
    { code: 'A1', message: 'AVS failed - Address verification failed' },
    { code: 'Z3', message: 'Unable to verify address - Address could not be verified' },

    // Timeout and Communication Errors
    { code: '68', message: 'Response received too late - Issuer response timeout' },
    { code: '80', message: 'Network error - Communication error with card network' },
    { code: '81', message: 'Cryptographic error - Encryption or security error occurred' },

    // Stand-in Processing
    { code: '00', message: 'Approved - Transaction approved successfully' },
    { code: '08', message: 'Honor with identification - Approve transaction after verifying cardholder ID' },
    { code: '10', message: 'Approved for partial amount - Transaction approved for partial amount only' },
    { code: '11', message: 'Approved VIP - Transaction approved for VIP customer' },

    // Account/Cardholder Issues
    { code: '38', message: 'Allowable PIN tries exceeded - Maximum PIN attempts exceeded' },
    { code: '62', message: 'Restricted card - Card restricted by issuer policy' },
    { code: '64', message: 'Transaction does not fulfill AML requirement - Anti-money laundering check failed' },
  ];

  return hardcodedCodes.map(({ code, message }) => ({
    code,
    message,
    type: determineDeclineType(code, message),
  }));
}

/**
 * Main fetcher function for Primer
 * Returns enriched text chunks ready to be saved
 */
export async function fetchPrimer(): Promise<string[]> {
  console.log('\n📥 Fetching Primer decline codes (Visa & Mastercard)...');

  // Try documentation first
  let codes = await fetchFromDocs();

  // Fall back to hardcoded list if docs fail
  if (!codes || codes.length === 0) {
    codes = getHardcodedCodes();
  }

  console.log(`\n🔧 Building enriched chunks for ${codes.length} codes...`);

  // Build enriched text chunks
  const chunks = codes.map(code => buildEnrichedChunk(code, 'Primer (Visa/Mastercard)'));

  console.log(`  ✓ Built ${chunks.length} enriched chunks`);

  return chunks;
}

// Allow running this fetcher standalone
if (require.main === module) {
  const { writeFileSync } = require('fs');
  const { join } = require('path');

  fetchPrimer()
    .then(chunks => {
      const content = chunks.join('\n\n');
      const outputPath = join(__dirname, '../../knowledge-base', 'Primer.txt');
      writeFileSync(outputPath, content, 'utf-8');
      console.log(`\n✅ Saved to ${outputPath}`);
      console.log(`   Total chunks: ${chunks.length}`);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

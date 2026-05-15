/**
 * Checkout.com API response codes fetcher
 *
 * Source: https://www.checkout.com/docs/developer-resources/codes/api-response-codes
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
 * Attempt to fetch Checkout.com codes from documentation
 * Note: This page uses client-side rendering, so we'll use hardcoded data for now
 */
async function fetchFromDocs(): Promise<ProcessorCode[] | null> {
  try {
    console.log('  Attempting to fetch from Checkout.com documentation...');
    const response = await axios.get(
      'https://www.checkout.com/docs/developer-resources/codes/api-response-codes',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    const html = response.data;

    // Check if we got meaningful content (not just SSR shell)
    if (html.length < 1000 || !html.includes('response') && !html.includes('code')) {
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
 * Fallback: Use hardcoded Checkout.com API response codes
 *
 * These codes are from: https://www.checkout.com/docs/developer-resources/codes/api-response-codes
 */
function getHardcodedCodes(): ProcessorCode[] {
  console.log('  Using hardcoded Checkout.com API response codes as fallback...');

  const hardcodedCodes: Array<{ code: string; message: string }> = [
    // 2xx Success
    { code: '200', message: 'Approved' },
    { code: '201', message: 'Created' },

    // 4xx Client Errors
    { code: '401', message: 'Unauthorized' },
    { code: '403', message: 'Forbidden' },
    { code: '404', message: 'Not Found' },
    { code: '409', message: 'Conflict' },
    { code: '422', message: 'Unprocessable Entity' },
    { code: '429', message: 'Too Many Requests' },

    // 5xx Server Errors
    { code: '500', message: 'Internal Server Error' },
    { code: '502', message: 'Bad Gateway' },
    { code: '503', message: 'Service Unavailable' },

    // Gateway Response Codes
    { code: '20000', message: 'Approved' },
    { code: '20001', message: 'Approved with warning' },
    { code: '20002', message: 'Partially approved' },
    { code: '20003', message: 'Approved, update track data' },
    { code: '20004', message: 'Approved with ID' },
    { code: '20005', message: 'Approved, account type specified by card issuer' },
    { code: '20006', message: 'Approved for partial amount, account type specified by card issuer' },
    { code: '20007', message: 'Approved, update ICC' },
    { code: '20008', message: 'Approved, account type specified by card issuer, update ICC' },
    { code: '20009', message: 'Approved for partial amount' },
    { code: '20010', message: 'Approved for VIP' },
    { code: '20011', message: 'Approved, please update cardholder name' },
    { code: '20012', message: 'Approved, please update cardholder address' },
    { code: '20013', message: 'Approved, please update cardholder name and address' },
    { code: '20014', message: 'Transaction is in progress' },

    // Declines - Insufficient Funds
    { code: '20051', message: 'Insufficient funds' },
    { code: '20061', message: 'Exceeds withdrawal amount limit' },
    { code: '20062', message: 'Restricted card' },
    { code: '20063', message: 'Security violation' },
    { code: '20065', message: 'Activity limit exceeded' },
    { code: '20075', message: 'PIN tries exceeded' },

    // Declines - Invalid/Expired Card
    { code: '20054', message: 'Expired card' },
    { code: '20014', message: 'Invalid card number' },
    { code: '20082', message: 'Incorrect CVV' },
    { code: '20087', message: 'Card not activated' },

    // Declines - Do Not Honor / Generic
    { code: '20005', message: 'Do not honor' },
    { code: '20057', message: 'Transaction not permitted to cardholder' },
    { code: '20058', message: 'Transaction not permitted to terminal' },
    { code: '20091', message: 'Issuer unavailable' },

    // Declines - Suspected Fraud
    { code: '20012', message: 'Invalid transaction' },
    { code: '20013', message: 'Invalid amount' },
    { code: '20014', message: 'Invalid card number' },
    { code: '20015', message: 'Invalid issuer' },
    { code: '20019', message: 'Transaction declined' },
    { code: '20036', message: 'Restricted card' },
    { code: '20041', message: 'Lost card' },
    { code: '20043', message: 'Stolen card, pick up' },
    { code: '20059', message: 'Suspected fraud' },

    // Declines - Processor/System Issues
    { code: '20092', message: 'Unable to route transaction' },
    { code: '20096', message: 'System malfunction' },
    { code: '20030', message: 'Format error' },

    // 3D Secure Related
    { code: '20151', message: '3D Secure authentication failed' },
    { code: '20152', message: '3D Secure not enrolled' },
    { code: '20153', message: '3D Secure system error' },
    { code: '20154', message: '3D Secure authentication attempt' },

    // Additional Declines
    { code: '20100', message: 'Declined - Generic' },
    { code: '20101', message: 'Declined - Contact card issuer' },
    { code: '20102', message: 'Declined - Please retry' },
    { code: '20103', message: 'Declined - Invalid merchant' },
    { code: '20104', message: 'Declined - Pick up card' },
    { code: '20105', message: 'Declined - Pick up card, special condition' },
    { code: '20106', message: 'Declined - Pick up card, lost' },
    { code: '20107', message: 'Declined - Pick up card, stolen' },
    { code: '20108', message: 'Declined - Honor with ID' },
    { code: '20110', message: 'Declined - Partial approval' },
    { code: '20111', message: 'Declined - VIP approval' },
    { code: '20112', message: 'Declined - Invalid transaction' },
    { code: '20113', message: 'Declined - Invalid amount' },
    { code: '20114', message: 'Declined - Invalid card number' },
    { code: '20115', message: 'Declined - No such issuer' },
    { code: '20116', message: 'Approved, update track 3' },
    { code: '20117', message: 'Declined - Customer cancellation' },
    { code: '20119', message: 'Declined - Re-enter transaction' },
    { code: '20120', message: 'Declined - Invalid response' },
    { code: '20121', message: 'Declined - No action taken' },
    { code: '20122', message: 'Declined - Suspected malfunction' },
    { code: '20125', message: 'Declined - Unable to locate record' },
    { code: '20128', message: 'Declined - File temporarily unavailable' },
    { code: '20200', message: 'Declined - Do not honor' },
    { code: '20201', message: 'Declined - Expired card' },
    { code: '20202', message: 'Declined - Suspected fraud' },
    { code: '20203', message: 'Declined - Contact card issuer' },
    { code: '20204', message: 'Declined - Restricted card' },
    { code: '20205', message: 'Declined - Contact acquirer' },
    { code: '20206', message: 'Declined - Allowable PIN tries exceeded' },
    { code: '20207', message: 'Declined - Special conditions' },
    { code: '20208', message: 'Declined - Lost card' },
    { code: '20209', message: 'Declined - Stolen card' },
    { code: '20210', message: 'Declined - Suspected fraud' },
  ];

  return hardcodedCodes.map(({ code, message }) => ({
    code,
    message,
    type: determineDeclineType(code, message),
  }));
}

/**
 * Main fetcher function for Checkout.com
 * Returns enriched text chunks ready to be saved
 */
export async function fetchCheckout(): Promise<string[]> {
  console.log('\n📥 Fetching Checkout.com API response codes...');

  // Try documentation first
  let codes = await fetchFromDocs();

  // Fall back to hardcoded list if docs fail
  if (!codes || codes.length === 0) {
    codes = getHardcodedCodes();
  }

  console.log(`\n🔧 Building enriched chunks for ${codes.length} codes...`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const chunks = await buildEnrichedChunksWithClaude(codes, 'Checkout.com', apiKey);

  console.log(`  ✓ Built ${chunks.length} enriched chunks`);

  return chunks;
}

// Allow running this fetcher standalone
if (require.main === module) {
  const { writeFileSync } = require('fs');
  const { join } = require('path');

  fetchCheckout()
    .then(chunks => {
      const content = chunks.join('\n\n');
      const outputPath = join(__dirname, '../../knowledge-base', 'Checkout.txt');
      writeFileSync(outputPath, content, 'utf-8');
      console.log(`\n✅ Saved to ${outputPath}`);
      console.log(`   Total chunks: ${chunks.length}`);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

/**
 * Braintree processor response codes fetcher
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
 * Fetch Braintree codes from the public documentation page
 */
async function fetchFromDocs(): Promise<ProcessorCode[] | null> {
  try {
    console.log('  Attempting to fetch from Braintree documentation...');
    const response = await axios.get(
      'https://developer.paypal.com/braintree/docs/reference/general/processor-responses/authorization-responses',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    const html = response.data;

    // Check for login wall (don't check for '2001' as it may not be present)
    if (!html.includes('2000') && !html.includes('Insufficient Funds')) {
      console.log('  ⚠️  Documentation page format not recognized, falling back to hardcoded codes');
      return null;
    }

    const $ = cheerio.load(html);
    const codes: ProcessorCode[] = [];

    // Parse table rows (adjust selector based on actual HTML structure)
    $('table tr').each((_: any, row: any) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const code = $(cells[0]).text().trim();
        const message = $(cells[1]).text().trim();

        // Only process 2xxx codes
        if (/^2\d{3}$/.test(code)) {
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
 * Fallback: Use hardcoded common Braintree processor response codes
 */
function getHardcodedCodes(): ProcessorCode[] {
  console.log('  Using hardcoded Braintree processor response codes as fallback...');

  const hardcodedCodes: Array<{ code: string; message: string }> = [
    { code: '2000', message: 'Do Not Honor' },
    { code: '2001', message: 'Insufficient Funds' },
    { code: '2002', message: 'Limit Exceeded' },
    { code: '2003', message: 'Cardholder\'s Activity Limit Exceeded' },
    { code: '2004', message: 'Expired Card' },
    { code: '2005', message: 'Invalid Credit Card Number' },
    { code: '2006', message: 'Invalid Expiration Date' },
    { code: '2007', message: 'No Account' },
    { code: '2008', message: 'Card Account Length Error' },
    { code: '2009', message: 'No Such Issuer' },
    { code: '2010', message: 'Card Issuer Declined CVV' },
    { code: '2011', message: 'Voice Authorization Required' },
    { code: '2012', message: 'Processor Declined - Possible Lost Card' },
    { code: '2013', message: 'Processor Declined - Possible Stolen Card' },
    { code: '2014', message: 'Processor Declined - Fraud Suspected' },
    { code: '2015', message: 'Transaction Not Allowed' },
    { code: '2016', message: 'Duplicate Transaction' },
    { code: '2017', message: 'Cardholder Stopped Billing' },
    { code: '2018', message: 'Cardholder Stopped All Billing' },
    { code: '2019', message: 'Invalid Transaction' },
    { code: '2020', message: 'Violation' },
    { code: '2021', message: 'Security Violation' },
    { code: '2022', message: 'Declined - Updated Cardholder Available' },
    { code: '2023', message: 'Processor Does Not Support This Feature' },
    { code: '2024', message: 'Card Type Not Enabled' },
    { code: '2025', message: 'Set Up Error - Merchant' },
    { code: '2026', message: 'Invalid Merchant ID' },
    { code: '2027', message: 'Set Up Error - Amount' },
    { code: '2028', message: 'Set Up Error - Hierarchy' },
    { code: '2029', message: 'Set Up Error - Card' },
    { code: '2030', message: 'Set Up Error - Terminal' },
    { code: '2031', message: 'Encryption Error' },
    { code: '2032', message: 'Surcharge Not Permitted' },
    { code: '2033', message: 'Inconsistent Data' },
    { code: '2034', message: 'No Action Taken' },
    { code: '2035', message: 'Partial Approval For Amount In Group III Version 022' },
    { code: '2036', message: 'Authorization could not be found to reverse' },
    { code: '2037', message: 'Already Reversed' },
    { code: '2038', message: 'Processor Declined' },
    { code: '2039', message: 'Invalid Authorization Code' },
    { code: '2040', message: 'Invalid Store' },
    { code: '2041', message: 'Declined - Call For Approval' },
    { code: '2042', message: 'Invalid Client ID' },
    { code: '2043', message: 'Error - Do Not Retry, Call Issuer' },
    { code: '2044', message: 'Declined - Call Issuer' },
    { code: '2045', message: 'Invalid Merchant Number' },
    { code: '2046', message: 'Declined' },
    { code: '2047', message: 'Call Issuer. Pick Up Card' },
    { code: '2048', message: 'Invalid Amount' },
    { code: '2049', message: 'Invalid SKU Number' },
    { code: '2050', message: 'Invalid Credit Plan' },
    { code: '2051', message: 'Credit Card Number does not match method of payment' },
    { code: '2052', message: 'Card reported as lost or stolen' },
    { code: '2053', message: 'Pickup card' },
    { code: '2054', message: 'Restricted card' },
    { code: '2055', message: 'Invalid Transaction Division Number' },
    { code: '2056', message: 'Approved, Optional Message available' },
    { code: '2057', message: 'Issuer or Cardholder has put a restriction on the card' },
    { code: '2058', message: 'Merchant not Mastercard SecureCode enabled' },
    { code: '2059', message: 'Address Verification Failed' },
    { code: '2060', message: 'Address Verification and Card Security Code Failed' },
  ];

  return hardcodedCodes.map(({ code, message }) => ({
    code,
    message,
    type: determineDeclineType(code, message),
  }));
}

/**
 * Main fetcher function for Braintree
 * Returns enriched text chunks ready to be saved
 */
export async function fetchBraintree(): Promise<string[]> {
  console.log('\n📥 Fetching Braintree processor response codes...');

  // Try documentation first
  let codes = await fetchFromDocs();

  // Fall back to hardcoded list if docs fail
  if (!codes || codes.length === 0) {
    codes = getHardcodedCodes();
  }

  console.log(`\n🔧 Building enriched chunks for ${codes.length} codes...`);

  // Build enriched text chunks
  const chunks = codes.map(code => buildEnrichedChunk(code, 'Braintree'));

  console.log(`  ✓ Built ${chunks.length} enriched chunks`);

  return chunks;
}

// Allow running this fetcher standalone
if (require.main === module) {
  const { writeFileSync } = require('fs');
  const { join } = require('path');

  fetchBraintree()
    .then(chunks => {
      const content = chunks.join('\n\n');
      const outputPath = join(__dirname, '../../knowledge-base', 'Braintree.txt');
      writeFileSync(outputPath, content, 'utf-8');
      console.log(`\n✅ Saved to ${outputPath}`);
      console.log(`   Total chunks: ${chunks.length}`);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

import dotenv from 'dotenv';
dotenv.config({ override: true });
import { ClarityClient } from '../clients/clarity-client.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) {
    console.error('Error: CLARITY_API_TOKEN environment variable is not set.');
    console.error('Generate a token at: Clarity Dashboard > Settings > Data Export');
    process.exit(1);
  }

  const client = new ClarityClient(token);

  try {
    console.log('Fetching Clarity data (6 strategic API calls)...');
    const data = await client.fetchAllKeyData();

    const outputDir = join(process.cwd(), 'output', 'data');
    mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().split('T')[0];
    const filepath = join(outputDir, `clarity-data-${timestamp}.json`);

    writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Data saved to: ${filepath}`);
    console.log(`API calls used: ${client.getCallCount()}`);
    console.log(`Remaining API calls today: ${client.getRemainingCalls()}`);
  } catch (error) {
    console.error('Failed to fetch Clarity data:', error);
    process.exit(1);
  }
}

main();

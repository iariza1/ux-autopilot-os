import dotenv from 'dotenv';
dotenv.config({ override: true });
import { runPipeline } from './pipeline.js';

async function main(): Promise<void> {
  console.log('=== UX AutoPilot Pipeline ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Target repo: ${process.env.TARGET_REPO || 'iariza1/toma-app-web-2'}`);
  console.log('');

  // Validate required environment variables
  const required = ['ANTHROPIC_API_KEY', 'CLARITY_API_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }

  try {
    const result = await runPipeline();
    console.log('\nPipeline output:');
    console.log(result);
    console.log(`\nCompleted: ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error) {
    console.error('\nPipeline failed with error:');
    console.error(error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

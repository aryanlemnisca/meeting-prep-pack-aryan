// src/scheduler/index.ts
import 'dotenv/config';
import cron from 'node-cron';
import { runMorningScan } from './morning-scan';
import { runPrepTrigger } from './prep-trigger';

const morningHour = process.env.MORNING_SCAN_HOUR ?? '7';

console.log('[Scheduler] Starting...');

// Job 1: Morning scan — daily at configured hour
cron.schedule(`0 ${morningHour} * * *`, async () => {
  try {
    await runMorningScan();
  } catch (error) {
    console.error('[Scheduler] Morning scan failed:', error);
  }
});
console.log(`[Scheduler] Morning scan scheduled for ${morningHour}:00 AM daily`);

// Job 2: Prep trigger — every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await runPrepTrigger();
  } catch (error) {
    console.error('[Scheduler] Prep trigger failed:', error);
  }
});
console.log('[Scheduler] Prep trigger scheduled every 5 minutes');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('[Scheduler] Shutting down...');
  process.exit(0);
});

import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { runDailyReminderDigest } from '../services/reminder-digest.service.js';

let started = false;

export function startReminderDigestCron(): void {
  if (started) return;
  started = true;

  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        await runDailyReminderDigest();
        logger.info('Reminder digest cron: completed');
      } catch (err) {
        logger.error('Reminder digest cron failed', err);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  logger.info('Reminder digest cron scheduled (daily 08:00 Asia/Kolkata)');
}

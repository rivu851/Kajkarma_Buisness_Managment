import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { runScheduledReminderSync } from '../services/reminder-sync.service.js';

let started = false;

export function startReminderCron(): void {
  if (started) return;
  started = true;

  cron.schedule('*/5 * * * *', async () => {
    try {
      await runScheduledReminderSync();
      logger.info('Reminder cron: sync completed');
    } catch (err) {
      logger.error('Reminder cron failed', err);
    }
  });

  logger.info('Reminder cron scheduled (every 5 minutes)');
}

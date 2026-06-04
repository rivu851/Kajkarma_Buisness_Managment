import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { seedSystemRoles } from './utils/seedRoles.js';
import { seedSuperAdmin } from './utils/seedSuperAdmin.js';
import { startReminderCron } from './cron/reminder.cron.js';
import { startReminderDigestCron } from './cron/reminder-digest.cron.js';
import { runScheduledReminderSync } from './services/reminder-sync.service.js';

async function bootstrap(): Promise<void> {
  await connectDB();
  await seedSystemRoles();
  await seedSuperAdmin();

  try {
    await runScheduledReminderSync();
  } catch (err) {
    logger.warn('Initial reminder sync skipped or failed', err);
  }
  startReminderCron();
  startReminderDigestCron();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

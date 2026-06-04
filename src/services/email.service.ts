import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function sendPlainEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    logger.warn('Daily digest email skipped: SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM_EMAIL,
    to,
    subject,
    text,
  });
  return true;
}

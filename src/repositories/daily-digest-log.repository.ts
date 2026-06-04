import type { Types } from 'mongoose';
import { DailyDigestLog } from '../models/daily-digest-log.model.js';

export async function digestAlreadySent(
  userId: Types.ObjectId,
  digestDate: string
): Promise<boolean> {
  const existing = await DailyDigestLog.findOne({ user_id: userId, digest_date: digestDate }).lean();
  return Boolean(existing);
}

export async function recordDigestSent(
  userId: Types.ObjectId,
  digestDate: string
): Promise<void> {
  await DailyDigestLog.create({
    user_id: userId,
    digest_date: digestDate,
    sent_at: new Date(),
  });
}

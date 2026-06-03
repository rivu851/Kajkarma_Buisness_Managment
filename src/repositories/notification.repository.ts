import { Notification } from '../models/notification.model.js';
import type { INotification } from '../types/reminder.js';
import type { Types } from 'mongoose';

export async function createNotification(
  data: Pick<INotification, 'user_id' | 'title' | 'body' | 'channel' | 'reminder_id' | 'type'>
): Promise<INotification> {
  const doc = await Notification.create(data);
  return doc.toObject() as INotification;
}

export async function markNotificationsReadByReminder(
  reminderId: string | Types.ObjectId,
  userId: string | Types.ObjectId
): Promise<void> {
  await Notification.updateMany(
    { reminder_id: reminderId, user_id: userId },
    { $set: { is_read: true } }
  );
}

export async function countUnreadNotifications(userId: string | Types.ObjectId): Promise<number> {
  return Notification.countDocuments({ user_id: userId, is_read: false });
}

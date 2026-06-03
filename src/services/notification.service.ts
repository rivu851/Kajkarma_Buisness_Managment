import type { Types } from 'mongoose';
import { createNotification, markNotificationsReadByReminder } from '../repositories/notification.repository.js';
import type { NotificationChannel } from '../constants/enums.js';

export interface SendNotificationInput {
  userId: Types.ObjectId;
  title: string;
  body: string;
  channel?: NotificationChannel;
  reminderId?: Types.ObjectId;
  type?: string;
}

/**
 * Delivery abstraction — currently in-app only.
 * Email / WhatsApp / push can be wired here without touching reminder logic.
 */
export async function send(input: SendNotificationInput): Promise<void> {
  const channel = input.channel ?? 'in_app';

  if (channel === 'in_app') {
    await createNotification({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      channel: 'in_app',
      ...(input.reminderId ? { reminder_id: input.reminderId } : {}),
      ...(input.type ? { type: input.type } : {}),
    });
    return;
  }

  // Future channels: queue jobs, no-op in v1
}

export async function syncReadStateForReminder(
  reminderId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<void> {
  await markNotificationsReadByReminder(reminderId, userId);
}

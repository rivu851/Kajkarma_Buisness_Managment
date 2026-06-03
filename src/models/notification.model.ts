import { Schema, model } from 'mongoose';
import { NOTIFICATION_CHANNELS } from '../constants/enums.js';
import type { INotification } from '../types/reminder.js';

const notificationSchema = new Schema<INotification>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reminder_id: { type: Schema.Types.ObjectId, ref: 'Reminder' },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, default: 'in_app' },
    type: { type: String },
    is_read: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);

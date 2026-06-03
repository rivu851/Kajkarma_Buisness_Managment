import { Schema, model } from 'mongoose';
import {
  REMINDER_TYPES,
  REMINDER_STATUSES,
  REMINDER_PRIORITIES,
  REMINDER_MODULES,
} from '../constants/enums.js';
import type { IReminder, IReminderAuditEntry } from '../types/reminder.js';

const auditSchema = new Schema<IReminderAuditEntry>(
  {
    action: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    old_value: { type: Schema.Types.Mixed },
    new_value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const reminderSchema = new Schema<IReminder>(
  {
    type: { type: String, enum: REMINDER_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priority: { type: String, enum: REMINDER_PRIORITIES, default: 'medium' },
    related_module: { type: String, enum: REMINDER_MODULES, required: true },
    related_record_id: { type: Schema.Types.ObjectId },
    assigned_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reminder_date: { type: Date, required: true, index: true },
    reminder_time: { type: String },
    status: { type: String, enum: REMINDER_STATUSES, default: 'pending', index: true },
    is_read: { type: Boolean, default: false, index: true },
    snoozed_until: { type: Date },
    completed_at: { type: Date },
    completed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    dedup_key: { type: String },
    audit_history: { type: [auditSchema], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

reminderSchema.index({ type: 1 });
reminderSchema.index({ assigned_user_id: 1, status: 1 });
reminderSchema.index({ assigned_user_id: 1, reminder_date: 1 });
reminderSchema.index({ priority: 1 });
reminderSchema.index({ deleted_at: 1 });
reminderSchema.index(
  { dedup_key: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: { $exists: false },
      dedup_key: { $exists: true, $type: 'string' },
    },
  }
);

export const Reminder = model<IReminder>('Reminder', reminderSchema);

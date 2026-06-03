import { z } from 'zod';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';
import { REMINDER_PRIORITIES, REMINDER_STATUSES, REMINDER_TYPES } from '../constants/enums.js';

export const listRemindersSchema = z.object({
  query: listQuerySchema.extend({
    status: z.union([z.enum(REMINDER_STATUSES), z.string()]).optional(),
    priority: z.enum(REMINDER_PRIORITIES).optional(),
    type: z.enum(REMINDER_TYPES).optional(),
    assigned_user_id: objectIdSchema.optional(),
    is_read: z.coerce.boolean().optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    sort: z.string().optional(),
  }),
});

export const createReminderSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    priority: z.enum(REMINDER_PRIORITIES).default('medium'),
    reminder_date: z.coerce.date(),
    reminder_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    assigned_user_id: objectIdSchema,
  }),
});

export const snoozeReminderSchema = z.object({
  params: idParamSchema,
  body: z.object({
    snoozed_until: z.coerce.date(),
  }),
});

export const rescheduleReminderSchema = z.object({
  params: idParamSchema,
  body: z.object({
    reminder_date: z.coerce.date(),
    reminder_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
});

export const reminderIdSchema = z.object({
  params: idParamSchema,
});

import { z } from 'zod';
import { UPCOMING_PAYMENT_TYPES, UPCOMING_PAYMENT_STATUSES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listUpcomingPaymentsSchema = z.object({
  query: listQuerySchema.extend({
    client_id: objectIdSchema.optional(),
    project_id: objectIdSchema.optional(),
    payment_status: z.enum(UPCOMING_PAYMENT_STATUSES).optional(),
    payment_type: z.enum(UPCOMING_PAYMENT_TYPES).optional(),
    assigned_follow_up_user: objectIdSchema.optional(),
    due_within_days: z.coerce.number().int().positive().optional(),
  }),
});

export const createUpcomingPaymentSchema = z.object({
  body: z.object({
    client_id: objectIdSchema,
    project_id: objectIdSchema.optional(),
    revenue_id: objectIdSchema.optional(),
    amount: z.number().positive(),
    due_date: z.coerce.date(),
    payment_type: z.enum(UPCOMING_PAYMENT_TYPES),
    reminder_date: z.coerce.date().optional(),
    assigned_follow_up_user: objectIdSchema.optional(),
    notes: z.string().optional(),
  }),
});

export const updateUpcomingPaymentSchema = z.object({
  params: idParamSchema,
  body: z.object({
    amount: z.number().positive().optional(),
    due_date: z.coerce.date().optional(),
    payment_type: z.enum(UPCOMING_PAYMENT_TYPES).optional(),
    reminder_date: z.coerce.date().optional(),
    assigned_follow_up_user: objectIdSchema.optional(),
    notes: z.string().optional(),
  }),
});

export const markReceivedSchema = z.object({
  params: idParamSchema,
  body: z.object({
    notes: z.string().optional(),
  }),
});

export const cancelPaymentSchema = z.object({
  params: idParamSchema,
  body: z.object({
    notes: z.string().optional(),
  }),
});

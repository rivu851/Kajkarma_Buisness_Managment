import { z } from 'zod';
import { REVENUE_TYPES, REVENUE_STATUSES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listRevenuesSchema = z.object({
  query: listQuerySchema.extend({
    client_id: objectIdSchema.optional(),
    project_id: objectIdSchema.optional(),
    status: z.enum(REVENUE_STATUSES).optional(),
    type: z.enum(REVENUE_TYPES).optional(),
  }),
});

export const createRevenueSchema = z.object({
  body: z.object({
    client_id: objectIdSchema,
    project_id: objectIdSchema.optional(),
    title: z.string().min(1, 'Title is required'),
    amount: z.number().positive('Amount must be positive'),
    revenue_date: z.coerce.date(),
    due_date: z.coerce.date().optional(),
    type: z.enum(REVENUE_TYPES),
    notes: z.string().optional(),
  }),
});

export const updateRevenueSchema = z.object({
  params: idParamSchema,
  body: z.object({
    title: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    revenue_date: z.coerce.date().optional(),
    due_date: z.coerce.date().nullable().optional(),
    type: z.enum(REVENUE_TYPES).optional(),
    status: z.enum(REVENUE_STATUSES).optional(),
    notes: z.string().optional(),
  }),
});
